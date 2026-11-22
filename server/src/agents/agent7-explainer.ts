import { nanoid } from "nanoid";
import { agentRunsCol } from "../db/index.js";
import { sseManager } from "../lib/sse.js";
import { config } from "../config.js";
import { SEGMENTS, STAGES, PROJECT_TYPES, stageIndex } from "../allhome/catalog.js";
import type {
  EnrichedLead,
  SignalBundle,
  IntentScore,
  PersonaProfile,
  OutreachStrategy,
  GeneratedContent,
  DecisionRationale,
  RationaleItem,
  AgentGraphData,
  AgentNode,
  AgentEdge,
} from "../types/index.js";

const AGENT_NUMBER = 7;
const AGENT_NAME = "Explainer";
const CHN: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", linkedin_dm: "LinkedIn DM" };

// ─── Agent Graph Builder (for React Flow frontend) ───

async function buildAgentGraph(leadId: string): Promise<AgentGraphData> {
  // Query all agent runs for this lead
  const runs = await agentRunsCol().find({ leadId }).toArray();

  const runMap = new Map(runs.map((r) => [r.agentNumber, r])); // later runs overwrite earlier ones

  const agentDefs = [
    { num: 1, name: "Lead Ingestion", id: "agent-1" },
    { num: 2, name: "Signal Scout", id: "agent-2" },
    { num: 3, name: "Intent Scorer", id: "agent-3" },
    { num: 4, name: "Persona Analyst", id: "agent-4" },
    { num: 5, name: "Strategy Commander", id: "agent-5" },
    { num: 6, name: "Content Forge", id: "agent-6" },
    { num: 7, name: "Explainer", id: "agent-7" },
    { num: 8, name: "Delivery Agent", id: "agent-8" },
    { num: 9, name: "Response Monitor", id: "agent-9" },
    { num: 10, name: "Learning Loop", id: "agent-10" },
  ];

  const nodes: AgentNode[] = agentDefs.map((def) => {
    const run = runMap.get(def.num);
    return {
      agentId: def.id,
      agentName: def.name,
      agentNumber: def.num,
      status: run ? (run.status as "idle" | "running" | "complete" | "error") : "idle",
      startedAt: run?.startedAt || undefined,
      completedAt: run?.completedAt || undefined,
      outputSummary: run?.output ? summarizeOutput(def.num, run.output) : undefined,
      error: run?.error || undefined,
    };
  });

  // Define the DAG edges: 1 → 2,3,4(parallel) → 5 → 6,7(parallel) → 8 → 9 → 10
  const edges: AgentEdge[] = [
    { from: "agent-1", to: "agent-2", animated: true, dataFlowing: !!runMap.get(2) },
    { from: "agent-1", to: "agent-3", animated: true, dataFlowing: !!runMap.get(3) },
    { from: "agent-1", to: "agent-4", animated: true, dataFlowing: !!runMap.get(4) },
    { from: "agent-2", to: "agent-5", animated: true, dataFlowing: !!runMap.get(5) },
    { from: "agent-3", to: "agent-5", animated: true, dataFlowing: !!runMap.get(5) },
    { from: "agent-4", to: "agent-5", animated: true, dataFlowing: !!runMap.get(5) },
    { from: "agent-5", to: "agent-6", animated: true, dataFlowing: !!runMap.get(6) },
    { from: "agent-5", to: "agent-7", animated: true, dataFlowing: !!runMap.get(7) },
    { from: "agent-6", to: "agent-8", animated: true, dataFlowing: !!runMap.get(8) },
    { from: "agent-7", to: "agent-8", animated: true, dataFlowing: !!runMap.get(8) },
    { from: "agent-8", to: "agent-9", animated: true, dataFlowing: !!runMap.get(9) },
    { from: "agent-9", to: "agent-10", animated: true, dataFlowing: !!runMap.get(10) },
  ];

  return { nodes, edges };
}

function summarizeOutput(agentNumber: number, outputJson: string): string {
  try {
    const data = JSON.parse(outputJson);
    switch (agentNumber) {
      case 1: return `Enriched: ${data.companyName}, ${data.contactName}`;
      case 2: return `${data.signals?.length || 0} signals, top: ${data.topSignal?.title?.slice(0, 40) || "none"}`;
      case 3: return `Score: ${data.compositeScore}/100 (${data.tier})`;
      case 4: return `${data.archetypeLabel} (${Math.round((data.confidence || 0) * 100)}%)`;
      case 5: return `${data.primaryChannel} | ${data.toneFramework}`;
      case 6: return `${data.touches?.length || 0} touches generated`;
      case 8: return `Delivered: ${data.status || "pending"}`;
      case 9: return `Sentiment: ${data.sentiment || "pending"}`;
      case 10: return `${data.weightUpdates?.length || 0} weight updates`;
      default: return "Completed";
    }
  } catch {
    return "Completed";
  }
}

