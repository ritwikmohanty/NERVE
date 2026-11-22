import { nanoid } from "nanoid";
import { config } from "../config.js";
import { leadsCol } from "../db/index.js";
import { sseManager } from "../lib/sse.js";
import { llmEnabled } from "../lib/llm.js";
import { liveResearchEnabled } from "../lib/runtime.js";
import { guardCall, recordFailure, recordUsage } from "../lib/usage.js";
import { researchFirm, discoverRealFirms } from "../research/firm.js";
import { normalizeCity, PROJECT_TYPES, SEGMENTS, type ProjectStage, type ProjectType, type Segment } from "../allhome/catalog.js";
import type { TargetedInput, DiscoveryInput, EnrichedLead, LeadInput } from "../types/index.js";

const AGENT_NUMBER = 1;
const AGENT_NAME = "Lead Ingestion";

// ─── Deterministic helpers ───

function hashOf(str: string): number {
  return Math.abs(str.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
}
function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length];
}
function slug(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "").slice(0, 24) || "firm";
}

const FIRST = ["Aarav", "Meera", "Kabir", "Ishita", "Rohan", "Ananya", "Vikram", "Naina", "Arjun", "Tara", "Dev", "Rhea", "Siddhant", "Kavya", "Neel", "Zoya"];
const LAST = ["Mehta", "Kapoor", "Rao", "Iyer", "Desai", "Malhotra", "Shetty", "Bose", "Khanna", "Pillai", "Joshi", "Sethi", "Nair", "Ahuja", "Reddy", "Bhatt"];

const TITLES: Record<Segment, string[]> = {
  architect: ["Principal Architect", "Founding Partner", "Design Director", "Senior Associate Architect"],
  id_firm: ["Principal Interior Designer", "Founder & Creative Director", "Design Lead", "Senior Interior Architect"],
  developer: ["Head of Procurement", "Director, Projects", "VP Design & Development", "Chief Projects Officer"],
  contractor: ["Managing Director", "Head of Execution", "Project Director", "Procurement Manager"],
  homeowner: ["Homeowner", "Homeowner", "Homeowner", "Homeowner"],
};

const SPECIALTIES: Record<Segment, string[][]> = {
  architect: [["Luxury residences", "Facade-led design"], ["Hospitality", "Climate-responsive design"], ["Villas", "Courtyard planning"], ["Mixed-use", "Parametric facades"]],
  id_firm: [["Luxury apartments", "Bespoke joinery"], ["Boutique hotels", "Lighting design"], ["Villas", "Material-led interiors"], ["Workplaces", "Modular interiors"]],
  developer: [["Premium residential towers"], ["Branded residences", "Villa communities"], ["Grade-A offices"], ["Luxury low-rise"]],
  contractor: [["Turnkey interiors"], ["Facade & envelope execution"], ["PMC for premium residential"], ["Hospitality fit-outs"]],
  homeowner: [["New villa build"], ["Apartment renovation"], ["Weekend home"], ["Penthouse fit-out"]],
};

const DEFAULT_PROJECT_TYPE: Record<Segment, ProjectType[]> = {
  architect: ["villa", "hospitality", "apartment_tower", "office"],
  id_firm: ["premium_apartment", "villa", "hospitality", "office"],
  developer: ["apartment_tower", "premium_apartment", "villa", "office"],
  contractor: ["apartment_tower", "office", "hospitality", "villa"],
  homeowner: ["villa", "premium_apartment"],
};

const STAGE_BY_SEGMENT: Record<Segment, ProjectStage[]> = {
  architect: ["design", "structure", "design", "mep"],
  id_firm: ["fitout", "mep", "fitout", "finishing"],
  developer: ["structure", "design", "mep", "structure"],
  contractor: ["mep", "fitout", "structure", "fitout"],
  homeowner: ["structure", "fitout", "finishing", "handover"],
};

