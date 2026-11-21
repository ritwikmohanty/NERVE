import { nanoid } from "nanoid";
import { config } from "../config.js";
import { personaProfilesCol } from "../db/index.js";
import { sseManager } from "../lib/sse.js";
import { llmGenerateText, hasLLMKey, llmEnabled } from "../lib/llm.js";
import { SEGMENTS } from "../allhome/catalog.js";
import type { EnrichedLead, PersonaProfile, PersonaArchetype } from "../types/index.js";

const AGENT_NUMBER = 4;
const AGENT_NAME = "Persona Analyst";

type Archetype = Omit<PersonaProfile, "leadId" | "generatedAt" | "reasoning" | "archetype"> & { archetype: PersonaArchetype };

/** Specifier archetypes for the premium architecture & interiors market. */
export const ARCHETYPES: Record<PersonaArchetype, Archetype> = {
  design_architect: {
    archetype: "design_architect",
    archetypeLabel: "Design-led Architect",
    confidence: 0.86,
    traits: ["Design-intent driven", "Detail-obsessed", "Values material honesty", "Protective of the elevation"],
    communicationStyle: "Visual, precise, peer-to-peer — show finishes and details, not brochures",
    preferredTone: "Insight-led and design-literate; reference their project and design language",
    avoidInMessaging: ["Discount-led pitches", "Generic catalogues", "Over-promising timelines", "Salesy urgency"],
    talkingPoints: ["Keeping design intent intact from drawings to site", "Seeing real material and finish samples before specifying", "Fewer vendors to coordinate across facade, windows and lighting"],
  },
  aesthetic_designer: {
    archetype: "aesthetic_designer",
    archetypeLabel: "Aesthetic-first Interior Designer",
    confidence: 0.84,
    traits: ["Mood-board thinker", "Client-facing", "Wants a curated palette", "Hates vendor juggling"],
    communicationStyle: "Warm, visual, quick — WhatsApp with images works best",
    preferredTone: "Relationship-first, curated, low-pressure",
    avoidInMessaging: ["Technical jargon", "Long spec dumps", "Cold formality"],
    talkingPoints: ["A cohesive palette across hardware, bath, lighting and finishes", "Somewhere to take clients to see and choose finishes", "Not being the one chasing vendors for after-sales"],
  },
  developer_buyer: {
    archetype: "developer_buyer",
    archetypeLabel: "Cost & Timeline Developer",
    confidence: 0.82,
    traits: ["Thinks in project economics", "Delivery-date driven", "Brand value for sales", "Procurement-led"],
    communicationStyle: "Concise, numbers-first, outcome-oriented email",
    preferredTone: "Insight-led ROI: premiumisation, delivery certainty, consolidated procurement",
    avoidInMessaging: ["Vague claims", "Small-ticket framing", "Unclear lead times"],
    talkingPoints: ["Predictable lead times that protect the construction schedule", "Premium specifications that help sell inventory", "Consolidating vendors and after-sales across categories"],
  },
  execution_contractor: {
    archetype: "execution_contractor",
    archetypeLabel: "Execution-focused Contractor",
    confidence: 0.8,
    traits: ["Site-first", "Availability-obsessed", "Hates rework", "Margin-conscious"],
    communicationStyle: "Direct and practical — WhatsApp, short and specific",
    preferredTone: "Peer problem-solving: availability, installation support, no delays",
    avoidInMessaging: ["Design theory", "Marketing fluff", "Slow responses"],
    talkingPoints: ["Material arriving on time so site work doesn't stall", "Avoiding rework from mismatched components", "Fewer vendors to coordinate on site"],
  },
  premium_homeowner: {
    archetype: "premium_homeowner",
    archetypeLabel: "Premium Homeowner",
    confidence: 0.78,
    traits: ["Emotionally invested", "Wants to see and touch", "Trust-seeking", "Transparency on what goes in"],
    communicationStyle: "Friendly and reassuring — WhatsApp, with an invite to visit",
    preferredTone: "Relationship-first and transparent: what goes in, how it will look, after-sales",
    avoidInMessaging: ["Jargon", "Pressure tactics", "Hidden costs"],
    talkingPoints: ["Seeing and touching finishes before deciding", "Transparency about what goes into the home", "Not having to coordinate many vendors with the architect"],
  },
};

