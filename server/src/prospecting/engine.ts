/**
 * Autopilot prospecting — NERVE finds the firms itself.
 *
 *   1. SCAN     Tavily news search per (trigger × city), Groq extracts the firms named in
 *               the results. Hallucination guard: a firm must literally appear in its source.
 *   2. TRIAGE   Deterministic, free score (trigger type, recency, segment, city, named project).
 *   3. PIPELINE The full 10-agent pipeline runs ONLY for the top K firms. The rest are
 *               shortlisted and can be run on demand — a full pipeline costs ~2 searches and
 *               ~6 LLM calls per firm, so running it for every firm would blow the free quotas.
 *
 * Everything is bounded: per-run caps, per-workspace daily caps, a shared daily API budget
 * (lib/usage.ts) and ONE global queue so pipelines never run in parallel against the
 * rate-limited LLM. Nothing is ever sent — sending stays governed by SIMULATION_MODE.
 */
import { nanoid } from "nanoid";
import { agentRunsCol, autopilotCol, leadsCol, prospectRunsCol, prospectsCol, orgsCol } from "../db/index.js";
import { getOrgSettings, type AuthCtx } from "../auth/index.js";
import { llmEnabled, llmGenerateText } from "../lib/llm.js";
import { liveResearchEnabled, tavilyEnabled, apolloEnabled } from "../lib/runtime.js";
import { usageToday, type UsageToday } from "../lib/usage.js";
import { tavily, type TavilyResult } from "../research/firm.js";
import { runLeadIngestionAgent } from "../agents/agent1-lead-ingestion.js";
import { runPipelineSafely } from "../pipeline/orchestrator.js";
import { BRANDS, CITY_COORDS, PRIORITY_CITIES, SEGMENTS, normalizeCity, type ProjectType, type Segment } from "../allhome/catalog.js";
import { SAMPLE_TRIGGERS, TRIGGERS, TRIGGER_IDS, type TriggerType } from "./triggers.js";
import type { TargetedInput, TriggerSignal } from "../types/index.js";

// ─── Limits ───