const LOCALITIES: Record<string, string[]> = {
  Mumbai: ["Juhu", "Worli", "Bandra West", "Powai", "Alibaug"],
  Delhi: ["Vasant Vihar", "Golf Links", "Chhatarpur", "Sainik Farms"],
  Bengaluru: ["Indiranagar", "Whitefield", "Sadashivnagar", "Devanahalli"],
  Hyderabad: ["Jubilee Hills", "Banjara Hills", "Kokapet", "Gachibowli"],
  Pune: ["Koregaon Park", "Baner", "Kalyani Nagar"],
  Chennai: ["Adyar", "Boat Club", "ECR"],
  Jaipur: ["C-Scheme", "Jagatpura", "Vaishali Nagar"],
  Kolkata: ["Ballygunge", "New Town", "Alipore"],
};

export function inferSegment(title?: string, firmName?: string): Segment | undefined {
  const t = `${title || ""} ${firmName || ""}`.toLowerCase();
  if (/homeowner|owner|residence of|\bhome\b|\bvilla\b/.test(t)) return "homeowner";
  if (/develop|realty|estates|builder|properties|infra/.test(t)) return "developer";
  if (/contract|pmc|execution|turnkey|projects\b/.test(t)) return "contractor";
  if (/interior|decor|\bid\b/.test(t)) return "id_firm";
  if (/architect|atelier|studio/.test(t)) return "architect";
  return undefined;
}

function inferSeniority(title?: string): EnrichedLead["seniority"] | undefined {
  if (!title) return undefined;
  const t = title.toLowerCase();
  if (/chief|founder|principal|managing director|owner|partner/.test(t)) return "C-Level";
  if (/\bvp\b|vice president|director/.test(t)) return "VP";
  if (/head of|lead/.test(t)) return "Director";
  if (/manager|associate/.test(t)) return "Manager";
  return undefined;
}

// ─── Simulated enrichment (fictional firm profile) ───

interface Enrichment {
  companyDomain: string;
  companySize: string;
  industry: string;
  headquarters: string;
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  seniority?: EnrichedLead["seniority"];
  firmType: string;
  portfolio: string[];
  projectsPerYear: number;
  specialties: string[];
}

function simulateEnrichment(firmName: string, segment: Segment, city: string, contactName?: string, contactTitle?: string): Enrichment {
  const h = hashOf(firmName + segment);
  const name = contactName || `${pick(FIRST, h)} ${pick(LAST, h, 5)}`;
  const title = contactTitle || pick(TITLES[segment], h, 2);
  const domainBase = slug(firmName);
  const sizes: Record<Segment, string[]> = {
    architect: ["11-50", "11-50", "51-200"],
    id_firm: ["1-10", "11-50", "11-50"],
    developer: ["201-500", "501-1000", "1000+"],
    contractor: ["51-200", "201-500", "51-200"],
    homeowner: ["1-10", "1-10", "1-10"],
  };
  const localities = LOCALITIES[city] || ["City Centre", "Suburbs"];
  const portfolio = [0, 1, 2].map(
    (i) => `${pick(["The", "Casa", "House", "Villa", "One", "Residence"], h, i)} ${pick(["Banyan", "Aranya", "Saanjh", "Meher", "Kesar", "Nimbus", "Vistara", "Orchid"], h, i * 3)}, ${pick(localities, h, i)}`
  );

  return {
    companyDomain: segment === "homeowner" ? "" : `${domainBase}.example`,
    companySize: pick(sizes[segment], h),
    industry: segment === "homeowner" ? "Premium Homeowner" : `${SEGMENTS[segment].label} (Premium)`,
    headquarters: `${pick(localities, h, 1)}, ${city}`,
    contactName: name,
    contactTitle: title,
    // `.example` is a reserved TLD — simulated contacts can never receive real mail
    contactEmail: `${name.toLowerCase().split(" ")[0]}@${segment === "homeowner" ? "home" : domainBase}.example`,
    contactPhone: `+91-00000-${String(10000 + (h % 89999)).slice(0, 5)}`, // deliberately invalid number: a fictional lead can never reach a real phone
    contactLinkedIn: segment === "homeowner" ? "" : `https://linkedin.com/in/${slug(name)}-sample`,
    seniority: segment === "homeowner" ? undefined : inferSeniority(title),
    firmType: SEGMENTS[segment].label,
    portfolio: segment === "homeowner" ? [] : portfolio,
    projectsPerYear: segment === "developer" ? 3 + (h % 5) : segment === "homeowner" ? 1 : 8 + (h % 20),
    specialties: pick(SPECIALTIES[segment], h),
  };
}