const SEGMENT_TO_ARCHETYPE: Record<string, PersonaArchetype> = {
  architect: "design_architect",
  id_firm: "aesthetic_designer",
  developer: "developer_buyer",
  contractor: "execution_contractor",
  homeowner: "premium_homeowner",
};

function classifyWithRules(lead: EnrichedLead): PersonaProfile {
  const archetype = SEGMENT_TO_ARCHETYPE[lead.segment || "architect"] || "design_architect";
  const base = ARCHETYPES[archetype];
  const seg = lead.segment ? SEGMENTS[lead.segment].label : "Specifier";
  return {
    ...base,
    leadId: lead.id,
    reasoning: `${lead.contactUnknown ? `The ${lead.companyName} team` : `${lead.contactName}${lead.contactTitle ? ` (${lead.contactTitle})` : ""} at ${lead.companyName}`} is a ${seg.toLowerCase()} working on ${lead.projectName || "a premium project"}. ${base.archetypeLabel}s respond best to ${base.preferredTone.toLowerCase()}.`,
    generatedAt: new Date().toISOString(),
  };
}

async function classifyWithLLM(lead: EnrichedLead): Promise<PersonaProfile> {
  const rules = classifyWithRules(lead);
  const system = `You classify B2B/B2C buyers of premium architectural & interior products in India into ONE archetype:
${Object.values(ARCHETYPES).map((a) => `- "${a.archetype}": ${a.archetypeLabel} — ${a.preferredTone}`).join("\n")}
Return ONLY JSON: {"archetype": string, "confidence": 0-1, "traits": string[3-4], "reasoning": string}`;
  const prompt = `Name: ${lead.contactUnknown ? "unknown (studio team)" : lead.contactName}\nTitle: ${lead.contactTitle}\nFirm: ${lead.companyName} (${lead.firmType || ""})\nSpecialties: ${(lead.specialties || []).join(", ") || "unknown"}\n${lead.research?.summary ? `Public profile: ${lead.research.summary}\n` : ""}Project: ${lead.projectAssumed ? "not provided" : `${lead.projectName || "unnamed"} (${lead.projectType}, ${lead.projectStage} stage${lead.projectValue ? `, ${lead.projectValue}` : ""})`}`;
  try {
    const text = await llmGenerateText(system, prompt);
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return rules;
    const p = JSON.parse(m[0]) as { archetype?: PersonaArchetype; confidence?: number; traits?: string[]; reasoning?: string };
    if (!p.archetype || !ARCHETYPES[p.archetype]) return rules;
    const base = ARCHETYPES[p.archetype];
    const conf = Number(p.confidence);
    return {
      ...base,
      leadId: lead.id,
      confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : base.confidence,
      traits: Array.isArray(p.traits) && p.traits.length ? p.traits.map(String).slice(0, 5) : base.traits,
      reasoning: p.reasoning || rules.reasoning,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return rules;
  }
}

export async function runPersonaAnalystAgent(lead: EnrichedLead): Promise<PersonaProfile> {
  const start = Date.now();
  sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "running");
  try {
    const profile = llmEnabled() ? await classifyWithLLM(lead) : classifyWithRules(lead);
    await personaProfilesCol().insertOne({
      _id: nanoid(),
      ...profile,
      traits: JSON.stringify(profile.traits),
      avoidInMessaging: JSON.stringify(profile.avoidInMessaging),
      talkingPoints: JSON.stringify(profile.talkingPoints),
    });
    const summary = `Archetype: ${profile.archetypeLabel} (${Math.round(profile.confidence * 100)}%) — ${profile.preferredTone.slice(0, 60)}`;
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "complete", summary);
    sseManager.emit("score_update", lead.id, { agent: AGENT_NAME, persona: profile });
    console.log(`✅ Agent 4 complete in ${Date.now() - start}ms — ${summary}`);
    return profile;
  } catch (error) {
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "error", undefined, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
