/**
 * Live firm research — READ-ONLY information retrieval.
 *
 *   Tavily  → web + news search about the firm
 *   Groq    → extracts a structured profile, strictly from the retrieved text
 *   Apollo  → company enrichment when the key/plan allows it (degrades gracefully)
 *
 * Nothing here sends a message. Facts that aren't in the sources are left empty —
 * we never invent contacts, projects or news about a real firm.
 */
import { config } from "../config.js";
import { llmEnabled, llmGenerateText } from "../lib/llm.js";
import { tavilyEnabled, apolloEnabled } from "../lib/runtime.js";
import { SEGMENTS, normalizeCity, type Segment } from "../allhome/catalog.js";
import { guardCall, recordFailure, recordUsage } from "../lib/usage.js";

export type SignalCategoryLive =
  | "project_launch" | "award_publication" | "possession_milestone" | "exhibition"
  | "office_opening" | "hiring_spike" | "funding" | "partnership" | "other";

export interface ResearchSignal {
  title: string;
  category: SignalCategoryLive;
  url?: string;
  date?: string;
  detail?: string;
}

export interface FirmResearch {
  status: "found" | "partial" | "not_found" | "unavailable";
  query: string;
  website?: string;
  domain?: string;
  summary?: string;
  city?: string;
  specialties: string[];
  notableProjects: string[];
  principals: Array<{ name: string; title?: string }>;
  teamSize?: string;
  founded?: string;
  signals: ResearchSignal[];
  sources: Array<{ title: string; url: string }>;
  apollo: { status: "ok" | "unavailable" | "skipped"; note?: string; employees?: number; industry?: string; linkedin?: string };
  providers: string[];
  researchedAt: string;
}

export interface TavilyResult { title: string; url: string; content: string; published_date?: string; score?: number }

const cache = new Map<string, { at: number; value: FirmResearch }>();
const TTL = 60 * 60_000;

export async function tavily(query: string, opts: { topic?: "general" | "news"; days?: number; max?: number } = {}): Promise<{ results: TavilyResult[]; answer?: string }> {
  guardCall("tavily");
  recordUsage("tavily");
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.tavilyApiKey,
      query,
      search_depth: "basic",
      topic: opts.topic || "general",
      ...(opts.days ? { days: opts.days } : {}),
      max_results: opts.max || 6,
      include_answer: opts.topic !== "news",
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch((e) => {
    recordFailure("tavily", e, "research continues without these results");
    throw e;
  });
  if (!res.ok) {
    const err = new Error(`Tavily HTTP ${res.status}${res.status === 429 || res.status === 432 ? " (quota or rate limit)" : ""}`);
    recordFailure("tavily", err, "research continues without these results");
    throw err;
  }
  const data = (await res.json()) as { results?: TavilyResult[]; answer?: string };
  return { results: data.results || [], answer: data.answer };
}

function domainOf(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/** Words that identify the firm (ignores generic words like "architects", "studio"). */
function nameTokens(name: string): string[] {
  const generic = /^(the|and|&|architects?|architecture|studio|design|designs|interiors?|associates|developers?|realty|group|pvt|ltd|llp|private|limited|india|co|company|projects?|consultants?)$/i;
  return name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !generic.test(t));
}

function relevant(r: TavilyResult, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const text = `${r.title} ${r.url} ${r.content}`.toLowerCase();
  return tokens.every((t) => text.includes(t));
}

const AGGREGATORS = /(linkedin|facebook|instagram|justdial|indiamart|glassdoor|zaubacorp|tofler|crunchbase|tracxn|houzz|wikipedia|youtube|tavily|e-architect|archdaily|dezeen|architecturaldigest|designboom)\./i;