function defaultProject(firmName: string, segment: Segment, city: string, input: Partial<TargetedInput>) {
  const h = hashOf(firmName + "project");
  const projectType: ProjectType = input.projectType || pick(DEFAULT_PROJECT_TYPE[segment], h);
  const projectStage: ProjectStage = input.projectStage || pick(STAGE_BY_SEGMENT[segment], h, 1);
  const localities = LOCALITIES[city] || ["City Centre"];
  const values: Record<ProjectType, string[]> = {
    villa: ["₹6 Cr", "₹9 Cr", "₹14 Cr"],
    premium_apartment: ["₹3.5 Cr", "₹5 Cr", "₹8 Cr"],
    apartment_tower: ["₹180 Cr", "₹320 Cr", "₹450 Cr"],
    hospitality: ["₹60 Cr", "₹110 Cr", "₹200 Cr"],
    office: ["₹40 Cr", "₹75 Cr", "₹120 Cr"],
    retail: ["₹8 Cr", "₹15 Cr", "₹25 Cr"],
  };
  return {
    projectType,
    projectStage,
    projectName: input.projectName || `${PROJECT_TYPES[projectType].split(" / ")[0]}, ${pick(localities, h)}`,
    projectCity: city,
    projectValue: input.projectValue || pick(values[projectType], h),
    budgetTier: input.budgetTier || (projectType === "villa" || projectType === "hospitality" ? "luxury" : "premium"),
  } as const;
}

// ─── Live enrichment (Apollo) — falls back to simulation ───

async function enrichViaApollo(firmName: string, segment: Segment, city: string, contactName?: string, contactTitle?: string): Promise<Enrichment> {
  const sim = simulateEnrichment(firmName, segment, city, contactName, contactTitle);
  if (config.simulationMode || !config.apolloApiKey || segment === "homeowner") return sim;
  try {
    guardCall("apollo");
    recordUsage("apollo");
    const response = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": config.apolloApiKey },
      body: JSON.stringify({ q_organization_name: firmName, q_person_name: contactName || undefined, per_page: 1 }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      recordFailure("apollo", `Apollo HTTP ${response.status}`, "sample enrichment");
      return sim;
    }
    const data = (await response.json()) as {
      people?: Array<{ name?: string; title?: string; email?: string; linkedin_url?: string; organization?: { website_url?: string } }>;
    };
    const person = data.people?.[0];
    if (!person) return sim;
    return {
      ...sim,
      contactName: person.name || sim.contactName,
      contactTitle: person.title || sim.contactTitle,
      contactEmail: person.email || sim.contactEmail,
      contactLinkedIn: person.linkedin_url || sim.contactLinkedIn,
      companyDomain: person.organization?.website_url || sim.companyDomain,
      seniority: inferSeniority(person.title) || sim.seniority,
    };
  } catch {
    return sim;
  }
}

// ─── Discovery: find specifier firms by segment / city ───

