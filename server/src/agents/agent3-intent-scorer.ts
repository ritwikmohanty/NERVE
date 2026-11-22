import { nanoid } from "nanoid";
import { scoringWeightsCol, intentScoresCol } from "../db/index.js";
import { sseManager } from "../lib/sse.js";
import { buildRadar } from "../allhome/bundler.js";
import { nearestCentre, SEGMENTS, STAGES, stageIndex } from "../allhome/catalog.js";
import type { EnrichedLead, SignalBundle, IntentScore, ScoreDimension, ScoringWeights } from "../types/index.js";
import { DEFAULT_SCORING_WEIGHTS, DIMENSION_LABELS } from "../types/index.js";

const AGENT_NUMBER = 3;
const AGENT_NAME = "Intent Scorer";

export async function loadWeights(orgId: string): Promise<ScoringWeights> {
  const rows = await scoringWeightsCol().find({ orgId }).toArray();
  const w: Record<string, number> = {};
  for (const r of rows) w[String(r.dimension)] = Number(r.weight);
  const out = { ...DEFAULT_SCORING_WEIGHTS };
  for (const k of Object.keys(out) as Array<keyof ScoringWeights>) {
    if (typeof w[k] === "number" && Number.isFinite(w[k])) out[k] = w[k];
  }
  return out;
}

type Scored = { score: number; reasoning: string };

