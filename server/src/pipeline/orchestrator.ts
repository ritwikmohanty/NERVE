/**
 * Pipeline orchestration — the 10-agent DAG, shared by the HTTP routes and demo seeding.
 *
 *   Agent 1 → 2 → parallel(3, 4) → 5 → 6 → 7 → 8 → 9 → 10
 */
import { nanoid } from "nanoid";
import { sseManager } from "../lib/sse.js";
import {
  runSignalScoutAgent,
  runIntentScorerAgent,
  runPersonaAnalystAgent,
  runStrategyCommanderAgent,
  runContentForgeAgent,
  runExplainerAgent,
  runDeliveryAgent,
  runResponseMonitorAgent,
  simulateNoReply,
  runLearningLoopAgent,
} from "../agents/index.js";
import { agentRunsCol, campaignsCol, leadsCol } from "../db/index.js";
import { config } from "../config.js";
import { getOrgSettings } from "../auth/index.js";
import type { EnrichedLead, IntentScore, PersonaProfile, OutreachStrategy, OutreachChannel, ResponseEvent } from "../types/index.js";

export function leadStatusForAction(action: string): string {
  switch (action) {
    case "cancel_sequence": return "do_not_contact";
    case "escalate_human": return "active"; // handed off to a human rep
    case "book_visit": return "visit_booked";
    default: return "completed";
  }
}

export async function logAgentRun(leadId: string, agentNumber: number, agentName: string, output: unknown) {
  await agentRunsCol().insertOne({
    _id: nanoid(),
    leadId,
    agentNumber,
    agentName,
    status: "complete",
    output: JSON.stringify(output),
    completedAt: new Date().toISOString(),
  });
}

/** Most recent run of an agent for a lead (Agents 9/10 run again on every reply). */
export async function latestAgentRun(leadId: string, agentNumber: number) {
  return agentRunsCol().findOne({ leadId, agentNumber }, { sort: { completedAt: -1 } });
}

export function parseRunOutput<T>(run: Record<string, unknown> | null | undefined): T | null {
  if (!run?.output) return null;
  try {
    return (typeof run.output === "string" ? JSON.parse(run.output) : run.output) as T;
  } catch {
    return null;
  }
}

async function setCampaignAgent(leadId: string, agentNumber: number) {
  await campaignsCol().updateOne({ leadId }, { $set: { currentAgent: agentNumber } });
}