const envNum = (k: string, d: number) => {
  const n = Number(process.env[k]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};

export interface AutopilotLimits {
  maxFirmsPerRun: number;
  maxPipelinesPerRun: number;
  maxQueriesPerRun: number;
  maxRunsPerDay: number;
  maxPipelinesPerDay: number;
  scheduleAllowed: boolean;
}

export function limitsFor(role: AuthCtx["role"] | "schedule"): AutopilotLimits {
  if (role === "demo") {
    // Shared public workspace running on personal keys — keep it small
    return { maxFirmsPerRun: 15, maxPipelinesPerRun: 3, maxQueriesPerRun: 6, maxRunsPerDay: 6, maxPipelinesPerDay: 10, scheduleAllowed: false };
  }
  return {
    maxFirmsPerRun: envNum("AUTOPILOT_MAX_FIRMS", 50),
    maxPipelinesPerRun: envNum("AUTOPILOT_MAX_PIPELINES", 10),
    maxQueriesPerRun: envNum("AUTOPILOT_MAX_QUERIES", 12),
    maxRunsPerDay: envNum("AUTOPILOT_MAX_RUNS_PER_DAY", 10),
    maxPipelinesPerDay: envNum("AUTOPILOT_MAX_PIPELINES_PER_DAY", 30),
    scheduleAllowed: true,
  };
}

/** API calls per unit of work — used for estimates and budget checks. */
export function unitCosts(live: boolean) {
  const llm = llmEnabled();
  return {
    // One news search + one LLM extraction per scan query
    perQuery: live ? { tavily: 1, groq: 1, apollo: 0 } : { tavily: 0, groq: 0, apollo: 0 },
    // Research (2 searches + 1 extraction + Apollo) + Persona (1) + 3 drafts (3) + Explainer (1),
    // plus ~1 for rate-limit fallbacks / retries — measured ~6 per simulated pipeline
    perPipeline: live
      ? { tavily: 2, groq: 7, apollo: apolloEnabled() ? 1 : 0 }
      : { tavily: 0, groq: llm ? 6 : 0, apollo: 0 },
  };
}

// ─── Config ───

export type Schedule = "off" | "daily" | "weekly";

export interface AutopilotConfig {
  orgId: string;
  triggers: TriggerType[];
  segments: Segment[];
  cities: string[];
  firmsPerRun: number;
  pipelinesPerRun: number;
  lookbackDays: number;
  schedule: Schedule;
  nextRunAt?: string;
  lastRunAt?: string;
  updatedAt?: string;
}

const PROSPECTABLE: Segment[] = ["architect", "id_firm", "developer", "contractor"]; // never private homeowners
const LOOKBACKS = [7, 14, 30, 60];

async function defaultConfig(orgId: string): Promise<AutopilotConfig> {
  const s = await getOrgSettings(orgId);
  const segments = s.segments.filter((x) => PROSPECTABLE.includes(x));
  return {
    orgId,
    triggers: ["project_launch", "hospitality", "commercial_fitout", "developer_expansion"],
    segments: segments.length ? segments : ["architect", "id_firm", "developer"],
    cities: (s.cities.length ? s.cities : ["Mumbai", "Bengaluru"]).slice(0, 3),
    firmsPerRun: 10,
    pipelinesPerRun: 3,
    lookbackDays: 30,
    schedule: "off",
  };
}

export async function getConfig(orgId: string): Promise<AutopilotConfig> {
  const doc = await autopilotCol().findOne({ _id: orgId });
  const base = await defaultConfig(orgId);
  if (!doc) return base;
  const { _id, ...rest } = doc;
  void _id;
  return { ...base, ...(rest as Partial<AutopilotConfig>), orgId };
}

/** Validate + clamp a config to the caller's limits. Returns errors for impossible values. */
export function sanitizeConfig(input: Partial<AutopilotConfig>, current: AutopilotConfig, limits: AutopilotLimits): { config: AutopilotConfig; error?: string } {
  const triggers = Array.isArray(input.triggers) ? input.triggers.filter((t): t is TriggerType => TRIGGER_IDS.includes(t as TriggerType)) : current.triggers;
  const segments = Array.isArray(input.segments) ? input.segments.filter((s): s is Segment => PROSPECTABLE.includes(s as Segment)) : current.segments;
  const cities = Array.isArray(input.cities)
    ? Array.from(new Set(input.cities.map((c) => normalizeCity(String(c)) || "").filter((c) => !!CITY_COORDS[c]))).slice(0, 6)
    : current.cities;
  const firms = Math.round(Number(input.firmsPerRun ?? current.firmsPerRun));
  const pipes = Math.round(Number(input.pipelinesPerRun ?? current.pipelinesPerRun));
  const lookback = Number(input.lookbackDays ?? current.lookbackDays);
  const schedule: Schedule = input.schedule === "daily" || input.schedule === "weekly" || input.schedule === "off" ? input.schedule : current.schedule;

  if (!triggers.length) return { config: current, error: "Pick at least one trigger" };
  if (!segments.length) return { config: current, error: "Pick at least one segment" };
  if (!cities.length) return { config: current, error: "Pick at least one city" };
  if (schedule !== "off" && !limits.scheduleAllowed) return { config: current, error: "Scheduling is turned off in the shared demo workspace — create your own workspace to run Autopilot on a schedule" };

  const firmsPerRun = Math.min(limits.maxFirmsPerRun, Math.max(1, Number.isFinite(firms) ? firms : 10));
  return {
    config: {
      ...current,
      triggers,
      segments,
      cities,
      firmsPerRun,
      pipelinesPerRun: Math.min(limits.maxPipelinesPerRun, firmsPerRun, Math.max(0, Number.isFinite(pipes) ? pipes : 3)),
      lookbackDays: LOOKBACKS.includes(lookback) ? lookback : 30,
      schedule,
      nextRunAt: schedule === "off" ? undefined : schedule === current.schedule && current.nextRunAt ? current.nextRunAt : nextRunTime(schedule),
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function saveConfig(config: AutopilotConfig): Promise<void> {
  const { orgId, ...rest } = config;
  await autopilotCol().updateOne({ _id: orgId }, { $set: { ...rest, orgId } }, { upsert: true });
  if (rest.nextRunAt === undefined) await autopilotCol().updateOne({ _id: orgId }, { $unset: { nextRunAt: "" } });
}

/** Next 09:00 IST (03:30 UTC) — daily, or a week out for weekly. */
export function nextRunTime(schedule: Schedule, from = new Date()): string | undefined {
  if (schedule === "off") return undefined;
  const next = new Date(from);
  next.setUTCHours(3, 30, 0, 0);
  if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
  if (schedule === "weekly") next.setUTCDate(next.getUTCDate() + 6);
  return next.toISOString();
}

// ─── Planning + estimates ───

interface PlannedQuery { trigger: TriggerType; city: string }

/** Round-robin over cities × triggers so a small budget still covers every city. */
function planQueries(cfg: AutopilotConfig, maxQueries: number): PlannedQuery[] {
  const combos: PlannedQuery[] = [];
  for (const trigger of cfg.triggers) for (const city of cfg.cities) combos.push({ trigger, city });
  // interleave by city so the first N queries span all cities
  combos.sort((a, b) => cfg.triggers.indexOf(a.trigger) - cfg.triggers.indexOf(b.trigger) || cfg.cities.indexOf(a.city) - cfg.cities.indexOf(b.city));
  const byCity = cfg.cities.map((c) => combos.filter((q) => q.city === c));
  const interleaved: PlannedQuery[] = [];
  for (let i = 0; interleaved.length < combos.length; i++) for (const list of byCity) if (list[i]) interleaved.push(list[i]);
  // A query yields ~3 usable firms; don't plan far more searches than the firm target needs
  const needed = Math.ceil(cfg.firmsPerRun / 3) + 1;
  return interleaved.slice(0, Math.min(maxQueries, Math.max(needed, Math.min(cfg.cities.length, maxQueries))));
}

export interface Estimate {
  live: boolean;
  queries: number;
  scan: { tavily: number; groq: number };
  pipelines: number;
  pipelineCost: { tavily: number; groq: number; apollo: number };
  total: { tavily: number; groq: number; apollo: number };
  /** What it would cost to run the full pipeline on EVERY firm found */
  everyFirm: { firms: number; tavily: number; groq: number; apollo: number };
  perPipeline: { tavily: number; groq: number; apollo: number };
  fitsBudget: boolean;
  shortfall?: string;
}

export function estimateRun(cfg: AutopilotConfig, limits: AutopilotLimits, live: boolean, usage: UsageToday): Estimate {
  const costs = unitCosts(live);
  const queries = planQueries(cfg, limits.maxQueriesPerRun).length;
  const scan = { tavily: queries * costs.perQuery.tavily, groq: queries * costs.perQuery.groq };
  const k = cfg.pipelinesPerRun;
  const pc = costs.perPipeline;
  const pipelineCost = { tavily: k * pc.tavily, groq: k * pc.groq, apollo: k * pc.apollo };
  const total = { tavily: scan.tavily + pipelineCost.tavily, groq: scan.groq + pipelineCost.groq, apollo: pipelineCost.apollo };
  const everyFirm = {
    firms: cfg.firmsPerRun,
    tavily: scan.tavily + cfg.firmsPerRun * pc.tavily,
    groq: scan.groq + cfg.firmsPerRun * pc.groq,
    apollo: cfg.firmsPerRun * pc.apollo,
  };
  const short: string[] = [];
  if (total.tavily > usage.remaining.tavily) short.push(`${total.tavily} web searches needed, ${usage.remaining.tavily} left today`);
  if (total.groq > usage.remaining.groq) short.push(`${total.groq} AI calls needed, ${usage.remaining.groq} left today`);
  return { live, queries, scan, pipelines: k, pipelineCost, total, everyFirm, perPipeline: pc, fitsBudget: short.length === 0, shortfall: short.join("; ") || undefined };
}

// ─── Global queue: one pipeline at a time across the whole server ───

let chain: Promise<unknown> = Promise.resolve();
let queued = 0;
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  queued++;
  const run = chain.then(fn, fn).finally(() => {
    queued--;
  });
  chain = run.catch(() => undefined);
  return run;
}
export const queueDepth = () => queued;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Triage ───

export interface Candidate {
  companyName: string;
  segment: Segment;
  city: string;
  trigger: TriggerType;
  title: string;
  detail: string;
  projectName?: string;
  projectType?: ProjectType;
  stage: TargetedInput["projectStage"];
  date?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  dataSource: "live" | "sample";
}

/** How strongly each prospectable segment controls what gets specified (max 15). */
const INFLUENCE: Record<string, number> = { architect: 15, developer: 14, id_firm: 13, contractor: 10 };

function triage(c: Candidate): { score: number; reasons: string[] } {
  const t = TRIGGERS[c.trigger];
  const reasons: string[] = [`${t.label} (+${t.weight})`];
  let score = t.weight;
  const days = c.date ? Math.max(0, Math.floor((Date.now() - new Date(c.date).getTime()) / 86_400_000)) : undefined;
  const rec = days === undefined ? 8 : days <= 7 ? 25 : days <= 14 ? 20 : days <= 30 ? 14 : days <= 60 ? 8 : 4;
  score += rec;
  reasons.push(days === undefined ? `Date not stated (+${rec})` : `${days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} ago`} (+${rec})`);
  const inf = INFLUENCE[c.segment] ?? 8;
  score += inf;
  reasons.push(`${SEGMENTS[c.segment].label} — specifier influence (+${inf})`);
  const hasCentre = PRIORITY_CITIES.includes(c.city);
  const cityPts = hasCentre ? 15 : CITY_COORDS[c.city] ? 8 : 3;
  score += cityPts;
  reasons.push(hasCentre ? `AllHome centre in ${c.city} (+15)` : `${c.city} — nearest centre is in another city (+${cityPts})`);
  if (c.projectName) {
    score += 10;
    reasons.push(`Named project: ${c.projectName} (+10)`);
  }
  if (c.stage === "handover") {
    score -= 25;
    reasons.push("Already built or opened — most materials are specified (−25)");
  }
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// ─── Scan: live ───

const EXTRACT_SYSTEM = `You read Indian real-estate, architecture and design news and extract the FIRMS that are about to specify building materials.
Rules:
- Only firms whose name appears verbatim in the given source text. Never add firms from memory.
- Firm roles: "architect" (architecture practice), "id_firm" (interior design studio), "developer" (real-estate developer / hotel owner-developer), "contractor" (turnkey contractor / PMC / fit-out company).
- "companyName" is the ORGANISATION (the developer, practice or contractor) — never a project, tower, hotel or building name. If a source names only the project and not the firm behind it, skip it.
- Only sources that report a specific, recent event. Skip directory/listing pages, generic company profiles, property portals and "top 10" lists.
- Skip publications, award bodies, brokers/consultancies (JLL, CBRE, Anarock, Knight Frank), banks, government bodies, building-material brands, and individuals without a firm.
- "event" is one factual sentence from the source about what happened (launch, signing, appointment, award, new office, land deal).
- "projectName" only if the source names the project, else null.
Return ONLY a JSON array (can be empty): [{"companyName": string, "role": "architect"|"id_firm"|"developer"|"contractor", "projectName": string|null, "city": string|null, "event": string, "source": number}]`;

const BLOCKED = /^(allhome|metalia|the window factory|ledlum|house of w|fiamarc|shapes|colour coats|rera|maharera|jll|cbre|anarock|knight frank|colliers|savills|archdaily|architectural digest|ad india|times of india|economic times|hindustan times|moneycontrol|business standard|mint|livemint)$/i;
const NOT_NEWS_HOSTS = ["instagram.com", "facebook.com", "linkedin.com", "youtube.com", "twitter.com", "x.com", "pinterest.com", "justdial.com", "indiamart.com", "sulekha.com", "99acres.com", "magicbricks.com", "housing.com", "nobroker.in", "squareyards.com", "commonfloor.com", "makaan.com", "proptiger.com", "pattemestates.com", "zaubacorp.com", "tofler.in", "crunchbase.com", "tracxn.com", "glassdoor.com", "glassdoor.co.in", "wikipedia.org"];
function notNews(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return NOT_NEWS_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return true;
  }
}
const BRAND_NAMES = new Set(BRANDS.map((b) => b.name.toLowerCase()));

function inferType(text: string, fallback?: ProjectType): ProjectType | undefined {
  const t = text.toLowerCase();
  if (/hotel|resort|hospitality|serviced/.test(t)) return "hospitality";
  if (/office|campus|headquarter|workplace|it park|business park/.test(t)) return "office";
  if (/mall|retail|store|showroom/.test(t)) return "retail";
  if (/villa|bungalow|farmhouse|plotted/.test(t)) return "villa";
  if (/tower|apartment|residential|housing|floors/.test(t)) return "apartment_tower";
  return fallback;
}

/** Read the construction stage off the event wording; falls back to the trigger's usual stage. */
function inferStage(text: string, fallback: TargetedInput["projectStage"]): TargetedInput["projectStage"] {
  const t = text.toLowerCase();
  if (/\b(opened|inaugurated|now open|opens its doors|opening of|handed over|possession)\b/.test(t)) return "handover";
  if (/\b(fit-?out|interiors? (work|package|contract))\b/.test(t)) return "fitout";
  if (/\b(under construction|construction (has )?(begun|began|starts?|started)|groundbreaking|bhoomi pujan|topped out)\b/.test(t)) return "structure";
  return fallback;
}

async function scanQueryLive(q: PlannedQuery, cfg: AutopilotConfig): Promise<Candidate[]> {
  const t = TRIGGERS[q.trigger];
  let results: TavilyResult[] = [];
  try {
    results = (await tavily(t.query(q.city), { topic: "news", days: cfg.lookbackDays, max: 8 })).results;
  } catch {
    return [];
  }
  // Social posts, portals and directories aren't news about an event — drop them before the LLM sees them
  results = results.filter((r) => !notNews(r.url));
  if (!results.length) return [];
  const corpus = results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}${r.published_date ? `\nDate: ${r.published_date}` : ""}\n${r.content.slice(0, 800)}`)
    .join("\n\n");
  let parsed: Array<{ companyName?: string; role?: string; projectName?: string | null; city?: string | null; event?: string; source?: number }> = [];
  try {
    const out = await llmGenerateText(EXTRACT_SYSTEM, `Trigger: ${t.label}\nCity searched: ${q.city}\n\nSources:\n${corpus}`);
    const m = out.match(/\[[\s\S]*\]/);
    parsed = m ? JSON.parse(m[0]) : [];
  } catch {
    return [];
  }
  const out: Candidate[] = [];
  for (const p of Array.isArray(parsed) ? parsed : []) {
    const name = String(p.companyName || "").trim().replace(/\s+/g, " ");
    if (name.length < 3 || name.length > 80 || BLOCKED.test(name) || BRAND_NAMES.has(name.toLowerCase())) continue;
    const role = String(p.role || "") as Segment;
    if (!PROSPECTABLE.includes(role) || !cfg.segments.includes(role)) continue;
    const src = results[Math.max(0, Math.min(results.length - 1, Number(p.source || 1) - 1))];
    const srcText = `${src.title} ${src.content}`.toLowerCase();
    const all = results.map((r) => `${r.title} ${r.content}`).join(" ").toLowerCase();
    // Hallucination guard: the firm must literally appear in the retrieved text
    if (!srcText.includes(name.toLowerCase()) && !all.includes(name.toLowerCase())) continue;
    const projectName = p.projectName && all.includes(String(p.projectName).toLowerCase()) ? String(p.projectName).slice(0, 120) : undefined;
    const event = String(p.event || src.title).slice(0, 280);
    out.push({
      companyName: name,
      segment: role,
      city: normalizeCity(String(p.city || "")) || q.city,
      trigger: q.trigger,
      title: src.title.slice(0, 160),
      detail: event,
      projectName,
      projectType: inferType(`${event} ${projectName || ""}`, t.projectType),
      stage: inferStage(event, t.stageHint),
      date: src.published_date ? new Date(src.published_date).toISOString() : undefined,
      sourceUrl: src.url,
      sourceTitle: src.title.slice(0, 140),
      dataSource: "live",
    });
  }
  return out;
}

// ─── Scan: sample (fictional, no API cost) ───

function scanSample(cfg: AutopilotConfig): Candidate[] {
  const pool = SAMPLE_TRIGGERS.filter((s) => cfg.triggers.includes(s.trigger) && cfg.segments.includes(s.segment) && s.daysAgo <= cfg.lookbackDays);
  const inCity = pool.filter((s) => cfg.cities.includes(s.city));
  const ordered = [...inCity, ...pool.filter((s) => !inCity.includes(s))];
  return ordered.map((s) => ({
    companyName: s.firm,
    segment: s.segment,
    city: s.city,
    trigger: s.trigger,
    title: s.title,
    detail: s.detail,
    projectName: s.projectName,
    projectType: s.projectType || TRIGGERS[s.trigger].projectType,
    stage: s.stage || TRIGGERS[s.trigger].stageHint,
    date: new Date(Date.now() - s.daysAgo * 86_400_000).toISOString(),
    dataSource: "sample" as const,
  }));
}

// ─── Runs ───

export type RunStatus = "scanning" | "running_pipelines" | "done" | "failed" | "skipped_budget" | "interrupted";
export type ProspectStatus = "queued" | "running" | "pipeline_done" | "shortlisted" | "already_in_pipeline" | "dismissed" | "error";

const ACTIVE: RunStatus[] = ["scanning", "running_pipelines"];
const nameKey = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
const startOfDay = () => new Date(new Date().toISOString().slice(0, 10)).toISOString();

export async function activeRun(orgId: string) {
  return prospectRunsCol().findOne({ orgId, status: { $in: ACTIVE } }, { sort: { startedAt: -1 } });
}

async function runsToday(orgId: string) {
  return prospectRunsCol().countDocuments({ orgId, startedAt: { $gte: startOfDay() }, status: { $nin: ["skipped_budget"] } });
}

export async function pipelinesToday(orgId: string) {
  return prospectsCol().countDocuments({ orgId, pipelineStartedAt: { $gte: startOfDay() } });
}

async function note(runId: string, msg: string) {
  await prospectRunsCol().updateOne({ _id: runId }, { $push: { notes: msg } as never });
}

export class AutopilotError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Start a run. Returns immediately with the run id; scanning + pipelines continue in the
 * background. Throws AutopilotError for anything the caller should see (limits, budget…).
 */
export async function startRun(orgId: string, role: AuthCtx["role"] | "schedule", opts: { sample?: boolean; by: "manual" | "schedule" }): Promise<string> {
  const limits = limitsFor(role);
  const cfg = await getConfig(orgId);
  if (await activeRun(orgId)) throw new AutopilotError("An Autopilot run is already in progress for this workspace", 409);
  if ((await runsToday(orgId)) >= limits.maxRunsPerDay) throw new AutopilotError(`Daily limit reached — ${limits.maxRunsPerDay} Autopilot runs per day for this workspace`, 429);

  const live = !opts.sample && liveResearchEnabled() && tavilyEnabled() && llmEnabled();
  const usage = await usageToday();
  const est = estimateRun(cfg, limits, live, usage);
  const runId = nanoid();
  const now = new Date().toISOString();
  const doc = {
    _id: runId,
    orgId,
    by: opts.by,
    mode: live ? "live" : "sample",
    status: "scanning" as RunStatus,
    config: { triggers: cfg.triggers, segments: cfg.segments, cities: cfg.cities, firmsPerRun: cfg.firmsPerRun, pipelinesPerRun: cfg.pipelinesPerRun, lookbackDays: cfg.lookbackDays },
    estimate: est,
    queriesPlanned: est.queries,
    queriesDone: 0,
    found: 0,
    pipelinesPlanned: 0,
    pipelinesDone: 0,
    notes: [] as string[],
    startedAt: now,
  };

  // The scan alone must fit today's shared budget; pipelines are trimmed to fit later
  if (live && (est.scan.tavily > usage.remaining.tavily || est.scan.groq > usage.remaining.groq)) {
    await prospectRunsCol().insertOne({ ...doc, status: "skipped_budget", finishedAt: now, notes: [`Today's shared API budget is used up (${usage.used.tavily}/${usage.budget.tavily} web searches, ${usage.used.groq}/${usage.budget.groq} AI calls). Try again tomorrow, or run a sample scan.`] });
    throw new AutopilotError(`Today's shared research budget is used up (${usage.used.tavily}/${usage.budget.tavily} web searches used). Run a sample scan, or try again tomorrow.`, 429);
  }

  await prospectRunsCol().insertOne(doc);
  await autopilotCol().updateOne({ _id: orgId }, { $set: { orgId, lastRunAt: now } }, { upsert: true });
  void executeRun(runId, orgId, cfg, limits, live).catch(async (err) => {
    console.error("❌ Autopilot run failed:", err);
    await prospectRunsCol().updateOne({ _id: runId }, { $set: { status: "failed", error: String(err).slice(0, 300), finishedAt: new Date().toISOString() } }).catch(() => {});
  });
  return runId;
}

async function executeRun(runId: string, orgId: string, cfg: AutopilotConfig, limits: AutopilotLimits, live: boolean) {
  const started = Date.now();

  // 1 ─ Scan
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const add = (c: Candidate) => {
    const k = nameKey(c.companyName);
    if (!k || seen.has(k)) return;
    seen.add(k);
    candidates.push(c);
  };
  if (live) {
    const plan = planQueries(cfg, limits.maxQueriesPerRun);
    for (const q of plan) {
      if (candidates.length >= cfg.firmsPerRun * 1.5) break; // enough to triage from
      const u = await usageToday();
      if (u.remaining.tavily < 1 || u.remaining.groq < 1) {
        await note(runId, "Stopped scanning early — the shared daily API budget ran out.");
        break;
      }
      (await scanQueryLive(q, cfg)).forEach(add);
      await prospectRunsCol().updateOne({ _id: runId }, { $inc: { queriesDone: 1 }, $set: { found: candidates.length } });
    }
  } else {
    const plan = planQueries(cfg, limits.maxQueriesPerRun);
    for (let i = 0; i < plan.length; i++) {
      await sleep(250); // sample scan is instant — pace it so progress is visible
      await prospectRunsCol().updateOne({ _id: runId }, { $inc: { queriesDone: 1 } });
    }
    scanSample(cfg).forEach(add);
    await note(runId, "Sample scan — these firms and events are fictional. No API calls were made for the scan.");
  }

  // 2 ─ De-duplicate against this workspace, then triage
  const existingLeads = await leadsCol().find({ orgId }).project({ _id: 1, companyName: 1 }).toArray();
  const leadByKey = new Map(existingLeads.map((l) => [nameKey(String(l.companyName)), String(l._id)]));
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const recent = await prospectsCol().find({ orgId, createdAt: { $gte: since }, status: { $ne: "already_in_pipeline" } }).project({ nameKey: 1 }).toArray();
  const recentKeys = new Set(recent.map((p) => String(p.nameKey)));

  let skippedRecent = 0;
  let skippedExisting = 0;
  const scored = candidates
    .filter((c) => {
      const k = nameKey(c.companyName);
      // Firms that already have a mission don't take one of this run's slots
      if (leadByKey.has(k)) {
        skippedExisting++;
        return false;
      }
      if (recentKeys.has(k)) {
        skippedRecent++;
        return false;
      }
      return true;
    })
    .map((c) => ({ c, ...triage(c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.firmsPerRun);
  if (skippedExisting) await note(runId, `${skippedExisting} firm${skippedExisting > 1 ? "s" : ""} already ${skippedExisting > 1 ? "have" : "has"} a mission in this workspace and ${skippedExisting > 1 ? "were" : "was"} skipped.`);
  if (skippedRecent) await note(runId, `${skippedRecent} firm${skippedRecent > 1 ? "s were" : " was"} already found in the last 30 days and skipped.`);
  if (scored.length < cfg.firmsPerRun) {
    await note(runId, `Found ${scored.length} of the ${cfg.firmsPerRun} firms requested${live ? " — widen the triggers, cities or look-back window to find more." : " (the sample pool is limited)."}`);
  }

  // 3 ─ Decide which firms get a full pipeline (budget-aware)
  const usage = await usageToday();
  const per = unitCosts(live).perPipeline;
  const dailyLeft = Math.max(0, limits.maxPipelinesPerDay - (await pipelinesToday(orgId)));
  const affordable = Math.min(
    per.tavily ? Math.floor(usage.remaining.tavily / per.tavily) : Infinity,
    per.groq ? Math.floor(usage.remaining.groq / per.groq) : Infinity
  );
  const fresh = scored.filter((s) => !leadByKey.has(nameKey(s.c.companyName)));
  const k = Math.min(cfg.pipelinesPerRun, fresh.length, dailyLeft, affordable);
  if (k < Math.min(cfg.pipelinesPerRun, fresh.length)) {
    await note(runId, dailyLeft < cfg.pipelinesPerRun
      ? `Only ${k} pipeline${k === 1 ? "" : "s"} started — this workspace's daily limit is ${limits.maxPipelinesPerDay} pipelines.`
      : `Only ${k} pipeline${k === 1 ? "" : "s"} started — that's all today's shared API budget allows.`);
  }
  const pipelineIds = new Set(fresh.slice(0, k).map((s) => nameKey(s.c.companyName)));

  const now = new Date().toISOString();
  const docs = scored.map((s, i) => {
    const key = nameKey(s.c.companyName);
    const existing = leadByKey.get(key);
    const status: ProspectStatus = existing ? "already_in_pipeline" : pipelineIds.has(key) ? "queued" : "shortlisted";
    return {
      _id: nanoid(),
      orgId,
      runId,
      rank: i + 1,
      nameKey: key,
      companyName: s.c.companyName,
      segment: s.c.segment,
      city: s.c.city,
      trigger: s.c.trigger,
      triggerLabel: TRIGGERS[s.c.trigger].label,
      title: s.c.title,
      detail: s.c.detail,
      allhomeAngle: TRIGGERS[s.c.trigger].allhomeAngle,
      projectName: s.c.projectName,
      projectType: s.c.projectType,
      stage: s.c.stage,
      eventDate: s.c.date,
      sourceUrl: s.c.sourceUrl,
      sourceTitle: s.c.sourceTitle,
      dataSource: s.c.dataSource,
      triageScore: s.score,
      triageReasons: s.reasons,
      status,
      leadId: existing,
      createdAt: now,
    };
  });
  if (docs.length) await prospectsCol().insertMany(docs);
  await prospectRunsCol().updateOne({ _id: runId }, { $set: { status: "running_pipelines", found: docs.length, pipelinesPlanned: k, scanMs: Date.now() - started } });

  // 4 ─ Full pipelines for the top K, one at a time through the global queue
  for (const d of docs.filter((x) => x.status === "queued")) {
    await enqueue(() => runProspectPipeline(d._id, orgId, live));
    await prospectRunsCol().updateOne({ _id: runId }, { $inc: { pipelinesDone: 1 } });
  }
  await prospectRunsCol().updateOne({ _id: runId }, { $set: { status: "done", finishedAt: new Date().toISOString(), totalMs: Date.now() - started } });
  console.log(`🛰️  Autopilot run ${runId} (${live ? "live" : "sample"}) — ${docs.length} firms, ${k} pipelines, ${Math.round((Date.now() - started) / 1000)}s`);
}

/** Run the full 10-agent pipeline for one prospect (called by runs and on demand). */
async function runProspectPipeline(prospectId: string, orgId: string, paced: boolean): Promise<void> {
  const p = await prospectsCol().findOne({ _id: prospectId, orgId });
  if (!p || !["queued", "shortlisted", "error"].includes(String(p.status))) return;
  await prospectsCol().updateOne({ _id: prospectId }, { $set: { status: "running", pipelineStartedAt: new Date().toISOString() }, $unset: { error: "" } });
  try {
    const trigger: TriggerSignal = {
      title: String(p.title),
      category: TRIGGERS[p.trigger as TriggerType]?.signalCategory || "other",
      url: p.sourceUrl ? String(p.sourceUrl) : undefined,
      date: p.eventDate ? String(p.eventDate) : undefined,
      detail: String(p.detail || ""),
    };
    const input: TargetedInput = {
      mode: "targeted",
      companyName: String(p.companyName),
      segment: p.segment as Segment,
      projectType: (p.projectType as ProjectType) || undefined,
      projectStage: (p.stage as TargetedInput["projectStage"]) || undefined,
      projectName: p.projectName ? String(p.projectName) : undefined,
      projectCity: String(p.city),
      additionalContext: `Found by Autopilot: ${p.triggerLabel} — ${p.detail}`,
      origin: "autopilot",
      trigger,
    };
    const leads = await runLeadIngestionAgent(input, orgId);
    if (!leads.length) {
      const dup = await leadsCol().findOne({ orgId, companyName: { $regex: `^${String(p.companyName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
      await prospectsCol().updateOne({ _id: prospectId }, { $set: { status: "already_in_pipeline", leadId: dup?._id } });
      return;
    }
    const lead = leads[0];
    await prospectsCol().updateOne({ _id: prospectId }, { $set: { leadId: lead.id } });
    const result = await runPipelineSafely(lead.id, lead);
    await prospectsCol().updateOne(
      { _id: prospectId },
      result
        ? { $set: { status: "pipeline_done", score: result.intent.compositeScore, tier: result.intent.tier, channel: result.strategy.primaryChannel, finishedAt: new Date().toISOString() } }
        : { $set: { status: "error", error: "The pipeline failed — see the mission page for details" } }
    );
  } catch (err) {
    await prospectsCol().updateOne({ _id: prospectId }, { $set: { status: "error", error: String(err).slice(0, 200) } });
  }
  if (paced) await sleep(1500); // gentle on per-minute LLM rate limits
}

/** "Run pipeline" on a shortlisted firm. */
export async function runProspectOnDemand(prospectId: string, orgId: string, role: AuthCtx["role"]): Promise<void> {
  const limits = limitsFor(role);
  const p = await prospectsCol().findOne({ _id: prospectId, orgId });
  if (!p) throw new AutopilotError("Firm not found", 404);
  if (!["shortlisted", "error"].includes(String(p.status))) throw new AutopilotError(`This firm is already ${String(p.status).replace(/_/g, " ")}`, 409);
  if ((await pipelinesToday(orgId)) >= limits.maxPipelinesPerDay) throw new AutopilotError(`Daily limit reached — ${limits.maxPipelinesPerDay} Autopilot pipelines per day for this workspace`, 429);
  const live = p.dataSource === "live";
  const per = unitCosts(live).perPipeline;
  const usage = await usageToday();
  if (usage.remaining.tavily < per.tavily || usage.remaining.groq < per.groq) {
    throw new AutopilotError(`Not enough API budget left today — one pipeline needs ~${per.tavily} web searches and ~${per.groq} AI calls (${usage.remaining.tavily} searches and ${usage.remaining.groq} AI calls left).`, 429);
  }
  await prospectsCol().updateOne({ _id: prospectId }, { $set: { status: "queued" } });
  void enqueue(() => runProspectPipeline(prospectId, orgId, live));
}

// ─── Demo seed ───

/**
 * Give the shared demo workspace one finished sample run, so the Autopilot page shows
 * what a run produces before anyone spends API calls. Firms that already have a seeded
 * mission are linked to it; the rest are shortlisted (pipeline not run).
 */
export async function seedDemoAutopilot(orgId: string): Promise<void> {
  await Promise.all([prospectRunsCol().deleteMany({ orgId }), prospectsCol().deleteMany({ orgId }), autopilotCol().deleteMany({ _id: orgId })]);
  const cfg: AutopilotConfig = {
    ...(await defaultConfig(orgId)),
    triggers: [...TRIGGER_IDS],
    segments: [...PROSPECTABLE],
    cities: ["Mumbai", "Bengaluru", "Hyderabad", "Delhi"],
    firmsPerRun: 12,
    pipelinesPerRun: 3,
    lookbackDays: 30,
  };
  await saveConfig(cfg);

  const leads = await leadsCol().find({ orgId }).project({ _id: 1, companyName: 1 }).toArray();
  const leadByKey = new Map(leads.map((l) => [nameKey(String(l.companyName)), String(l._id)]));
  const startedAt = new Date(Date.now() - 2 * 3600_000).toISOString();
  const runId = nanoid();
  const scored = scanSample(cfg)
    .map((c) => ({ c, ...triage(c) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.firmsPerRun);

  // The run "picked" the top 3 firms that have a seeded mission for a full pipeline;
  // other seeded firms show as already in the workspace, the rest stay shortlisted.
  const picked = new Set(scored.filter((s) => leadByKey.has(nameKey(s.c.companyName))).slice(0, cfg.pipelinesPerRun).map((s) => nameKey(s.c.companyName)));
  scored.sort((a, b) => Number(picked.has(nameKey(b.c.companyName))) - Number(picked.has(nameKey(a.c.companyName))) || b.score - a.score);

  const docs = [];
  for (const [i, s] of scored.entries()) {
    const key = nameKey(s.c.companyName);
    const leadId = leadByKey.get(key);
    let score: number | undefined;
    let tier: string | undefined;
    if (leadId) {
      const run = await agentRunsCol().findOne({ leadId, agentNumber: 3 }, { sort: { completedAt: -1 } });
      try {
        const out = run?.output ? JSON.parse(String(run.output)) : null;
        score = out?.compositeScore;
        tier = out?.tier;
      } catch {
        /* no score */
      }
    }
    docs.push({
      _id: nanoid(), orgId, runId, rank: i + 1, nameKey: key, companyName: s.c.companyName, segment: s.c.segment, city: s.c.city,
      trigger: s.c.trigger, triggerLabel: TRIGGERS[s.c.trigger].label, title: s.c.title, detail: s.c.detail, allhomeAngle: TRIGGERS[s.c.trigger].allhomeAngle,
      projectName: s.c.projectName, projectType: s.c.projectType, stage: s.c.stage, eventDate: s.c.date, dataSource: "sample",
      triageScore: s.score, triageReasons: s.reasons,
      status: (picked.has(key) ? "pipeline_done" : leadId ? "already_in_pipeline" : "shortlisted") as ProspectStatus,
      leadId, score, tier, createdAt: startedAt,
    });
  }
  const done = docs.filter((d) => d.status === "pipeline_done").length;
  await prospectRunsCol().insertOne({
    _id: runId, orgId, by: "seed", mode: "sample", status: "done" as RunStatus,
    config: { triggers: cfg.triggers, segments: cfg.segments, cities: cfg.cities, firmsPerRun: cfg.firmsPerRun, pipelinesPerRun: cfg.pipelinesPerRun, lookbackDays: cfg.lookbackDays },
    queriesPlanned: 4, queriesDone: 4, found: docs.length, pipelinesPlanned: done, pipelinesDone: done,
    notes: [
      "Sample scan — these firms and events are fictional. No API calls were made for the scan.",
      `Full pipelines ran for the top ${done} firms only; the rest are shortlisted to save API calls. Running all ${docs.length} live would need ~${4 + docs.length * 2} web searches and ~${4 + docs.length * 7} AI calls, versus ~${4 + done * 2} and ~${4 + done * 7} for the top ${done}.`,
    ],
    startedAt, finishedAt: new Date(Date.now() - 2 * 3600_000 + 90_000).toISOString(),
  });
  if (docs.length) await prospectsCol().insertMany(docs);
}

// ─── Scheduler + recovery ───

/** Runs left "active" by a restart can never finish — mark them so the UI doesn't hang. */
export async function recoverInterruptedRuns(): Promise<void> {
  const now = new Date().toISOString();
  const r = await prospectRunsCol().updateMany({ status: { $in: ACTIVE } }, { $set: { status: "interrupted", finishedAt: now }, $push: { notes: "The server restarted during this run. Shortlisted firms can still be run on demand." } as never });
  await prospectsCol().updateMany({ status: { $in: ["queued", "running"] } }, { $set: { status: "shortlisted" } });
  if (r.modifiedCount) console.log(`🛰️  Marked ${r.modifiedCount} interrupted Autopilot run(s)`);
}

let schedulerStarted = false;
export function startScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const tick = async () => {
    try {
      const due = await autopilotCol().find({ schedule: { $in: ["daily", "weekly"] }, nextRunAt: { $lte: new Date().toISOString() } }).toArray();
      for (const cfg of due) {
        const orgId = String(cfg.orgId || cfg._id);
        const org = await orgsCol().findOne({ _id: orgId });
        const schedule = cfg.schedule as Schedule;
        // Always move the clock forward first so a failing org can't loop every minute
        await autopilotCol().updateOne({ _id: cfg._id }, { $set: { nextRunAt: nextRunTime(schedule) } });
        if (!org || org.isDemo) continue;
        try {
          await startRun(orgId, "schedule", { by: "schedule" });
        } catch (err) {
          console.warn(`🛰️  Scheduled Autopilot for ${orgId} skipped: ${err instanceof Error ? err.message : err}`);
        }
      }
    } catch (err) {
      console.warn("🛰️  Autopilot scheduler tick failed:", err);
    }
  };
  setInterval(tick, 60_000).unref();
  void tick();
}
