/**
 * Seeds the shared AllHome demo workspace by running the real 10-agent pipeline
 * (forced into simulation) for a set of clearly fictional prospects, so the
 * dashboard, calendar, centres and analytics are populated on first login.
 */
import { config } from "../config.js";
import {
  leadsCol, agentRunsCol, signalsCol, intentScoresCol, personaProfilesCol, strategiesCol, generatedContentCol,
  deliveryLogsCol, responseEventsCol, learningHistoryCol, campaignsCol, visitsCol, crmSyncCol, scoringWeightsCol, prospectRunsCol,
} from "./index.js";
import { getDemoWorkspace, ensureOrgWeights } from "../auth/index.js";
import { runLeadIngestionAgent } from "../agents/agent1-lead-ingestion.js";
import { runFullPipeline } from "../pipeline/orchestrator.js";
import { suppressLLM } from "../lib/llm.js";
import { seedDemoAutopilot } from "../prospecting/engine.js";
import type { TargetedInput } from "../types/index.js";

const SEED: Array<Omit<TargetedInput, "mode"> & { reply?: string }> = [
  { companyName: "Studio Kaarva Architects", segment: "architect", projectType: "villa", projectStage: "structure", projectCity: "Mumbai", projectName: "Kaarva Villa, Alibaug", projectValue: "₹14 Cr", reply: "Lovely timing. Can we visit your experience centre next week to see the facade panels and window samples in person?" },
  { companyName: "Meridian Habitat Developers", segment: "developer", projectType: "apartment_tower", projectStage: "design", projectCity: "Hyderabad", contactName: "Arjun Reddy", contactTitle: "Director, Projects", projectName: "Meridian Skyline, Kokapet", projectValue: "₹320 Cr", reply: "Interested. Please send project pricing and lead times for the facade and windows, let's set up a call." },
  { companyName: "Ochre & Oak Interiors", segment: "id_firm", projectType: "premium_apartment", projectStage: "fitout", projectCity: "Mumbai", projectName: "Worli Sea-view Residence", projectValue: "₹5 Cr", reply: "Sounds great! My client and I would love to come by the showroom to see the bath fittings and hardware." },
  { companyName: "Kosha Design Studio", segment: "id_firm", projectType: "hospitality", projectStage: "mep", projectCity: "Delhi", projectName: "Boutique Hotel, Chhatarpur", projectValue: "₹60 Cr", reply: "Thanks, but we're swamped this month. Can you follow up in a few weeks?" },
  { companyName: "Prism Build PMC", segment: "contractor", projectType: "office", projectStage: "fitout", projectCity: "Mumbai", projectName: "Grade-A Office Fit-out, Powai", projectValue: "₹40 Cr", reply: "" },
  { companyName: "Monsoon House Architects", segment: "architect", projectType: "hospitality", projectStage: "design", projectCity: "Bengaluru", projectName: "Forest Retreat, Devanahalli", projectValue: "₹110 Cr", reply: "" },
  { companyName: "The Rao Residence", segment: "homeowner", projectType: "villa", projectStage: "finishing", projectCity: "Hyderabad", contactName: "Ananya Rao", contactTitle: "Homeowner", projectName: "Rao Villa, Jubilee Hills", projectValue: "₹9 Cr", reply: "Not interested, thanks. We've already finalised everything." },
  { companyName: "Banyan Grove Realty", segment: "developer", projectType: "villa", projectStage: "structure", projectCity: "Bengaluru", projectName: "Banyan Grove Villas, Whitefield", projectValue: "₹180 Cr", reply: "" },
];

async function clearOrg(orgId: string) {
  const leadIds = (await leadsCol().find({ orgId }).project({ _id: 1 }).toArray()).map((l) => l._id);
  const byLead = { leadId: { $in: leadIds } };
  await Promise.all([
    agentRunsCol().deleteMany(byLead), signalsCol().deleteMany(byLead), intentScoresCol().deleteMany(byLead),
    personaProfilesCol().deleteMany(byLead), strategiesCol().deleteMany(byLead), generatedContentCol().deleteMany(byLead),
    deliveryLogsCol().deleteMany(byLead), responseEventsCol().deleteMany(byLead), campaignsCol().deleteMany(byLead),
    learningHistoryCol().deleteMany({ orgId }), visitsCol().deleteMany({ orgId }), crmSyncCol().deleteMany({ orgId }),
    scoringWeightsCol().deleteMany({ orgId }),
  ]);
  await leadsCol().deleteMany({ orgId });
}

/**
 * Ensure the demo workspace exists and has data.
 * `force` (or DEMO_RESET_ON_BOOT=true) wipes and re-seeds it — keeps the shared demo clean.
 */
export async function seedDemoWorkspace(force = process.env.DEMO_RESET_ON_BOOT === "true"): Promise<void> {
  const { orgId } = await getDemoWorkspace();
  const existing = await leadsCol().countDocuments({ orgId });
  if (existing > 0 && !force) {
    // Workspaces seeded before Autopilot existed get its sample run once
    if (!(await prospectRunsCol().findOne({ orgId }))) await seedDemoAutopilot(orgId);
    console.log(`🏠 Demo workspace ready (${existing} leads)`);
    return;
  }
  if (existing > 0) await clearOrg(orgId);
  await ensureOrgWeights(orgId);

  const wasSimulation = config.simulationMode;
  (config as { simulationMode: boolean }).simulationMode = true; // never send or call paid APIs while seeding
  suppressLLM(true); // instant, deterministic seed, no LLM calls at boot
  const started = Date.now();
  try {
    for (const s of SEED) {
      const { reply, ...rest } = s;
      const [lead] = await runLeadIngestionAgent({ mode: "targeted", origin: "seed", ...rest }, orgId);
      if (lead) await runFullPipeline(lead.id, lead, { reply });
    }
    await seedDemoAutopilot(orgId);
  } finally {
    (config as { simulationMode: boolean }).simulationMode = wasSimulation;
    suppressLLM(false);
  }
  console.log(`🏠 Seeded demo workspace with ${SEED.length} AllHome pipelines in ${Date.now() - started}ms`);
}