async function apolloOrg(domain: string): Promise<FirmResearch["apollo"]> {
  try {
    guardCall("apollo");
    recordUsage("apollo");
    const res = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`, {
      headers: { "X-Api-Key": config.apolloApiKey, "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { organization?: { estimated_num_employees?: number; industry?: string; linkedin_url?: string }; error?: string; message?: string };
    if (!res.ok || !data.organization) {
      const msg = String(data.error || data.message || `HTTP ${res.status}`);
      return { status: "unavailable", note: /free plan|not authorized|scope/i.test(msg) ? "Apollo key/plan doesn't include company enrichment" : msg.slice(0, 120) };
    }
    return { status: "ok", employees: data.organization.estimated_num_employees, industry: data.organization.industry, linkedin: data.organization.linkedin_url };
  } catch (e) {
    if (!(e instanceof Error && e.name === "QuotaGuardError")) recordFailure("apollo", e, "research without Apollo data");
    return { status: "unavailable", note: String(e).slice(0, 120) };
  }
}

const EXTRACT_SYSTEM = `You build factual B2B profiles of Indian architecture, interior design, real-estate and construction firms from web search results.
Rules:
- Use ONLY facts explicitly stated in the provided sources. If something is not stated, use null or [].
- Never guess emails, phone numbers, team sizes or project names.
- "signals" are concrete, dated-or-recent events about THIS firm (new project, award, publication, new office, hiring, launch, possession/handover). Skip generic "about us" text.
- Keep summary to 2 factual sentences.
Return ONLY JSON:
{"website": string|null, "summary": string|null, "city": string|null, "specialties": string[], "notableProjects": string[], "principals": [{"name": string, "title": string|null}], "teamSize": string|null, "founded": string|null,
 "signals": [{"title": string, "category": "project_launch"|"award_publication"|"possession_milestone"|"exhibition"|"office_opening"|"hiring_spike"|"funding"|"partnership"|"other", "url": string|null, "date": string|null, "detail": string|null}]}`;

export async function researchFirm(firmName: string, opts: { city?: string; segment?: Segment } = {}): Promise<FirmResearch> {
  const key = `${firmName.toLowerCase()}|${opts.city || ""}|${opts.segment || ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const segmentLabel = opts.segment ? SEGMENTS[opts.segment].label.replace("Real-Estate ", "").replace(" Firm", "") : "";
  const query = `${firmName} ${segmentLabel} ${opts.city || ""}`.replace(/\s+/g, " ").trim();
  const base: FirmResearch = {
    status: "unavailable", query, specialties: [], notableProjects: [], principals: [], signals: [], sources: [],
    apollo: { status: "skipped" }, providers: [], researchedAt: new Date().toISOString(),
  };
  if (!tavilyEnabled()) return base;

  const tokens = nameTokens(firmName);
  let web: TavilyResult[] = [];
  let news: TavilyResult[] = [];
  let answer: string | undefined;
  try {
    const [w, n] = await Promise.all([
      tavily(query, { max: 6 }),
      tavily(`"${firmName}" ${opts.city || ""} project OR award OR launch OR office`, { topic: "news", days: 540, max: 5 }).catch(() => ({ results: [] as TavilyResult[], answer: undefined })),
    ]);
    web = w.results.filter((r) => relevant(r, tokens));
    news = n.results.filter((r) => relevant(r, tokens));
    answer = w.answer;
  } catch (e) {
    return { ...base, status: "unavailable", sources: [], providers: [`Tavily error: ${String(e).slice(0, 80)}`] };
  }

  const all = [...web, ...news];
  const result: FirmResearch = {
    ...base,
    status: all.length ? "partial" : "not_found",
    providers: ["Tavily"],
    sources: all.slice(0, 8).map((r) => ({ title: r.title.slice(0, 140), url: r.url })),
  };
  if (!all.length) {
    cache.set(key, { at: Date.now(), value: result });
    return result;
  }

  // Likely official website: first relevant non-aggregator result
  const official = web.find((r) => !AGGREGATORS.test(r.url));
  result.website = official ? `https://${domainOf(official.url)}` : undefined;
  result.domain = domainOf(result.website);

  if (llmEnabled()) {
    try {
      const corpus = all
        .slice(0, 9)
        .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}${r.published_date ? `\nDate: ${r.published_date}` : ""}\n${r.content.slice(0, 700)}`)
        .join("\n\n");
      const out = await llmGenerateText(EXTRACT_SYSTEM, `Firm: ${firmName}${opts.city ? ` (${opts.city})` : ""}\n${answer ? `Search summary: ${answer}\n` : ""}\nSources:\n${corpus}`);
      const m = out.match(/\{[\s\S]*\}/);
      if (m) {
        const p = JSON.parse(m[0]) as Record<string, unknown>;
        const strs = (v: unknown, n: number) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean).slice(0, n) : []);
        result.summary = typeof p.summary === "string" ? p.summary : answer;
        result.city = normalizeCity(String(p.city || "")) || (typeof p.city === "string" ? p.city : undefined);
        result.specialties = strs(p.specialties, 5);
        result.notableProjects = strs(p.notableProjects, 5);
        result.principals = Array.isArray(p.principals)
          ? (p.principals as Array<{ name?: string; title?: string }>).filter((x) => x?.name).slice(0, 3).map((x) => ({ name: String(x.name), title: x.title ? String(x.title) : undefined }))
          : [];
        result.teamSize = typeof p.teamSize === "string" ? p.teamSize : undefined;
        result.founded = p.founded ? String(p.founded) : undefined;
        if (typeof p.website === "string" && domainOf(p.website) && !AGGREGATORS.test(p.website)) {
          result.website = `https://${domainOf(p.website)}`;
          result.domain = domainOf(p.website);
        }
        result.signals = Array.isArray(p.signals)
          ? (p.signals as ResearchSignal[]).filter((s) => s?.title).slice(0, 6).map((s) => ({ ...s, title: String(s.title).slice(0, 160) }))
          : [];
        result.providers.push("Groq");
      }
    } catch {
      /* fall back to heuristics below */
    }
  }
  if (!result.summary) result.summary = answer;
  if (result.signals.length === 0) {
    result.signals = news.slice(0, 4).map((r) => ({ title: r.title.slice(0, 160), category: "other" as const, url: r.url, date: r.published_date, detail: r.content.slice(0, 200) }));
  }

  if (result.domain && apolloEnabled()) {
    result.apollo = await apolloOrg(result.domain);
    if (result.apollo.status === "ok") result.providers.push("Apollo");
  }

  result.status = result.summary || result.specialties.length || result.principals.length ? "found" : "partial";
  cache.set(key, { at: Date.now(), value: result });
  return result;
}