export async function runFullPipeline(pipelineId: string, lead: EnrichedLead, opts: { reply?: string } = {}) {
  const started = Date.now();
  sseManager.registerLead(lead.id, lead.orgId);
  const settings = await getOrgSettings(lead.orgId);

  await campaignsCol().updateOne(
    { _id: `${pipelineId}-${lead.id}` },
    { $setOnInsert: { _id: `${pipelineId}-${lead.id}`, orgId: lead.orgId, leadId: lead.id, mode: lead.source, status: "running", currentAgent: 1, simulationMode: config.simulationMode, startedAt: new Date().toISOString() } },
    { upsert: true }
  );

  await logAgentRun(lead.id, 1, "Lead Ingestion", lead);

  await setCampaignAgent(lead.id, 2);
  const signals = await runSignalScoutAgent(lead);
  await logAgentRun(lead.id, 2, "Signal Scout", signals);

  await setCampaignAgent(lead.id, 3);
  const [intent, persona] = await Promise.all([
    runIntentScorerAgent(lead, signals, { brands: settings.brands, segments: settings.segments }),
    runPersonaAnalystAgent(lead),
  ]);
  await logAgentRun(lead.id, 3, "Intent Scorer", intent);
  await logAgentRun(lead.id, 4, "Persona Analyst", persona);

  await setCampaignAgent(lead.id, 5);
  const strategy = await runStrategyCommanderAgent(lead, signals, intent, persona, { brands: settings.brands });
  await logAgentRun(lead.id, 5, "Strategy Commander", strategy);

  await setCampaignAgent(lead.id, 6);
  const content = await runContentForgeAgent(lead, signals, intent, persona, strategy, { senderName: settings.senderName, senderTitle: settings.senderTitle });
  await logAgentRun(lead.id, 6, "Content Forge", content);

  await setCampaignAgent(lead.id, 7);
  const rationale = await runExplainerAgent(lead, signals, intent, persona, strategy, content);
  await logAgentRun(lead.id, 7, "Explainer", rationale);

  await setCampaignAgent(lead.id, 8);
  const deliveries = await runDeliveryAgent(lead, strategy, content);
  await logAgentRun(lead.id, 8, "Delivery Agent", { results: deliveries });

  await setCampaignAgent(lead.id, 9);
  // Nothing was actually sent (real firm, or sending locked), so no reply can exist: never fabricate one.
  // Replies come only from a real webhook or from "Simulate a reply" on the Learn tab.
  const awaitingRealReply = opts.reply === undefined && (lead.dataSource === "live" || config.simulationMode);
  const response = opts.reply !== undefined
    ? await runResponseMonitorAgent(lead.id, strategy.primaryChannel, opts.reply || undefined)
    : awaitingRealReply
      ? await runResponseMonitorAgent(lead.id, strategy.primaryChannel, undefined, "Awaiting a real reply. Sending is disabled on this deployment, so no response can arrive yet. Use “Simulate a reply” to test how NERVE would react.")
      : await simulateNoReply(lead.id, deliveries);
  await logAgentRun(lead.id, 9, "Response Monitor", response);

  const branchMessages: Record<string, string> = {
    escalate_human: `Positive reply from ${lead.contactName}; handed off to the ${lead.projectCity || ""} sales team`,
    book_visit: `${lead.contactName} wants to see the products. Visit booked${response.visit ? ` at ${response.visit.brandName}, ${response.visit.centreCity}` : ""}`,
    cancel_sequence: `Negative reply. ${lead.contactName} marked do-not-contact`,
    nurture: `No reply yet from ${lead.contactName}. Continuing the stage-timed cadence`,
    continue_cadence: `Neutral reply. Continuing the ${strategy.cadence.length}-touch cadence`,
  };
  sseManager.emit("branch_decision", lead.id, { pipelineId, action: response.action, message: branchMessages[response.action] });

  await setCampaignAgent(lead.id, 10);
  let learning;
  if (awaitingRealReply) {
    // Don't teach the model from a non-event
    sseManager.emitAgentStatus(lead.id, 10, "Learning Loop", "running");
    learning = {
      leadId: lead.id,
      weightUpdates: [],
      heuristicUpdates: ["Waiting for a real outcome. Scoring weights are unchanged until this lead replies."],
      toneRuleUpdates: [],
      updatedAt: new Date().toISOString(),
    };
    sseManager.emitAgentStatus(lead.id, 10, "Learning Loop", "complete", "No outcome yet; weights unchanged");
  } else {
    learning = await runLearningLoopAgent(response, intent, strategy, persona, lead.orgId, lead.segment);
  }
  await logAgentRun(lead.id, 10, "Learning Loop", learning);

  const finalStatus = response.action === "cancel_sequence" ? "cancelled" : "completed";
  const completedAt = new Date().toISOString();
  await campaignsCol().updateOne({ leadId: lead.id }, { $set: { status: finalStatus, currentAgent: 10, completedAt } });
  await leadsCol().updateOne({ _id: lead.id }, { $set: { status: awaitingRealReply ? "awaiting_reply" : leadStatusForAction(response.action), updatedAt: completedAt } });

  const totalDurationMs = Date.now() - started;
  console.log(`🏁 Pipeline complete for ${lead.companyName} in ${totalDurationMs}ms, ${intent.compositeScore}/100 ${intent.tier}, ${strategy.primaryChannel}, ${response.action}`);
  sseManager.emit("pipeline_complete", lead.id, {
    pipelineId,
    status: finalStatus,
    action: response.action,
    totalDurationMs,
    summary: { lead: `${lead.contactName} @ ${lead.companyName}`, score: intent.compositeScore, tier: intent.tier, channel: strategy.primaryChannel, outcome: response.action },
  });
  return { intent, persona, strategy, content, rationale, deliveries, response, learning };
}

/** Runs the pipeline and records failures instead of leaving the lead stuck in "processing". */
export async function runPipelineSafely(pipelineId: string, lead: EnrichedLead, opts: { reply?: string } = {}) {
  try {
    return await runFullPipeline(pipelineId, lead, opts);
  } catch (err) {
    console.error(`❌ Pipeline error for ${lead.companyName}:`, err);
    const now = new Date().toISOString();
    await leadsCol().updateOne({ _id: lead.id }, { $set: { status: "error", error: String(err), updatedAt: now } }).catch(() => {});
    await campaignsCol().updateOne({ leadId: lead.id }, { $set: { status: "failed", error: String(err), completedAt: now } }).catch(() => {});
    sseManager.emit("error", lead.id, { pipelineId, error: String(err) });
    return null;
  }
}

/** Process a reply for a lead: Agent 9 → Agent 10, keeping lead status in sync. */
export async function processReply(leadId: string, orgId: string, channel: OutreachChannel, messageBody?: string): Promise<ResponseEvent> {
  sseManager.registerLead(leadId, orgId);
  const lead = await leadsCol().findOne({ _id: leadId, orgId });
  if (!lead) throw new Error("Lead not found");

  const response = await runResponseMonitorAgent(leadId, channel, messageBody?.trim() || undefined);
  await logAgentRun(leadId, 9, "Response Monitor", response);

  const [intent, persona, strategy] = await Promise.all([
    latestAgentRun(leadId, 3).then((r) => parseRunOutput<IntentScore>(r)),
    latestAgentRun(leadId, 4).then((r) => parseRunOutput<PersonaProfile>(r)),
    latestAgentRun(leadId, 5).then((r) => parseRunOutput<OutreachStrategy>(r)),
  ]);
  if (intent && persona && strategy) {
    const learning = await runLearningLoopAgent(response, intent, strategy, persona, orgId, lead.segment as string | undefined);
    await logAgentRun(leadId, 10, "Learning Loop", learning);
  }

  // A "no reply" doesn't downgrade a lead that already escalated / booked / opted out
  if (response.action !== "nurture" || lead.status === "processing") {
    await leadsCol().updateOne({ _id: leadId }, { $set: { status: leadStatusForAction(response.action), updatedAt: new Date().toISOString() } });
  }
  return response;
}