// ─── Plain-English Rationale Builder ───

function buildRationale(
  lead: EnrichedLead,
  signals: SignalBundle,
  intent: IntentScore,
  persona: PersonaProfile,
  strategy: OutreachStrategy,
  content: GeneratedContent
): RationaleItem[] {
  const items: RationaleItem[] = [];
  const seg = lead.segment ? SEGMENTS[lead.segment].label : "Specifier";
  const stage = STAGES[stageIndex(lead.projectStage || "design")].label;

  items.push({
    agentName: "Lead Ingestion",
    decision: `${lead.companyName}: ${lead.contactUnknown ? "no named contact yet" : `${lead.contactName}${lead.contactTitle ? ` (${lead.contactTitle})` : ""}`}`,
    explanation: `${seg} in ${lead.projectCity || "India"}${lead.projectsPerYear ? ` delivering ~${lead.projectsPerYear} projects a year` : ""}${lead.specialties?.length ? `, known for ${lead.specialties.join(" and ").toLowerCase()}` : ""}. ${lead.projectAssumed ? "No project details were provided, the bundle assumes a typical " + (lead.projectType ? PROJECT_TYPES[lead.projectType].toLowerCase() : "premium") + " project at the " + stage.toLowerCase() + " stage." : `Current project: ${lead.projectName || "unnamed"} (${lead.projectType ? PROJECT_TYPES[lead.projectType] : "premium"}${lead.projectValue ? `, ${lead.projectValue}` : ""}) at the ${stage.toLowerCase()} stage.`}${lead.dataSource === "live" ? ` Profile built from live research (${lead.research?.providers.join(", ") || "web"}; ${lead.research?.sources.length || 0} sources)${lead.contactUnknown ? ", no named contact was found publicly, so outreach addresses the studio." : "."}` : " (Fictional demo profile.)"}`,
    confidence: 0.95,
  });

  items.push({
    agentName: "Signal Scout",
    decision: signals.topSignal ? `${signals.signals.length} signals. Strongest: "${signals.topSignal.title}"` : "No strong signals",
    explanation: signals.topSignal
      ? `The strongest buying signal is "${signals.topSignal.title}" (${signals.topSignal.category.replace(/_/g, " ")}, ${signals.topSignal.strength}, ${signals.topSignal.dateUnknown ? "date unknown" : `${signals.topSignal.recencyDays} days ago`}, ${signals.topSignal.source}). ${signals.signals.slice(1, 3).map((s) => `"${s.title}"`).join(" and ")} add context.`
      : "No recent public activity found, so outreach leans on project stage instead.",
    confidence: signals.topSignal ? 0.85 : 0.5,
  });

  const topDims = [...intent.dimensions].sort((a, b) => b.weightedScore - a.weightedScore).slice(0, 3);
  items.push({
    agentName: "Intent Scorer",
    decision: `${intent.compositeScore}/100 (${intent.tier})`,
    explanation: `Top drivers: ${topDims.map((d) => `${d.name} ${d.rawScore}/100 (${d.reasoning})`).join("; ")}.`,
    confidence: 0.9,
  });

  items.push({
    agentName: "Persona Analyst",
    decision: `${persona.archetypeLabel} (${Math.round(persona.confidence * 100)}%)`,
    explanation: `${persona.reasoning} Lead with: ${persona.talkingPoints.slice(0, 2).join("; ")}. Avoid: ${persona.avoidInMessaging.join(", ")}.`,
    confidence: persona.confidence,
  });

  if (strategy.bundle) {
    items.push({
      agentName: "Brand Bundler",
      decision: strategy.bundle.headline,
      explanation: `Why these brands, why now: ${strategy.bundle.items.map((i) => `${i.brandName} (${i.role.replace(/_/g, " ")}): ${i.reason}`).join(". ")}. One relationship replaces ${strategy.bundle.vendorsReplaced} separate vendors.`,
      confidence: 0.88,
    });
  }

  items.push({
    agentName: "Strategy Commander",
    decision: `${CHN[strategy.primaryChannel] || strategy.primaryChannel}${strategy.secondaryChannel ? " then " + (CHN[strategy.secondaryChannel] || strategy.secondaryChannel) : ""} · ${strategy.toneFramework.replace(/_/g, " ")} · ${strategy.cadence.length} touches`,
    explanation: strategy.decisions.map((d) => `${d.decision}: ${d.reasoning}`).join(" | "),
    confidence: 0.85,
  });

  items.push({
    agentName: "Content Forge",
    decision: `${content.touches.length} personalised messages + spec sheet`,
    explanation: content.touches.map((t) => `Touch ${t.touchNumber} (${t.channel.replace(/_/g, " ")})${t.subject ? ` "${t.subject}"` : ""}: ${t.preview}…`).join(" · "),
    confidence: 0.8,
  });

  return items;
}