/** Clearly fictional sample firms used in simulation (and when no LLM key is set). */
export const SAMPLE_FIRMS: Array<{ name: string; segment: Segment; city: string }> = [
  { name: "Studio Kaarva Architects", segment: "architect", city: "Mumbai" },
  { name: "Monsoon House Architects", segment: "architect", city: "Bengaluru" },
  { name: "Lumen Row Architects", segment: "architect", city: "Hyderabad" },
  { name: "Sthapati Collective", segment: "architect", city: "Delhi" },
  { name: "Atelier Nirvaan", segment: "architect", city: "Jaipur" },
  { name: "Ochre & Oak Interiors", segment: "id_firm", city: "Mumbai" },
  { name: "Kosha Design Studio", segment: "id_firm", city: "Delhi" },
  { name: "Aster Lane Interiors", segment: "id_firm", city: "Bengaluru" },
  { name: "Indigo Courtyard Designs", segment: "id_firm", city: "Hyderabad" },
  { name: "Tarang Interiors", segment: "id_firm", city: "Pune" },
  { name: "Meridian Habitat Developers", segment: "developer", city: "Mumbai" },
  { name: "Banyan Grove Realty", segment: "developer", city: "Bengaluru" },
  { name: "Saffron Edge Developers", segment: "developer", city: "Hyderabad" },
  { name: "Granite Peak Estates", segment: "developer", city: "Delhi" },
  { name: "Prism Build PMC", segment: "contractor", city: "Mumbai" },
  { name: "Ironbark Turnkey Contracting", segment: "contractor", city: "Delhi" },
  { name: "Northlight Projects", segment: "contractor", city: "Chennai" },
  { name: "The Rao Residence", segment: "homeowner", city: "Hyderabad" },
  { name: "The Khanna Villa", segment: "homeowner", city: "Delhi" },
  { name: "The Iyer Home", segment: "homeowner", city: "Chennai" },
  // Used by Autopilot's sample scan (fictional — never researched live)
  { name: "Vastu Verde Developers", segment: "developer", city: "Pune" },
  { name: "Tidewater Realty", segment: "developer", city: "Chennai" },
  { name: "Ferrous Line Architects", segment: "architect", city: "Pune" },
  { name: "Halden & Rao Architects", segment: "architect", city: "Chennai" },
  { name: "Kiln & Clay Interiors", segment: "id_firm", city: "Jaipur" },
  { name: "Studio Anvaya", segment: "id_firm", city: "Kolkata" },
  { name: "Arcadia Fitouts", segment: "contractor", city: "Bengaluru" },
  { name: "Saltpan Hospitality Studio", segment: "architect", city: "Mumbai" },
];

interface DiscoveryRec {
  companyName: string;
  segment: Segment;
  city: string;
  reason: string;
}

function simulateDiscovery(input: DiscoveryInput): DiscoveryRec[] {
  const max = input.maxResults || 5;
  const cities = (input.cities || []).map((c) => normalizeCity(c) || c);
  const bySegment = SAMPLE_FIRMS.filter((f) => !input.segment || f.segment === input.segment);
  const inCity = bySegment.filter((f) => cities.length === 0 || cities.includes(f.city));
  const pool = [...inCity, ...bySegment.filter((f) => !inCity.includes(f))];
  return (pool.length ? pool : SAMPLE_FIRMS).slice(0, max).map((f) => ({
    companyName: f.name,
    segment: f.segment,
    city: f.city,
    reason: `${SEGMENTS[f.segment].label} in ${f.city} with an active premium pipeline: a strong specifier for AllHome brands.`,
  }));
}

async function discoverFirms(input: DiscoveryInput): Promise<DiscoveryRec[]> {
  // Without live research we only ever use clearly fictional sample firms.
  if (!liveResearchEnabled() || !llmEnabled()) return simulateDiscovery(input);
  const segment = input.segment || "architect";
  const cities = (input.cities || []).map((c) => normalizeCity(c) || c);
  // Real firms come only from live search results — never from the model's memory
  const firms = await discoverRealFirms(segment, cities, input.maxResults || 5);
  if (firms.length === 0) return simulateDiscovery(input);
  return firms.map((f) => ({ companyName: f.companyName, segment, city: f.city, reason: `${f.reason} (source: ${f.sourceUrl})` }));
}

// ─── Deduplication ───

const BLOCKING_STATUSES = ["processing", "awaiting_reply", "active", "visit_booked", "do_not_contact"];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findDuplicateLead(orgId: string, companyName: string, contactEmail?: string): Promise<{ id: string; status: string } | null> {
  const or: Record<string, unknown>[] = [{ companyName: { $regex: `^${escapeRegex(companyName.trim())}$`, $options: "i" } }];
  if (contactEmail) or.push({ contactEmail });
  const existing = await leadsCol().findOne({ orgId, $or: or, status: { $in: BLOCKING_STATUSES } });
  return existing ? { id: existing._id, status: String(existing.status) } : null;
}

