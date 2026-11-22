import { nanoid } from "nanoid";
import { config } from "../config.js";
import { signalsCol } from "../db/index.js";
import { sseManager } from "../lib/sse.js";
import { PROJECT_TYPES, SEGMENTS } from "../allhome/catalog.js";
import { tavilyEnabled } from "../lib/runtime.js";
import { recordUsage } from "../lib/usage.js";
import type { EnrichedLead, Signal, SignalBundle, SignalCategory, SignalStrength, TargetedInput } from "../types/index.js";

const AGENT_NUMBER = 2;
const AGENT_NAME = "Signal Scout";

interface SearchResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

// ─── Live: Tavily web search ───

async function searchTavily(query: string, lead: EnrichedLead): Promise<SearchResult[]> {
  if (!tavilyEnabled()) return simulateSignals(lead);
  try {
    recordUsage("tavily");
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: config.tavilyApiKey, query, search_depth: "advanced", max_results: 8, include_answer: false }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return simulateSignals(lead);
    const data = (await response.json()) as { results?: SearchResult[] };
    return data.results?.length ? data.results : simulateSignals(lead);
  } catch {
    return simulateSignals(lead);
  }
}

// ─── Simulation: industry-specific signal pools ───

function simulateSignals(lead: EnrichedLead): SearchResult[] {
  const firm = lead.companyName;
  const city = lead.projectCity || "Mumbai";
  const project = lead.projectName || "a new premium project";
  const where = lead.projectName?.includes(",") ? "" : ` in ${city}`;
  const poss = firm.endsWith("s") ? `${firm}'` : `${firm}'s`;
  const type = lead.projectType ? PROJECT_TYPES[lead.projectType].toLowerCase() : "premium project";
  const hash = Math.abs(firm.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
  const pick = <T>(arr: T[], o = 0): T => arr[(hash + o) % arr.length];
  const now = Date.now();

  const pools: Record<string, Array<{ title: string; content: string }>> = {
    launch: [
      { title: `${firm} unveils ${project}${where}`, content: `${firm} has unveiled ${project}, a ${type}${where}. Early drawings show a facade-led design with large glazed openings and a curated material palette, with construction slated to begin this quarter.` },
      { title: `New RERA registration linked to ${firm}: ${type} in ${city}`, content: `A new RERA registration associated with ${firm} lists a ${type} in ${city}. The filing indicates premium specifications for envelope, lighting and bath fittings.` },
    ],
    award: [
      { title: `${firm} shortlisted for a residential design award`, content: `${poss} recent ${type} work has been shortlisted in an industry design awards programme, recognised for material honesty, daylighting and detailing.` },
      { title: `${poss} latest project featured in a design publication`, content: `A design publication featured ${poss} recent project, highlighting its parametric screen facade, warm architectural lighting and bespoke joinery.` },
    ],
    hiring: [
      { title: `${firm} is hiring architects and interior designers in ${city}`, content: `${firm} has posted multiple openings for project architects and interior designers in ${city}, signalling a growing project pipeline over the next 12 months.` },
    ],
    possession: [
      { title: `${project}: interiors phase begins as structure tops out`, content: `The structure for ${project} has topped out and the project is moving into MEP and interiors. This is when lighting, bath and hardware get specified.` },
      { title: `Possession timeline announced for ${project}`, content: `Handover for ${project} is planned within the next few quarters; fit-out and finishing packages are being tendered.` },
    ],
    exhibition: [
      { title: `${firm} team visited the Design POV exhibition`, content: `Members of ${firm} were seen at the Design POV exhibition exploring facade systems, architectural lighting and luxury bathware, which points to active material sourcing.` },
    ],
    office: [
      { title: `${firm} opens a new studio in ${city}`, content: `${firm} has opened a new studio in ${city} to serve a growing book of premium residential and hospitality clients.` },
    ],
  };

  const order =
    lead.segment === "developer"
      ? ["launch", "possession", "hiring", "award"]
      : lead.segment === "homeowner"
        ? ["possession", "exhibition", "launch"]
        : ["launch", "award", "exhibition", "hiring", "office", "possession"];

  const days = [2, 6, 11, 17, 26];
  const domains = ["archdaily.com", "architecturaldigest.in", "rera.gov.in", "linkedin.com", "designpov.in", "economictimes.com"];
  return order.slice(0, 5).map((key, i) => {
    const s = pick(pools[key], i);
    return {
      ...s,
      url: `https://${pick(domains, i * 2)}/${firm.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${key}`,
      published_date: new Date(now - days[i] * 86_400_000).toISOString(),
    };
  });
}

// ─── Classification ───

const RULES: Array<{ category: SignalCategory; strength: SignalStrength; keywords: string[] }> = [
  { category: "project_launch", strength: "HIGH", keywords: ["unveil", "rera", "new project", "launch", "construction slated", "drawings"] },
  { category: "possession_milestone", strength: "HIGH", keywords: ["tops out", "topped out", "possession", "handover", "interiors phase", "tendered", "fit-out"] },
  { category: "exhibition", strength: "HIGH", keywords: ["exhibition", "design pov", "sourcing", "trade show"] },
  { category: "award_publication", strength: "MEDIUM", keywords: ["award", "shortlisted", "featured", "publication", "recognised"] },
  { category: "hiring_spike", strength: "MEDIUM", keywords: ["hiring", "openings", "open positions", "we're hiring"] },
  { category: "office_opening", strength: "MEDIUM", keywords: ["opens a new studio", "new office", "new studio", "expands"] },
  { category: "funding", strength: "MEDIUM", keywords: ["raised", "funding", "investment"] },
];

function classifySignal(r: SearchResult): { category: SignalCategory; strength: SignalStrength } {
  const text = `${r.title} ${r.content}`.toLowerCase();
  let best: { category: SignalCategory; strength: SignalStrength; score: number } | null = null;
  for (const rule of RULES) {
    const score = rule.keywords.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { ...rule, score };
  }
  return best ? { category: best.category, strength: best.strength } : { category: "other", strength: "LOW" };
}

function safeHostname(url: string | undefined): string {
  if (!url) return "web";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

function recency(dateStr?: string): { recencyDays: number; weight: number } {
  if (!dateStr) return { recencyDays: 30, weight: 0.3 };
  const days = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000));
  return { recencyDays: days, weight: Math.round(Math.exp(-days / 15) * 100) / 100 };
}

