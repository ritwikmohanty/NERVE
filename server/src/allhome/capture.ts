/**
 * F4 — Quick Capture: turn a pasted WhatsApp chat, business card or meeting note
 * into a structured lead. Uses the LLM when available, with a heuristic extractor
 * that works offline (and in simulation mode).
 */
import { config } from "../config.js";
import { llmGenerateText, hasLLMKey, llmEnabled } from "../lib/llm.js";
import { normalizeCity, BRANDS, type ProjectStage, type ProjectType, type Segment } from "./catalog.js";

export interface CapturedLead {
  companyName?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  projectCity?: string;
  segment?: Segment;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectName?: string;
  projectValue?: string;
  interestedBrands: string[];
  notes?: string;
  confidence: number;
  method: "llm" | "heuristic";
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/;
const VALUE_RE = /(₹|rs\.?|inr)?\s?(\d+(?:\.\d+)?)\s?(cr|crore|crores|lakh|lakhs|l)\b/i;

function detectSegment(t: string): Segment | undefined {
  if (/\b(developer|realty|builders?|estates|properties)\b/i.test(t)) return "developer";
  if (/\b(contractor|pmc|turnkey|execution)\b/i.test(t)) return "contractor";
  if (/\binterior(s| design(er)?)?\b/i.test(t)) return "id_firm";
  if (/\barchitect(s|ure)?\b|\batelier\b/i.test(t)) return "architect";
  if (/\b(my (home|house|flat|villa|apartment)|our (home|house|villa|flat)|homeowner)\b/i.test(t)) return "homeowner";
  return undefined;
}

function detectType(t: string): ProjectType | undefined {
  if (/\bvilla|bungalow|farmhouse\b/i.test(t)) return "villa";
  if (/\bhotel|resort|hospitality\b/i.test(t)) return "hospitality";
  if (/\btower|high-?rise|residential project|\d+ ?floors?\b/i.test(t)) return "apartment_tower";
  if (/\boffice|workspace|corporate\b/i.test(t)) return "office";
  if (/\bretail|showroom|store|mall\b/i.test(t)) return "retail";
  if (/\bapartment|flat|penthouse|\dbhk\b/i.test(t)) return "premium_apartment";
  return undefined;
}

function detectStage(t: string): ProjectStage | undefined {
  if (/\b(handover|possession|renovat|repaint|touch-?up)/i.test(t)) return "handover";
  if (/\b(paint|polish|coating|finishing|texture)/i.test(t)) return "finishing";
  if (/\b(fit-?out|interiors? (work|phase)|joinery|modular|wardrobe|hardware|handles)/i.test(t)) return "fitout";
  if (/\b(mep|electrical|plumbing|lighting layout|conduits?)/i.test(t)) return "mep";
  if (/\b(slab|structure|rcc|columns|facade|fa[cç]ade|elevation|windows?)/i.test(t)) return "structure";
  if (/\b(concept|drawings|design stage|planning|layout)/i.test(t)) return "design";
  return undefined;
}

function heuristicExtract(text: string): CapturedLead {
  // Strip WhatsApp export prefixes ("12/03/26, 10:42 - Name: ") and "[time]" stamps
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^\[[^\]]*\]\s*/, "").replace(/^\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}\s*(?:[ap]m)?\s*-\s*/i, "").trim())
    .filter(Boolean);
  const email = text.match(EMAIL_RE)?.[0];
  const phone = text.match(PHONE_RE)?.[0]?.replace(/\s/g, "");
  const value = text.match(VALUE_RE);
  const projectValue = value ? `₹${value[2]} ${/l/i.test(value[3]) && !/cr/i.test(value[3]) ? "L" : "Cr"}` : undefined;

  // WhatsApp exports look like "12/03/26, 10:42 - Meera Kapoor: message"
  const waSender = text.match(/\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}\s*(?:[ap]m)?\s*-\s*([^:]{2,40}):/i)?.[1]?.trim();
  const nameLine = text.match(/\b(?:i am|i'm|this is|name[:\s]+)\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/)?.[1];
  const contactName =
    (waSender && (!nameLine || waSender.startsWith(nameLine)) ? waSender : nameLine) ||
    waSender ||
    lines.find((l) => /^[A-Z][a-z]+(\s[A-Z][a-z]+){1,2}$/.test(l));

  const firmMatch =
    text.match(/\b(?:from|at|with)\s+([A-Z][\w&'.-]*(?:\s+[A-Z&][\w&'.-]*){0,4}\s+(?:Architects?|Studio|Interiors?|Designs?|Developers?|Realty|Builders?|Estates|Associates|Collective|Atelier|PMC|Projects|Contracting))/)?.[1] ||
    lines.find((l) => /(Architects?|Studio|Interiors?|Design|Developers?|Realty|Builders?|Estates|Associates|Collective|Atelier|PMC)\b/.test(l) && l.length < 60);

  const titleMatch = text.match(/\b(Principal Architect|Founder|Co-?founder|Partner|Director[\w -]*|Head of [\w ]+|Interior Designer|Architect|Project Manager|Procurement[\w ]*|Managing Director|CEO|MD)\b/i)?.[1];
  const city = normalizeCity(text);
  const interestedBrands = BRANDS.filter((b) => {
    const keys = [b.name.toLowerCase(), ...b.productLines.map((p) => p.toLowerCase().split(" ")[0])];
    const generic: Record<string, RegExp> = {
      metalia: /facade|fa[cç]ade|louver|metal panel|parametric|screen/i,
      "window-factory": /windows?|glazing|sliding door/i,
      ledlum: /lighting|lights?|fans?|luminaire/i,
      "house-of-w": /bath|sanitary|faucets?|shower|basin|wc/i,
      fiamarc: /hardware|hinges?|channels?|modular|laminates?|sliding system/i,
      shapes: /handles?|knobs?|mortise|door lever/i,
      "colour-coats": /paint|coating|polish|texture|pu finish|wood finish/i,
    };
    return keys.some((k) => text.toLowerCase().includes(k)) || generic[b.id]?.test(text);
  }).map((b) => b.id);

  const fields = [contactName, firmMatch, email || phone, city, detectStage(text)].filter(Boolean).length;
  return {
    companyName: firmMatch?.trim(),
    contactName: contactName?.trim(),
    contactTitle: titleMatch,
    contactEmail: email,
    contactPhone: phone,
    projectCity: city,
    segment: detectSegment(text) || (firmMatch && /architect|atelier/i.test(firmMatch) ? "architect" : firmMatch && /interior|design/i.test(firmMatch) ? "id_firm" : undefined),
    projectType: detectType(text),
    projectStage: detectStage(text),
    projectValue,
    interestedBrands,
    notes: text.slice(0, 280),
    confidence: Math.round(Math.min(0.9, 0.3 + fields * 0.12) * 100) / 100,
    method: "heuristic",
  };
}