// ─── Build + persist ───

const isSampleFirm = (name: string) => SAMPLE_FIRMS.some((f) => f.name.toLowerCase() === name.trim().toLowerCase());

/** Real firm: profile from live research only — never invented contacts, projects or news. */
async function buildLiveLead(
  orgId: string,
  firmName: string,
  segment: Segment,
  cityRaw: string | undefined,
  input: Partial<TargetedInput>,
  rawInput: LeadInput,
  source: "targeted" | "discovery"
): Promise<EnrichedLead> {
  const hintCity = normalizeCity(input.projectCity) || normalizeCity(cityRaw) || cityRaw || undefined;
  const research = await researchFirm(firmName, { city: hintCity, segment });
  const city = hintCity || research.city || "Mumbai";
  const principal = research.principals[0];
  const contactName = input.contactName || principal?.name || "";
  const projectGiven = !!(input.projectType || input.projectStage);
  const sizeFromApollo = research.apollo.employees
    ? research.apollo.employees <= 10 ? "1-10" : research.apollo.employees <= 50 ? "11-50" : research.apollo.employees <= 200 ? "51-200" : research.apollo.employees <= 500 ? "201-500" : research.apollo.employees <= 1000 ? "501-1000" : "1000+"
    : undefined;
  const fallback = defaultProject(firmName, segment, city, input);
  // Infer the likely project type from the firm's public work (planning only — flagged as assumed)
  const publicText = [research.summary, ...research.specialties, ...research.notableProjects].join(" ").toLowerCase();
  const inferredType: ProjectType | undefined =
    /hotel|resort|hospitality/.test(publicText) ? "hospitality"
    : /campus|office|commerz|business park|it park|corporate|workplace/.test(publicText) ? "office"
    : /mall|retail|showroom/.test(publicText) ? "retail"
    : /tower|housing|apartment|residential project/.test(publicText) ? "apartment_tower"
    : /villa|residence|house|bungalow|farmhouse/.test(publicText) ? "villa"
    : undefined;

  return {
    id: nanoid(),
    orgId,
    companyName: firmName,
    companyDomain: research.domain,
    companySize: sizeFromApollo || research.teamSize,
    industry: segment === "homeowner" ? "Premium Homeowner" : `${SEGMENTS[segment].label}`,
    headquarters: research.city ? `${research.city}` : city,
    techStack: [],
    contactName: contactName || `${firmName} team`,
    // Title only if supplied or stated in sources — never guessed
    contactTitle: input.contactTitle || (input.contactName ? "" : principal?.title) || "",
    // Contact details only if the user supplied them — never guessed for real people
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    contactLinkedIn: input.contactLinkedIn,
    seniority: inferSeniority(input.contactTitle || principal?.title),
    firmType: SEGMENTS[segment].label,
    portfolio: research.notableProjects,
    projectsPerYear: undefined,
    specialties: research.specialties,
    segment,
    // Project details are only what the user told us; type/stage defaults are for planning and flagged
    projectType: input.projectType || inferredType || fallback.projectType,
    projectStage: input.projectStage || fallback.projectStage,
    projectName: input.projectName,
    projectCity: city,
    projectValue: input.projectValue,
    budgetTier: input.budgetTier || "premium",
    dataSource: "live",
    research,
    contactUnknown: !contactName,
    projectAssumed: !projectGiven,
    source,
    enrichedAt: new Date().toISOString(),
    rawInput,
  };
}