function parseCrore(value?: string): number {
  if (!value) return 0;
  const m = value.replace(/,/g, "").match(/([\d.]+)\s*(cr|crore|l|lakh)?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return /l/i.test(m[2] || "") ? n / 100 : n;
}

function specifierInfluence(lead: EnrichedLead): Scored {
  const base: Record<string, number> = { architect: 88, id_firm: 82, developer: 78, contractor: 62, homeowner: 52 };
  const seg = lead.segment || "architect";
  let score = base[seg] ?? 60;
  if (lead.seniority === "C-Level") score += 5;
  score = Math.min(100, score);
  return {
    score,
    reasoning: `${SEGMENTS[seg].label}s decide what gets specified, like doctors in pharma. ${lead.contactTitle} ${lead.seniority === "C-Level" ? "owns the final material call" : "strongly influences the material call"}.`,
  };
}

function segmentFit(lead: EnrichedLead, targetSegments: string[]): Scored {
  const seg = lead.segment || "architect";
  const inTarget = targetSegments.includes(seg);
  return {
    score: inTarget ? 88 : 45,
    reasoning: inTarget ? `${SEGMENTS[seg].label} is a target segment for this workspace` : `${SEGMENTS[seg].label} is outside the workspace's target segments`,
  };
}

function projectValue(lead: EnrichedLead): Scored {
  const cr = parseCrore(lead.projectValue);
  const score = cr >= 100 ? 95 : cr >= 25 ? 85 : cr >= 8 ? 78 : cr >= 3 ? 68 : cr > 0 ? 50 : 55;
  return { score, reasoning: `${lead.projectName || "Project"} valued at ${lead.projectValue || "unknown"} (${lead.budgetTier || "premium"} tier)` };
}

function stageFit(lead: EnrichedLead, brands?: string[]): Scored {
  const stage = lead.projectStage || "design";
  const radar = buildRadar(stage, brands);
  const open = radar.filter((r) => r.status === "now");
  const soon = radar.filter((r) => r.status === "upcoming" && r.weeksUntil <= 12);
  const score = Math.min(100, 35 + open.length * 18 + soon.length * 8);
  return {
    score,
    reasoning: `At ${STAGES[stageIndex(stage)].label} stage, ${open.length} AllHome brand window(s) are open now (${open.map((o) => o.brandName).join(", ") || "none"})${soon.length ? `, ${soon.length} opening within 12 weeks` : ""}`,
  };
}

function centreProximity(lead: EnrichedLead): Scored {
  const match = nearestCentre(lead.projectCity);
  if (!match) return { score: 40, reasoning: "No experience centre found" };
  if (match.sameCity) return { score: 95, reasoning: `AllHome ${match.centre.kind === "dealer" ? "dealer showroom" : "experience centre"} in ${match.centre.city} (${match.brandName}): easy to invite for a material walkthrough` };
  const d = match.distanceKm;
  const score = d < 0 ? 50 : d < 200 ? 75 : d < 600 ? 60 : 45;
  return { score, reasoning: `Nearest centre: ${match.brandName}, ${match.centre.city}${d >= 0 ? ` (~${d} km)` : ""}` };
}

function signalStrength(signals: SignalBundle): Scored {
  if (!signals.signals.length) return { score: 20, reasoning: "No recent signals" };
  const map = { HIGH: 30, MEDIUM: 20, LOW: 10 };
  const total = signals.signals.reduce((s, sig) => s + map[sig.strength] * sig.recencyWeight, 0);
  return {
    score: Math.min(100, Math.round(total / 1.3)),
    reasoning: `${signals.signals.length} signals, top: "${signals.topSignal?.title}" (${signals.topSignal?.strength}, ${signals.topSignal?.dateUnknown ? "date unknown" : `${signals.topSignal?.recencyDays}d ago`})`,
  };
}

function portfolioFit(lead: EnrichedLead): Scored {
  if (lead.dataSource === "live") {
    const projects = lead.portfolio?.length || 0;
    const premium = [...(lead.specialties || []), ...(lead.portfolio || [])].some((x) => /luxury|premium|villa|hospitality|hotel|resort|residence|facade|tower/i.test(x));
    return {
      score: Math.min(100, 45 + projects * 8 + (premium ? 20 : 0)),
      reasoning: projects || lead.specialties?.length
        ? `Public work: ${[...(lead.portfolio || []).slice(0, 3)].join(", ") || "-"}${lead.specialties?.length ? ` · focus: ${lead.specialties.slice(0, 3).join(", ")}` : ""}${premium ? " · premium-segment work" : ""}`
        : "Portfolio not found in public sources",
    };
  }
  const n = lead.projectsPerYear || 0;
  const premiumSpecialty = (lead.specialties || []).some((s) => /luxury|premium|villa|hospitality|branded|facade/i.test(s));
  const score = Math.min(100, 40 + Math.min(n, 25) * 1.6 + (premiumSpecialty ? 15 : 0));
  return {
    score: Math.round(score),
    reasoning: `${n} projects/year${lead.specialties?.length ? ` · focus: ${lead.specialties.join(", ")}` : ""}${premiumSpecialty ? " · premium-segment work" : ""}`,
  };
}

function reachability(lead: EnrichedLead): Scored {
  let score = 30;
  const r: string[] = [];
  if (lead.contactPhone) { score += 30; r.push("WhatsApp-reachable phone"); }
  if (lead.contactEmail) { score += 25; r.push("email"); }
  if (lead.contactLinkedIn) { score += 15; r.push("LinkedIn"); }
  return { score: Math.min(100, score), reasoning: r.length ? `Reachable via ${r.join(", ")}` : "Limited contact data" };
}

function engagementHistory(): Scored {
  return { score: 50, reasoning: "No prior engagement with AllHome brands (new specifier)" };
}

export async function runIntentScorerAgent(
  lead: EnrichedLead,
  signals: SignalBundle,
  ctx: { brands: string[]; segments: string[] } = { brands: [], segments: [] }
): Promise<IntentScore> {
  const start = Date.now();
  sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "running");
  try {
    const weights = await loadWeights(lead.orgId);
    const brands = ctx.brands.length ? ctx.brands : undefined;
    const results: Record<keyof ScoringWeights, Scored> = {
      specifierInfluence: specifierInfluence(lead),
      segmentFit: segmentFit(lead, ctx.segments.length ? ctx.segments : Object.keys(SEGMENTS)),
      projectValue: projectValue(lead),
      stageFit: stageFit(lead, brands),
      centreProximity: centreProximity(lead),
      signalStrength: signalStrength(signals),
      portfolioFit: portfolioFit(lead),
      contactReachability: reachability(lead),
      engagementHistory: engagementHistory(),
    };

    const dimensions: ScoreDimension[] = (Object.keys(results) as Array<keyof ScoringWeights>).map((k) => ({
      name: DIMENSION_LABELS[k],
      rawScore: results[k].score,
      weight: weights[k],
      weightedScore: Math.round(results[k].score * weights[k] * 100) / 100,
      reasoning: results[k].reasoning,
    }));

    const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0) || 1;
    const compositeScore = Math.round(dimensions.reduce((s, d) => s + d.weightedScore, 0) / totalWeight);
    const tier: IntentScore["tier"] = compositeScore >= 82 ? "HOT" : compositeScore >= 72 ? "WARM" : compositeScore >= 58 ? "COOL" : "COLD";
    const topContributors = [...dimensions].sort((a, b) => b.weightedScore - a.weightedScore).slice(0, 3).map((d) => d.name);

    const intentScore: IntentScore = { leadId: lead.id, compositeScore, tier, dimensions, topContributors, generatedAt: new Date().toISOString() };

    await intentScoresCol().insertOne({ _id: nanoid(), leadId: lead.id, compositeScore, tier, dimensions: JSON.stringify(dimensions), topContributors: JSON.stringify(topContributors), generatedAt: intentScore.generatedAt });

    const summary = `Score: ${compositeScore}/100 (${tier}). Top: ${topContributors.join(", ")}`;
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "complete", summary);
    sseManager.emit("score_update", lead.id, intentScore);
    console.log(`✅ Agent 3 complete in ${Date.now() - start}ms, ${summary}`);
    return intentScore;
  } catch (error) {
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "error", undefined, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