// ─── LLM-Enhanced Summary ───

/**
 * Executive summary. Built deterministically from the decisions themselves: an LLM summary was
 * found to misspell names, guess gender and invent reasons, and this panel must be exactly right.
 */
async function generateSummary(
  lead: EnrichedLead,
  _rationale: RationaleItem[],
  intent: IntentScore,
  strategy: OutreachStrategy
): Promise<string> {
  const who = lead.contactUnknown ? `the ${lead.companyName} team` : `${lead.contactName} at ${lead.companyName}`;
  const tone = strategy.toneFramework.replace(/_/g, "-");
  const days = strategy.cadence[strategy.cadence.length - 1]?.dayOffset || 7;
  const tierLine = intent.tier === "HOT" ? "a high priority" : intent.tier === "WARM" ? "a solid prospect" : "one to nurture";
  const primary = strategy.bundle?.items.filter((i) => i.role === "primary").map((i) => i.brandName) || [];
  const c = strategy.experienceCentre;
  const parts = [
    `We're contacting ${who} on ${CHN[strategy.primaryChannel] || strategy.primaryChannel}${strategy.secondaryChannel ? `, with ${(CHN[strategy.secondaryChannel] || strategy.secondaryChannel).replace("Email", "email")} as the follow-up` : ""}, using ${/^[aeiou]/i.test(tone) ? "an" : "a"} ${tone} tone.`,
    `Intent is ${intent.compositeScore}/100 (${intent.tier}), which makes this ${tierLine}.`,
    primary.length ? `The messages lead with ${primary.join(" and ")}${strategy.bundle?.nextBrand ? `, then pre-specify ${strategy.bundle.nextBrand.brandName} in about ${strategy.bundle.nextBrand.weeksUntil} weeks` : ""}.` : "",
    `${strategy.cadence.length} touches over ${days} days${c ? `, with an invite to the ${c.brandName} ${c.centre.kind === "dealer" ? "dealer showroom" : "experience centre"} in ${c.centre.city}` : ""}.`,
    lead.projectAssumed ? "No project details were given, so the drafts don't mention a specific project." : "",
  ];
  return parts.filter(Boolean).join(" ");
}

// ─── Main Agent Function ───

export async function runExplainerAgent(
  lead: EnrichedLead,
  signals: SignalBundle,
  intent: IntentScore,
  persona: PersonaProfile,
  strategy: OutreachStrategy,
  content: GeneratedContent
): Promise<DecisionRationale> {
  const startTime = Date.now();

  sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "running");

  try {
    // Build structured rationale
    const explanations = buildRationale(lead, signals, intent, persona, strategy, content);

    // Build agent graph data
    const graphData = await buildAgentGraph(lead.id);

    // Generate executive summary
    const summary = await generateSummary(lead, explanations, intent, strategy);

    const rationale: DecisionRationale = {
      leadId: lead.id,
      explanations,
      summary,
      graphData,
      generatedAt: new Date().toISOString(),
    };

    const durationMs = Date.now() - startTime;
    const outputSummary = `${explanations.length} rationale items | ${graphData.nodes.filter((n) => n.status === "complete").length}/${graphData.nodes.length} agents complete`;

    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "complete", outputSummary);
    sseManager.emit("rationale_update", lead.id, rationale);

    console.log(`✅ Agent 7 complete in ${durationMs}ms, ${outputSummary}`);
    return rationale;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "error", undefined, errMsg);
    throw error;
  }
}