async function buildLead(
  orgId: string,
  firmName: string,
  segment: Segment,
  cityRaw: string | undefined,
  input: Partial<TargetedInput>,
  rawInput: LeadInput,
  source: "targeted" | "discovery"
): Promise<EnrichedLead> {
  if (liveResearchEnabled() && !isSampleFirm(firmName)) {
    return buildLiveLead(orgId, firmName, segment, cityRaw, input, rawInput, source);
  }
  const city = normalizeCity(cityRaw) || normalizeCity(input.projectCity) || cityRaw || "Mumbai";
  const e = await enrichViaApollo(firmName, segment, city, input.contactName, input.contactTitle);
  const project = defaultProject(firmName, segment, city, input);
  return {
    id: nanoid(),
    orgId,
    companyName: firmName,
    companyDomain: e.companyDomain || undefined,
    companySize: e.companySize,
    industry: e.industry,
    headquarters: e.headquarters,
    techStack: [],
    contactName: e.contactName,
    contactTitle: e.contactTitle,
    contactEmail: input.contactEmail || e.contactEmail,
    contactPhone: input.contactPhone || e.contactPhone,
    contactLinkedIn: input.contactLinkedIn || e.contactLinkedIn || undefined,
    seniority: e.seniority,
    firmType: e.firmType,
    portfolio: e.portfolio,
    projectsPerYear: e.projectsPerYear,
    specialties: e.specialties,
    segment,
    ...project,
    dataSource: "simulated",
    source,
    enrichedAt: new Date().toISOString(),
    rawInput,
  };
}

export async function runLeadIngestionAgent(input: LeadInput, orgId: string): Promise<EnrichedLead[]> {
  const startTime = Date.now();
  const channelId = `pipeline:${orgId}`;
  sseManager.registerLead(channelId, orgId);
  sseManager.emitAgentStatus(channelId, AGENT_NUMBER, AGENT_NAME, "running");

  try {
    const leads: EnrichedLead[] = [];

    if (input.mode === "targeted") {
      const t = input as TargetedInput;
      if (await findDuplicateLead(orgId, t.companyName, t.contactEmail)) {
        sseManager.emitAgentStatus(channelId, AGENT_NUMBER, AGENT_NAME, "complete", `Duplicate detected for ${t.companyName}; skipping`);
        return [];
      }
      const segment = t.segment || inferSegment(t.contactTitle, t.companyName) || "architect";
      leads.push(await buildLead(orgId, t.companyName, segment, t.projectCity || t.location, t, t, "targeted"));
    } else {
      const d = input as DiscoveryInput;
      for (const rec of await discoverFirms(d)) {
        if (await findDuplicateLead(orgId, rec.companyName)) continue;
        const lead = await buildLead(orgId, rec.companyName, rec.segment, rec.city, { segment: rec.segment }, d, "discovery");
        lead.rawInput = { ...d, _reason: rec.reason } as DiscoveryInput;
        leads.push(lead);
      }
    }

    const now = new Date().toISOString();
    for (const lead of leads) {
      sseManager.registerLead(lead.id, orgId);
      const { id, rawInput, ...rest } = lead;
      await leadsCol().insertOne({
        _id: id,
        ...rest,
        techStack: JSON.stringify(lead.techStack || []),
        rawInput: JSON.stringify(rawInput),
        status: "processing",
        createdAt: now,
      });
    }

    const summary =
      input.mode === "targeted"
        ? leads[0]
          ? `${leads[0].dataSource === "live" ? "Researched" : "Enriched"} ${leads[0].companyName}, ${leads[0].contactUnknown ? "no named contact found" : leads[0].contactName}${leads[0].contactTitle ? ` (${leads[0].contactTitle})` : ""}${leads[0].projectName ? ` · ${leads[0].projectName}` : ""}`
          : "No new leads"
        : `Discovered & enriched ${leads.length} specifier firms`;
    sseManager.emitAgentStatus(channelId, AGENT_NUMBER, AGENT_NAME, "complete", summary);
    sseManager.emit("score_update", channelId, {
      agent: AGENT_NAME,
      leads: leads.map((l) => ({ id: l.id, company: l.companyName, contact: l.contactName, title: l.contactTitle })),
      durationMs: Date.now() - startTime,
    });
    console.log(`✅ Agent 1 complete in ${Date.now() - startTime}ms, ${summary}`);
    return leads;
  } catch (error) {
    sseManager.emitAgentStatus(channelId, AGENT_NUMBER, AGENT_NAME, "error", undefined, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