function overallStrength(signals: Signal[]): SignalStrength {
  const high = signals.filter((s) => s.strength === "HIGH").length;
  const med = signals.filter((s) => s.strength === "MEDIUM").length;
  if (high >= 2) return "HIGH";
  if (high >= 1 || med >= 2) return "MEDIUM";
  return "LOW";
}

function activityScore(lead: EnrichedLead): number {
  const base: Record<string, number> = { architect: 72, id_firm: 78, developer: 55, contractor: 45, homeowner: 35 };
  const h = Math.abs((lead.companyName + lead.contactName).split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0));
  return Math.min(100, Math.max(0, (base[lead.segment || "architect"] ?? 50) + (h % 25) - 10));
}

// ─── Main ───

export async function runSignalScoutAgent(lead: EnrichedLead): Promise<SignalBundle> {
  const start = Date.now();
  sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "running");
  try {
    const segmentLabel = lead.segment ? SEGMENTS[lead.segment].label : "architect";
    let signals: Signal[];

    if (lead.dataSource === "live") {
      // Real firm → only real, sourced signals from the live research (never simulated news)
      const strengthOf: Record<string, SignalStrength> = {
        project_launch: "HIGH", possession_milestone: "HIGH", exhibition: "HIGH", award_publication: "MEDIUM",
        office_opening: "MEDIUM", hiring_spike: "MEDIUM", funding: "MEDIUM", partnership: "MEDIUM", other: "LOW",
      };
      signals = (lead.research?.signals || []).map((sig) => {
        const { recencyDays, weight } = recency(sig.date || undefined);
        const category = (sig.category in strengthOf ? sig.category : "other") as SignalCategory;
        return {
          id: nanoid(),
          category,
          title: sig.title,
          description: (sig.detail || sig.title).slice(0, 300),
          source: safeHostname(sig.url),
          sourceUrl: sig.url,
          dateDetected: sig.date || new Date().toISOString(),
          recencyDays: sig.date ? recencyDays : 60,
          dateUnknown: !sig.date,
          strength: strengthOf[category] || "LOW",
          recencyWeight: sig.date ? weight : 0.4,
        };
      });
    } else {
    const query = `"${lead.companyName}" ${segmentLabel} ${lead.projectCity || ""} new project OR award OR launch OR possession 2026`;
    // Fictional sample firms always get simulated signals (no real searches about made-up firms)
    const results = (lead.dataSource === "simulated" ? simulateSignals(lead) : await searchTavily(query, lead)).filter((r) => r?.title && r?.content);

    signals = results.map((r) => {
      const { category, strength } = classifySignal(r);
      const { recencyDays, weight } = recency(r.published_date);
      return {
        id: nanoid(),
        category,
        title: r.title,
        description: r.content.slice(0, 300),
        // Fictional firms get fictional signals: never attribute them to a real website
        source: lead.dataSource === "simulated" ? "Sample data (fictional)" : safeHostname(r.url),
        sourceUrl: lead.dataSource === "simulated" ? undefined : r.url,
        dateDetected: r.published_date || new Date().toISOString(),
        recencyDays,
        strength,
        recencyWeight: weight,
      };
    });
    }

    // Autopilot: the event that surfaced this firm is the freshest, most relevant signal
    const trigger = (lead.rawInput as TargetedInput | undefined)?.trigger;
    if (trigger?.title && !signals.some((s) => (trigger.url && s.sourceUrl === trigger.url) || s.title === trigger.title)) {
      const { recencyDays, weight } = recency(trigger.date);
      signals.unshift({
        id: nanoid(),
        category: trigger.category as SignalCategory,
        title: trigger.title,
        description: (trigger.detail || trigger.title).slice(0, 300),
        source: trigger.url ? safeHostname(trigger.url) : "Autopilot (sample)",
        sourceUrl: trigger.url,
        dateDetected: trigger.date || new Date().toISOString(),
        recencyDays: trigger.date ? recencyDays : 14,
        strength: "HIGH",
        // Always ranked first — it's why this firm was picked, so Touch 1 should open with it
        recencyWeight: Math.min(1, Math.max((trigger.date ? weight : 0.8) + 0.05, ...signals.map((s) => s.recencyWeight + 0.01))),
      });
    }
    signals.sort((a, b) => b.recencyWeight - a.recencyWeight);

    // Social activity is only estimated for fictional demo leads; unknown (0) for real firms
    const linkedinActivityScore = lead.dataSource === "live" ? 0 : activityScore(lead);
    if (linkedinActivityScore > 60 && lead.segment !== "homeowner" && lead.dataSource !== "live") {
      signals.push({
        id: nanoid(),
        category: "linkedin_activity",
        title: `${lead.contactName} actively shares project work on LinkedIn / Instagram`,
        description: `Social activity score ${linkedinActivityScore}/100. Regularly posts site progress and material choices.`,
        source: "Sample data (fictional)",
        sourceUrl: undefined,
        dateDetected: new Date().toISOString(),
        recencyDays: 0,
        strength: linkedinActivityScore > 75 ? "HIGH" : "MEDIUM",
        recencyWeight: linkedinActivityScore > 75 ? 0.9 : 0.6,
      });
    }

    const bundle: SignalBundle = {
      leadId: lead.id,
      signals,
      topSignal: signals[0] || null,
      linkedinActivityScore,
      overallSignalStrength: overallStrength(signals),
      generatedAt: new Date().toISOString(),
    };

    if (signals.length) {
      await signalsCol().insertMany(signals.map((s) => ({ ...s, _id: s.id, leadId: lead.id, createdAt: new Date().toISOString() })));
    }

    const summary = `Found ${signals.length} signals. Top: ${bundle.topSignal?.title || "None"} (${bundle.overallSignalStrength})`;
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "complete", summary);
    sseManager.emit("signal_update", lead.id, bundle);
    console.log(`✅ Agent 2 complete in ${Date.now() - start}ms, ${summary}`);
    return bundle;
  } catch (error) {
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "error", undefined, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