export async function extractLeadFromText(text: string): Promise<CapturedLead> {
  const heuristic = heuristicExtract(text);
  if (!llmEnabled()) return heuristic;

  const system = `Extract a sales lead for AllHome (premium architectural & interior products) from the text. Return ONLY JSON with keys:
companyName, contactName, contactTitle, contactEmail, contactPhone, projectCity, segment (architect|id_firm|developer|contractor|homeowner), projectType (villa|premium_apartment|apartment_tower|hospitality|office|retail), projectStage (design|structure|mep|fitout|finishing|handover), projectName, projectValue, interestedBrands (array of: ${BRANDS.map((b) => b.id).join(", ")}), notes.
Use null for anything not present. Never guess emails or phone numbers.`;
  try {
    const out = await llmGenerateText(system, text.slice(0, 4000));
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return heuristic;
    const p = JSON.parse(m[0]) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.trim() && v !== "null" ? v.trim() : undefined);
    const validBrands = BRANDS.map((b) => b.id);
    return {
      companyName: str(p.companyName) || heuristic.companyName,
      contactName: str(p.contactName) || heuristic.contactName,
      contactTitle: str(p.contactTitle) || heuristic.contactTitle,
      // only trust contact details that literally appear in the source text
      contactEmail: heuristic.contactEmail,
      contactPhone: heuristic.contactPhone,
      projectCity: normalizeCity(str(p.projectCity)) || heuristic.projectCity,
      segment: (["architect", "id_firm", "developer", "contractor", "homeowner"].includes(String(p.segment)) ? p.segment : heuristic.segment) as Segment | undefined,
      projectType: (["villa", "premium_apartment", "apartment_tower", "hospitality", "office", "retail"].includes(String(p.projectType)) ? p.projectType : heuristic.projectType) as ProjectType | undefined,
      projectStage: (["design", "structure", "mep", "fitout", "finishing", "handover"].includes(String(p.projectStage)) ? p.projectStage : heuristic.projectStage) as ProjectStage | undefined,
      projectName: str(p.projectName),
      projectValue: str(p.projectValue) || heuristic.projectValue,
      // union: keep anything either the model or the keyword matcher found
      interestedBrands: Array.from(new Set([...(Array.isArray(p.interestedBrands) ? p.interestedBrands.map(String).filter((b) => validBrands.includes(b)) : []), ...heuristic.interestedBrands])),
      notes: str(p.notes) || heuristic.notes,
      confidence: Math.max(heuristic.confidence, 0.8),
      method: "llm",
    };
  } catch {
    return heuristic;
  }
}