// ─── Live discovery: find REAL firms from search results (never from model memory) ───

export interface DiscoveredFirm {
  companyName: string;
  city: string;
  reason: string;
  sourceUrl: string;
}

const DISCOVER_SYSTEM = `You extract names of Indian architecture / interior-design / real-estate / construction FIRMS from web search results.
Rules:
- Only return firm names that appear verbatim in the provided sources. Never add firms from memory.
- Firms only, no people, no publications, no directories, no award bodies.
- "reason" is one factual clause from the source (e.g. "listed among top luxury residential architects in Mumbai").
Return ONLY a JSON array: [{"companyName": string, "city": string|null, "reason": string, "source": number}] where "source" is the [n] index of the source.`;

export async function discoverRealFirms(segment: Segment, cities: string[], max: number): Promise<DiscoveredFirm[]> {
  if (!tavilyEnabled() || !llmEnabled()) return [];
  const label = SEGMENTS[segment].label.toLowerCase();
  const targets = (cities.length ? cities : ["Mumbai", "Bengaluru", "Delhi"]).slice(0, 4);
  const found: DiscoveredFirm[] = [];
  const seen = new Set<string>();

  for (const city of targets) {
    if (found.length >= max) break;
    let results: TavilyResult[] = [];
    try {
      results = (await tavily(`top luxury ${label} firms in ${city} India premium residential hospitality projects`, { max: 8 })).results;
    } catch {
      continue;
    }
    if (!results.length) continue;
    const corpus = results.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content.slice(0, 900)}`).join("\n\n");
    const haystack = results.map((r) => `${r.title} ${r.content}`).join(" ").toLowerCase();
    try {
      const out = await llmGenerateText(DISCOVER_SYSTEM, `Segment: ${SEGMENTS[segment].label}\nCity: ${city}\n\nSources:\n${corpus}`);
      const m = out.match(/\[[\s\S]*\]/);
      if (!m) continue;
      const parsed = JSON.parse(m[0]) as Array<{ companyName?: string; city?: string; reason?: string; source?: number }>;
      for (const p of parsed) {
        const name = String(p.companyName || "").trim();
        // Hallucination guard: the firm name must literally appear in the retrieved text
        if (!name || name.length < 3 || !haystack.includes(name.toLowerCase())) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const src = results[Math.max(0, Math.min(results.length - 1, Number(p.source || 1) - 1))];
        found.push({ companyName: name, city: normalizeCity(String(p.city || "")) || city, reason: String(p.reason || "").slice(0, 200), sourceUrl: src.url });
        if (found.length >= max) break;
      }
    } catch {
      /* skip this city */
    }
  }
  return found;
}
