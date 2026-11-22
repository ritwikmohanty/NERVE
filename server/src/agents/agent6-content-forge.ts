import { nanoid } from "nanoid";
import { generatedContentCol } from "../db/index.js";
import { sseManager } from "../lib/sse.js";
import { llmGenerateText, llmEnabled } from "../lib/llm.js";
import { ALLHOME, getBrand, PROJECT_TYPES, STAGES, stageIndex, SEGMENTS, type Brand, type CategoryId } from "../allhome/catalog.js";
import type { EnrichedLead, SignalBundle, IntentScore, PersonaProfile, OutreachStrategy, GeneratedContent, TouchContent, OutreachChannel, TouchPoint } from "../types/index.js";

const AGENT_NUMBER = 6;
const AGENT_NAME = "Content Forge";

export interface ContentCtx {
  senderName: string;
  senderTitle: string;
}

const CHANNEL_RULES: Record<OutreachChannel, { maxLength: number; rules: string }> = {
  whatsapp: {
    maxLength: 480,
    rules:
      "WhatsApp: under 450 characters in total, 2 or 3 short paragraphs, plain text, no emoji, no subject. On Touch 1, keep the reference draft's first line saying who is writing. No sign-off line: WhatsApp already shows who sent it.",
  },
  linkedin_dm: {
    maxLength: 380,
    rules: "LinkedIn DM: under 320 characters, 2 or 3 sentences, conversational and specific. No subject, no emoji, no sign-off line.",
  },
  email: {
    maxLength: 1400,
    rules:
      "Email: a subject under 60 characters that names the project or the specific product (never 'Quick note', 'Following up' or 'Introduction'). Body 80 to 140 words in 3 or 4 short paragraphs, plain text, one clear ask, then the exact sign-off.",
  },
};

/** Phrases that make outreach read as generic or machine-written. A draft containing any of them is rejected. */
const BANNED = [
  "I hope this finds you well", "hope you're doing well", "hope you are doing well", "I wanted to reach out", "reaching out", "touch base",
  "circle back", "just checking in", "I came across", "I noticed that", "synergy", "game-changer", "game changer", "revolutionize", "revolutionise",
  "cutting-edge", "world-class", "best-in-class", "state-of-the-art", "unparalleled", "one-stop shop", "elevate", "unlock", "leverage",
  "delve", "seamlessly", "tailored solutions", "in today's", "fast-paced", "excited to", "thrilled", "testament to", "look no further",
  "don't hesitate", "do not hesitate", "feel free to", "at your earliest convenience", "I'd love to", "I would love to", "would love to",
  "value proposition", "rest assured", "keen eye", "eye for detail", "stunning", "impressive", "amazing", "iconic", "remarkable", "exceptional", "inspiring", "truly", "furthermore", "moreover", "transform your", "take your", "next level", "perfect fit", "dream home",
];

// ─── Context assembly ───

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

function brands(ids: string[] = []): Brand[] {
  return ids.map((id) => getBrand(id)).filter((b): b is Brand => !!b);
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] || "AllHome";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function stageWords(id: string): string {
  return STAGES[stageIndex(id as never)].label.toLowerCase().replace(/\bmep\b/, "MEP").replace(/ & /g, " and ").replace(/ \/ /g, " or ");
}

function stageLabel(lead: EnrichedLead): string {
  return stageWords(lead.projectStage || "design");
}

/** Generic project names ("Boutique Hotel, Chhatarpur") read better as "the boutique hotel in Chhatarpur". */
const GENERIC_WORDS = new Set(["luxury", "premium", "apartment", "residential", "tower", "corporate", "retail", "hospitality", "boutique", "hotel", "office", "fit-out", "forest", "retreat", "coastal", "resort", "corporate", "flagship", "store", "heritage", "haveli", "sea-view", "residence", "floors", "hq", "villa", "villas"]);
const GENERIC_START = /^(luxury|premium|residential|retail|hospitality|boutique|grade-a|forest|coastal|corporate|flagship|hotel|heritage|worli|golf)\b/i;

/** How the project is referred to inside a sentence, without inventing anything. */
function projectRef(lead: EnrichedLead): string {
  if (lead.projectName) {
    const [name, place] = lead.projectName.split(/,\s*(?=[^,]+$)/);
    if (!GENERIC_START.test(name)) return place ? `${name} in ${place}` : name;
    const words = name.split(" ").map((w) => (GENERIC_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w));
    return `the ${words.join(" ")}${place ? ` in ${place}` : ""}`;
  }
  if (lead.projectAssumed) return "your upcoming projects";
  const type = lead.projectType ? PROJECT_TYPES[lead.projectType].toLowerCase().split(" / ")[0] : "premium";
  return `your ${type} project${lead.projectCity ? ` in ${lead.projectCity}` : ""}`;
}

/** Short project name for subject lines. */
function projectShort(lead: EnrichedLead): string {
  return lead.projectName ? lead.projectName.split(",")[0] : lead.companyName;
}

const RECENT_DAYS = 365;

function age(days: number): string {
  if (days <= 1) return "this week";
  if (days < 60) return `${days} days ago`;
  if (days < 730) return `about ${Math.round(days / 30)} months ago`;
  return `about ${Math.round(days / 365)} years ago`;
}

/** One concrete, verifiable opening detail about the recipient (or undefined). Always a full sentence. */
function recipientHook(lead: EnrichedLead, signals: SignalBundle): string | undefined {
  const top = signals.topSignal;
  if (lead.dataSource === "live") {
    // Only news from the last year counts as "recent"; older items are never congratulated
    if (top && top.category !== "other" && !top.dateUnknown && top.recencyDays <= RECENT_DAYS) return `I saw the recent news: ${top.title.replace(/[.!]$/, "")}.`;
    if (lead.portfolio?.[0]) return `I've been looking at ${lead.portfolio[0]}.`;
    if (lead.specialties?.[0]) return `Your studio's ${lead.specialties[0].toLowerCase()} work is why I'm writing.`;
    return undefined;
  }
  if (!top) return undefined;
  const project = projectRef(lead);
  switch (top.category) {
    case "project_launch": return lead.projectAssumed ? "Congratulations on the new project." : `Congratulations on ${project}.`;
    case "possession_milestone": return ["finishing", "handover"].includes(lead.projectStage || "") ? `Good to see ${project} nearing completion.` : `Good to see ${project} moving into interiors.`;
    case "award_publication": return "Congratulations on the recent recognition for your work.";
    case "exhibition": return "I heard your team was at Design POV recently.";
    case "office_opening": return "Congratulations on the new studio.";
    case "funding": return "Congratulations on the recent deal.";
    case "hiring_spike": return "It looks like the studio is growing.";
    default: return undefined;
  }
}

/** "the Window Factory experience centre in Mumbai" (drops a leading "The" from brand names). */
function centreLine(strategy: OutreachStrategy): string {
  const c = strategy.experienceCentre;
  if (!c) return "one of our experience centres";
  return `the ${c.brandName.replace(/^The /, "")} ${c.centre.kind === "dealer" ? "dealer showroom" : "experience centre"} in ${c.centre.city}`;
}

/** Does the invited centre actually show the brand being pitched? */
function centreShows(strategy: OutreachStrategy, b: Brand | undefined): boolean {
  return !!b && strategy.experienceCentre?.centre.brandId === b.id;
}

/** One verified proof sentence per brand (figures from the catalogue). */
const PROOF: Record<string, string> = {
  metalia: "Metalia has installed 500+ facades.",
  "window-factory": "The Window Factory has delivered 1,000+ projects across 30+ cities.",
  ledlum: "Ledlum has 3,500+ SKUs and its own lighting design team.",
  "house-of-w": "House of W carries 15+ imported bathware brands, including THG Paris and Victoria + Albert.",
  fiamarc: "Fiamarc carries hardware from 15+ international brands.",
  shapes: "Shapes has 1,200+ handle and hardware designs.",
  "colour-coats": "Colour Coats develops custom finishes and applies them on site.",
};

/** A concrete first piece of work each brand team can offer (from the services listed in the catalogue). */
const OFFER: Record<string, string> = {
  metalia: "a facade design proposal matched to the building and its climate",
  "window-factory": "project support on the window and glazing schedule",
  ledlum: "a lighting layout with lux calculations",
  "house-of-w": "a bathware selection across its imported brands",
  fiamarc: "a hardware schedule across its international brands",
  shapes: "a handle and hardware selection",
  "colour-coats": "custom finish samples for the project",
};

const STAGE_NOW: Record<string, string> = {
  design: "While the design is still being finalised",
  structure: "With the structure going up",
  mep: "With MEP and services under way",
  fitout: "With interiors and fit-out under way",
  finishing: "With finishing work under way",
  handover: "With handover close",
};

function centreIsNear(strategy: OutreachStrategy): boolean {
  const c = strategy.experienceCentre;
  return !!c && (c.sameCity || (c.distanceKm >= 0 && c.distanceKm <= 150));
}

/** Where samples go, by segment. */
function sampleDestination(lead: EnrichedLead): string {
  if (lead.segment === "homeowner") return "your home";
  if (lead.segment === "developer" || lead.segment === "contractor") return "your site office";
  return "your studio";
}

const SAMPLE_NOUN: Record<CategoryId, string> = {
  facades_windows: "panel and window samples",
  lighting: "fittings and control options",
  hardware_bath: "fittings and finishes",
  surfaces: "finish samples",
};

/** The one ask, matched to how close the nearest centre is. */
function askLine(lead: EnrichedLead, strategy: OutreachStrategy, b: Brand | undefined): string {
  const what = b ? SAMPLE_NOUN[b.category] : "samples";
  if (b && !centreShows(strategy, b)) {
    const c = strategy.experienceCentre;
    return `Shall I send a ${b.name.replace(/^The /, "")} sample kit to ${sampleDestination(lead)}?${c && centreIsNear(strategy) ? ` You'd also be welcome at ${centreLine(strategy)} to see the wider AllHome range.` : ""}`;
  }
  if (centreIsNear(strategy)) {
    return `Would you have 20 minutes next week to see the ${what} at ${centreLine(strategy)}? If a visit is hard to fit in, I can send a sample kit to ${sampleDestination(lead)} instead.`;
  }
  const c = strategy.experienceCentre;
  return `${c ? `Our nearest ${c.brandName.replace(/^The /, "")} centre is in ${c.centre.city}, so the quicker option is a sample kit. ` : ""}Shall I send one to ${sampleDestination(lead)}?`;
}

/** The only sign-off an email may use. Models otherwise invent sender names. */
function signOff(ctx: ContentCtx): string {
  return `Regards,\n${ctx.senderName}\n${ctx.senderTitle}`;
}

/** How the sender introduces themselves on WhatsApp. */
function senderIntro(ctx: ContentCtx): string {
  return /allhome/i.test(ctx.senderName) ? "this is the specification team at AllHome" : `this is ${ctx.senderName} from AllHome`;
}

/** Replace whatever closing the model wrote with the exact sign-off (email) or none (chat channels). */
function enforceSignOff(body: string, channel: OutreachChannel, ctx: ContentCtx): string {
  const lines = body.trimEnd().split("\n");
  const closing = /^(—|–|-{1,2})\s*\S|^(warm\s+)?(best\s+)?(kind\s+)?(regards|wishes|thanks|thank you|cheers|sincerely)\b[,!.]?\s*$/i;
  let cut = lines.length;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 4); i--) {
    const l = lines[i].trim();
    if (!l) { cut = i; continue; }
    if (closing.test(l)) { cut = i; break; }
    if (l.length > 60 || /[?.!]$/.test(l)) break;
  }
  // Also drop an inline sign-off glued to the last sentence ("...centre? - AllHome Specifier Desk")
  const kept = lines.slice(0, cut).join("\n").trimEnd().replace(/\s+[—–-]{1,2}\s+[^?.!\n]*(allhome|desk|team)[^?.!\n]*$/i, "");
  return channel === "email" ? `${kept}\n\n${signOff(ctx)}` : kept;
}

/** Remove dash-heavy punctuation that reads as machine-written. */
function undash(t: string): string {
  return t.replace(/\s+[—–]\s+/g, ", ").replace(/[—–\u2011\u2010]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
}

/** Stage-accurate timing sentence for the featured brand(s). Never claims "now" when the window is later. */
function timingLine(lead: EnrichedLead, tp: TouchPoint, projectMentioned = false): string {
  const focus = brands(tp.focusBrands);
  const b = focus[0];
  if (!b) return "";
  const names = joinNames(focus.map((x) => x.name));
  const verb = focus.length > 1 ? "are" : "is";
  const when = b.specifyAt.map(stageWords).join(" or ");
  if (lead.projectAssumed) return `${b.name} is usually specified at the ${when} stage, so it helps to have options ready before then.`;
  const project = projectRef(lead);
  const cur = stageIndex(lead.projectStage || "design");
  const idx = b.specifyAt.map((st) => stageIndex(st));
  if (idx.includes(cur)) return `${STAGE_NOW[lead.projectStage || "design"]}, this is when ${names} ${verb} usually specified.`;
  const next = idx.filter((i) => i > cur).sort((x, y) => x - y)[0];
  if (next !== undefined) return `${projectMentioned ? "The project" : cap(project)} is at the ${stageLabel(lead)} stage, and ${b.name} is usually specified during ${stageWords(STAGES[next].id)}. Having options ready early avoids a rushed order later.`;
  return `${b.name} is usually specified before the ${stageLabel(lead)} stage, so this may be more useful for replacements or your next project.`;
}

/** Instruction for the LLM version of the same timing rule. */
function focusStageLine(lead: EnrichedLead, tp: TouchPoint): string {
  const b = brands(tp.focusBrands)[0];
  if (!b) return "";
  const stages = b.specifyAt.map((st) => STAGES[stageIndex(st)].label);
  if (lead.projectAssumed) return `The recipient's project stage is UNKNOWN. Never say or imply what stage their projects are at. You may only say ${b.name} is typically specified during ${stages.join(" or ")}.`;
  const cur = stageIndex(lead.projectStage || "design");
  const idx = b.specifyAt.map((st) => stageIndex(st));
  if (idx.includes(cur)) return `${b.name} is specified at the CURRENT stage (${STAGES[cur].label}). You may say this is when it is specified.`;
  const next = idx.filter((i) => i > cur).sort((x, y) => x - y)[0];
  if (next !== undefined) return `${b.name} is specified at a LATER stage (${STAGES[next].label}); the project is currently at ${STAGES[cur].label}. Say the project is heading towards ${STAGES[next].label.toLowerCase()}, when ${b.name} is usually specified. Never say it is specified now.`;
  return `${b.name}'s usual specification stage (${stages.join(" or ")}) has passed. Position it for replacements, upgrades or the next project.`;
}

/** The full grounding pack handed to the LLM: the only facts it may use. */
function groundingPack(lead: EnrichedLead, signals: SignalBundle, persona: PersonaProfile, strategy: OutreachStrategy, tp: TouchPoint, ctx: ContentCtx): string {
  const focus = brands(tp.focusBrands);
  const r = lead.research;
  const realSignals = signals.signals.filter((s) => s.category !== "linkedin_activity").slice(0, 3);
  return [
    `## About AllHome (sender)`,
    `${ALLHOME.positioning} ${ALLHOME.model}`,
    `Collective facts: ${ALLHOME.facts.join("; ")}.`,
    `Why it matters to specifiers: one relationship instead of separate vendors for facade, windows, lighting, bath, hardware and finishes. That means consistent finishes, coordinated delivery and one point of after-sales.`,
    ``,
    `## Brands to feature in THIS message`,
    ...focus.map((b) => `- ${b.name}${b.formalName ? ` (${b.formalName})` : ""}: ${b.pitch}\n  Product systems: ${b.productLines.join("; ")}\n  Services: ${b.services.join("; ") || "none listed"}\n  Verified figures: ${b.facts.join("; ")}${b.partners.length ? `\n  International brands carried: ${b.partners.slice(0, 6).join(", ")}` : ""}`),
    ``,
    `## Recipient`,
    `Name: ${lead.contactUnknown ? "UNKNOWN. Address the studio or team, not a person" : `${lead.contactName}${lead.contactTitle ? `, ${lead.contactTitle}` : ""}`}`,
    `Firm: ${lead.companyName} (${lead.segment ? SEGMENTS[lead.segment].label : "specifier"})${lead.projectCity ? `, ${lead.projectCity}` : ""}`,
    r?.summary ? `Public profile: ${r.summary}` : "",
    lead.specialties?.length ? `Known for: ${lead.specialties.join(", ")}` : "",
    lead.portfolio?.length ? `Public projects: ${lead.portfolio.join("; ")}` : "",
    realSignals.length ? `Public signals, strongest first (only those marked RECENT may be called recent or congratulated):\n${realSignals.map((s) => `- [${s.dateUnknown ? "UNDATED, treat as OLDER" : s.recencyDays <= RECENT_DAYS ? `RECENT, ${age(s.recencyDays)}` : `OLDER, ${age(s.recencyDays)}`}] ${s.title}${s.description && s.description !== s.title ? `. ${s.description.slice(0, 200)}` : ""}${s.sourceUrl ? ` (${s.source})` : ""}`).join("\n")}` : "Public signals: none found",
    ``,
    `## Project`,
    lead.projectAssumed
      ? `Project details NOT provided. Do not name, size, type or describe any project (no "villa", "tower", "drawings of X"). Refer only to "${projectRef(lead)}" or to the firm's public work listed above.`
      : `${projectRef(lead)}: ${lead.projectType ? PROJECT_TYPES[lead.projectType] : ""}, currently at the ${stageLabel(lead)} stage${lead.projectValue ? `, approx. ${lead.projectValue}` : ""}.`,
    lead.projectAssumed ? "" : `Internal planning notes (context only; do NOT quote timings, weeks or these phrases): ${strategy.bundle?.items.filter((i) => tp.focusBrands?.includes(i.brandId)).map((i) => `${i.brandName}: ${i.reason}`).join(" | ") || "none"}`,
    `Stage rule: ${focusStageLine(lead, tp)}`,
    ``,
    `## Persona`,
    `${persona.archetypeLabel}. Tone: ${persona.preferredTone}. What they care about (their needs, NOT AllHome claims): ${persona.talkingPoints.slice(0, 3).join("; ")}. Avoid: ${persona.avoidInMessaging.join(", ")}.`,
    ``,
    `## The ask (pick one, phrase it as a simple yes/no question)`,
    focus[0] && !centreShows(strategy, focus[0])
      ? `A ${focus[0].name} sample kit sent to ${sampleDestination(lead)}. ${centreLine(strategy)} belongs to a different AllHome brand, so do NOT say ${focus[0].name} can be seen there; you may mention it only as a place to see the wider AllHome range.`
      : centreIsNear(strategy)
      ? `A 20-minute visit to ${centreLine(strategy)}, with a sample kit sent to ${sampleDestination(lead)} as the fallback.`
      : `A sample kit sent to ${sampleDestination(lead)} (the nearest centre, ${centreLine(strategy)}, is in another city).`,
    ``,
    `## Sender`,
    `${ctx.senderName}, ${ctx.senderTitle}`,
    tp.channel === "email" ? `Exact sign-off: "${signOff(ctx).replace(/\n/g, " / ")}" with the name and title on separate lines.` : `No sign-off line on this channel.`,
  ].filter((l) => l !== "").join("\n");
}

const PURPOSE: Record<number, string> = {
  1: "Touch 1 (first contact). Sentence 1: the recipient-specific opening, taken from the strongest signal or public work. Sentence 2: why that matters now, using the stage rule. Then ONE concrete capability of the featured brand with ONE verified figure. Then the ask.",
  2: "Touch 2 (a few days after Touch 1, no reply yet). Do not repeat Touch 1's opening. Open with 'Following up on my note about <project>.' and then give one new reason to reply: a one-page specification sheet for their project (recommended product systems, lead times and order-by dates). Ask whether to send it with a sample kit or go through it together at the centre.",
  3: "Touch 3 (timed just before the next brand's specification window). Do not repeat earlier openings. Say the project is approaching the stage when the featured brand is usually specified (follow the stage rule exactly), offer ONE named service of that brand from the pack so the package is settled early, and ask a simple yes/no question. Polite, no pressure, no guilt.",
};

const SYSTEM = `You write first-contact and follow-up messages for AllHome's specification team in India. Recipients are architects, interior designers, developers, contractors and premium homeowners. The goal of every message is a reply that leads to a visit or a sample request.

Write like a well-informed person in the trade writing to a peer: short sentences, specific nouns, plain words, Indian business English. The message is about the recipient's project first and AllHome second. Use "you" and "your" more than "we" and "our".

Hard rules:
1. Use ONLY facts from the grounding pack. Never invent prices, discounts, delivery times, client names, project names, awards, statistics or personal details. Quote figures exactly as given (e.g. "3,500+ SKUs").
2. Mention at most two brands and at most two figures in one message. Pick what fits the recipient's stage.
3. Exactly one ask, written as a simple question they can answer yes or no.
4. If the recipient's name is UNKNOWN, open with "Hello team at <Firm>," and never invent a person.
5. If project details were not provided, do not name, type or describe a specific project.
6. Congratulate only on a signal marked RECENT. Never call an OLDER signal recent. A project listed under "Public projects" may be mentioned ("I've been looking at X") but never congratulated or called recent. Do not describe the recipient's design style, taste or intent unless the pack states it. Naming a public project is fine; interpreting it is not. No flattery adjectives (stunning, beautiful, impressive, amazing, iconic).
7. Only claim products, services and figures listed for the featured brand. "What they care about" lines are the recipient's needs, never AllHome capabilities.
8. Never use these phrases: ${BANNED.join(", ")}.
9. Plain text only: no markdown, no bullet symbols, no emoji, no exclamation marks.
10. Never use em dashes or en dashes. Use a full stop or a comma instead. Avoid semicolons.
11. No rhetorical questions and no "not just X, but Y" constructions. Do not list three adjectives in a row.
12. Open with "Hi <first name>," (or "Hello team at <Firm>,"). Never "Dear Sir/Madam".
13. Never state a number of weeks, a lead time or a calendar date. You may say the spec sheet "includes lead times and order-by dates".
14. Follow the sign-off instruction in the pack exactly. Never invent or change a sender name.

Return ONLY JSON: {"subject": string|null, "body": string, "groundedIn": string[]}
"groundedIn" lists the 2 to 4 specific facts from the pack you actually used (short phrases).`;

// ─── Templates (deterministic fallback and the instant demo seed; same rules) ───

function templateTouch(lead: EnrichedLead, strategy: OutreachStrategy, signals: SignalBundle, tp: TouchPoint, ctx: ContentCtx): TouchContent {
  const focus = brands(tp.focusBrands);
  const b = focus[0];
  const names = joinNames(focus.map((x) => x.name));
  const greet = lead.contactUnknown ? `Hello team at ${lead.companyName},` : `Hi ${firstName(lead.contactName)},`;
  const hook = recipientHook(lead, signals);
  const project = projectRef(lead);
  const timing = timingLine(lead, tp, tp.touchNumber === 1 && !!hook && hook.includes(project));
  const ask = askLine(lead, strategy, b);
  const service = (b && OFFER[b.id]) || "finish samples";
  const proof = b ? PROOF[b.id] || "" : "";
  const listNames = joinNames(focus.map((x) => x.name.replace(/^The /, "")));
  const grounded = [b?.facts[0], hook ? "recipient signal or public work" : undefined, `stage: ${lead.projectAssumed ? "unknown" : stageLabel(lead)}`, strategy.experienceCentre ? `${strategy.experienceCentre.brandName} centre, ${strategy.experienceCentre.centre.city}` : undefined].filter(Boolean) as string[];
  const procurementLine: Record<string, string> = {
    developer: "It's laid out so your procurement team can compare it line by line with current vendors.",
    contractor: "It's set against a typical site programme, so each package can be ordered on time.",
    homeowner: "It's a short summary you can share with your architect or contractor.",
  };
  const sheetUse = procurementLine[lead.segment || ""] || "It's set out so it can go straight into your material schedule.";

  let subject: string | undefined;
  let body: string;

  if (tp.channel === "email") {
    if (tp.touchNumber === 1) {
      subject = `${b?.name || "AllHome"} for ${projectShort(lead)}`.slice(0, 60);
      body = `${greet}\n\n${hook ? `${hook} ` : ""}${timing}\n\n${b ? b.pitch : ALLHOME.positioning}\n\n${ask}\n\n${signOff(ctx)}`;
    } else if (tp.touchNumber === 2) {
      subject = `Spec sheet for ${projectShort(lead)}`.slice(0, 60);
      body = `${greet}\n\nFollowing up on my note about ${project}. I've put together a one-page specification sheet for it, covering the recommended ${listNames} systems with lead times and order-by dates.\n\n${sheetUse}\n\n${centreShows(strategy, b) && centreIsNear(strategy) ? `Shall I send it over with a sample kit, or would you rather go through it together at ${centreLine(strategy)}?` : "Shall I send it over with a sample kit?"}\n\n${signOff(ctx)}`;
    } else {
      subject = `Before ${b?.name || "the next package"} is specified on ${projectShort(lead)}`.slice(0, 60);
      body = `${greet}\n\n${timing}\n\nTo get ahead of it, the ${b ? b.name.replace(/^The /, "") : "AllHome"} team can start on ${service} now, so the package is settled before it's needed on site.\n\nShall I set up a short call with them this week?\n\n${signOff(ctx)}`;
    }
  } else if (tp.channel === "whatsapp") {
    if (tp.touchNumber === 1) {
      body = `${greet} ${senderIntro(ctx)}. ${hook || ""}\n\n${timing} ${proof}\n\n${ask}`;
    } else if (tp.touchNumber === 2) {
      body = `${greet} following up on my earlier message. I've made a one-page spec sheet for ${project} with the ${listNames} systems, lead times and order-by dates.\n\nShall I send it here along with a sample kit?`;
    } else {
      body = `${greet}\n\n${timing}\n\nThe ${b ? b.name.replace(/^The /, "") : "AllHome"} team can start on ${service} now. Shall I set that up?`;
    }
  } else {
    if (tp.touchNumber === 1) body = `${greet} ${hook ? `${hook} ` : ""}${timing.split(/(?<=\.) /)[0]} ${proof} Would a sample kit be useful?`;
    else if (tp.touchNumber === 2) body = `${greet} I've put together a one-page spec sheet for ${project} (${listNames}, with lead times and order-by dates). Shall I send it over?`;
    else body = `${greet} ${b ? `${b.name} is usually specified at the next stage of ${project}.` : ""} The team can start on ${service} now. Would that help?`;
  }

  body = undash(body.replace(/ {2,}/g, " ").replace(/ +\n/g, "\n").trim());
  return { touchNumber: tp.touchNumber, channel: tp.channel, subject: subject ? undash(subject) : undefined, body, preview: body.slice(0, 100), groundedIn: grounded };
}

// ─── LLM drafting ───

function plain(t: string): string {
  return t
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*\*\*\s*|\s*\*\*\s*$/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .trim();
}

/**
 * The LLM edits a checked reference draft instead of writing from nothing: the draft already has the
 * right greeting, stage timing, verified figures and a single ask. The model's job is to make it read
 * like a person wrote it and to use the strongest recipient-specific detail. Output is then validated.
 */
async function llmTouch(lead: EnrichedLead, strategy: OutreachStrategy, persona: PersonaProfile, signals: SignalBundle, tp: TouchPoint, ctx: ContentCtx, draft: TouchContent): Promise<TouchContent> {
  const rules = CHANNEL_RULES[tp.channel];
  const pack = groundingPack(lead, signals, persona, strategy, tp, ctx);
  const greeting = draft.body.split(/[,\n]/)[0];
  const prompt = `${pack}

## Reference draft (facts, stage timing and ask are already correct)
${draft.subject ? `Subject: ${draft.subject}\n` : ""}${draft.body}

## Task
${PURPOSE[tp.touchNumber]}
Channel: ${rules.rules}
Rewrite the reference draft so it reads like a thoughtful person in the trade wrote it for this recipient. Keep the same greeting ("${greeting},"), the same facts and figures (exactly as written), the same stage timing and the same single ask. You may reorder and reword sentences, cut anything generic, and use one more specific detail from the pack (a recent signal or public project) if it makes the opening stronger. Do not add any claim that is not in the pack. Return the JSON now.`;
  const out = await llmGenerateText(SYSTEM, prompt);
  const m = out.match(/\{[\s\S]*\}/);
  let subject: string | undefined;
  let body = out;
  let groundedIn: string[] = [];
  if (m) {
    try {
      const p = JSON.parse(m[0]) as { subject?: string | null; body?: string; groundedIn?: string[] };
      body = p.body || "";
      subject = p.subject || undefined;
      groundedIn = Array.isArray(p.groundedIn) ? p.groundedIn.map(String).slice(0, 5) : [];
    } catch {
      /* use raw text */
    }
  }
  body = enforceSignOff(undash(plain(body)).replace(/\p{Extended_Pictographic}️?/gu, "").replace(/!/g, ".").replace(/ {2,}/g, " "), tp.channel, ctx);
  subject = tp.channel === "email" ? undash(plain(subject || "")).slice(0, 70) || undefined : undefined;
  if (!body || body.length < 40) throw new Error("empty or too-short LLM draft");
  const lower = body.toLowerCase();
  const banned = BANNED.find((b) => lower.includes(b.toLowerCase()));
  if (banned) throw new Error(`draft used a banned phrase: ${banned}`);
  if (body.length > rules.maxLength * 1.4) throw new Error("draft too long for channel");
  // Structural checks: right greeting first, one question, figures copied exactly from the pack
  if (!body.trimStart().toLowerCase().startsWith(greeting.toLowerCase())) throw new Error("draft does not open with the greeting");
  const questions = (body.match(/\?/g) || []).length;
  if (questions < 1 || questions > 2) throw new Error(`draft has ${questions} questions`);
  if (/\b(over|more than|nearly|almost|around) \d/i.test(body)) throw new Error("draft paraphrased a figure");
  const figures = body.match(/\d[\d,]*\+/g) || [];
  const unknown = figures.find((n) => !pack.includes(n) && !draft.body.includes(n));
  if (unknown) throw new Error(`draft used a figure not in the pack: ${unknown}`);
  return { touchNumber: tp.touchNumber, channel: tp.channel, subject, body, preview: body.slice(0, 100), groundedIn };
}

// ─── Spec sheet ───

function buildSpecSheet(lead: EnrichedLead, strategy: OutreachStrategy): string {
  const b = strategy.bundle;
  const rows = (b?.items || []).map((i) => {
    const brand = getBrand(i.brandId);
    const radar = strategy.radar?.find((r) => r.brandId === i.brandId);
    const when = radar?.status === "now" ? "Specify now" : radar?.status === "upcoming" ? `In ~${radar.weeksUntil} wks` : "Add-on";
    const orderBy = radar?.orderBy ? new Date(radar.orderBy).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "n/a";
    return `| ${i.brandName} | ${(brand?.productLines || []).slice(0, 3).join(", ")} | ${brand?.facts[0] || ""} | ${when} | ~${brand?.leadTimeWeeks ?? "?"} wks | ${orderBy} | ${i.centre ? i.centre.centre.city : "n/a"} |`;
  });
  return [
    `# AllHome Specification Sheet: ${lead.projectName || lead.companyName}`,
    ``,
    `**Prepared for:** ${lead.contactUnknown ? lead.companyName : `${lead.contactName}${lead.contactTitle ? `, ${lead.contactTitle}` : ""} · ${lead.companyName}`}`,
    `**Project:** ${lead.projectAssumed ? "Details to be confirmed" : `${lead.projectType ? PROJECT_TYPES[lead.projectType] : "Premium project"} · ${lead.projectCity || ""}${lead.projectValue ? ` · ${lead.projectValue}` : ""} · Stage: ${STAGES[stageIndex(lead.projectStage || "design")].label}`}`,
    ``,
    `| Brand | Recommended systems | Proof point | Window | Lead time* | Order by* | Nearest centre |`,
    `|---|---|---|---|---|---|---|`,
    ...rows,
    ``,
    `**Why one collective:** ${b?.vendorsReplaced || rows.length} categories through one AllHome relationship, with consistent finishes, coordinated delivery and a single point of after-sales.`,
    strategy.experienceCentre ? `**Visit:** ${strategy.experienceCentre.brandName}, ${strategy.experienceCentre.centre.address}` : "",
    `*Lead times and order-by dates are planning estimates. Confirm them with the brand team.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Main ───

export async function runContentForgeAgent(
  lead: EnrichedLead,
  signals: SignalBundle,
  intent: IntentScore,
  persona: PersonaProfile,
  strategy: OutreachStrategy,
  ctx: ContentCtx = { senderName: "AllHome Specifier Desk", senderTitle: "Specification Partner, AllHome" }
): Promise<GeneratedContent> {
  const start = Date.now();
  sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "running");
  try {
    const useLLM = llmEnabled();
    const touches: TouchContent[] = [];
    let llmCount = 0;
    // Sequential: keeps within free-tier rate limits and lets each touch be checked on its own
    for (const tp of strategy.cadence) {
      const fallback = templateTouch(lead, strategy, signals, tp, ctx);
      if (!useLLM) {
        touches.push(fallback);
        continue;
      }
      try {
        touches.push(await llmTouch(lead, strategy, persona, signals, tp, ctx, fallback));
        llmCount++;
      } catch (err) {
        console.warn(`[Agent 6] LLM draft rejected for touch ${tp.touchNumber}, using template:`, String(err).slice(0, 160));
        touches.push(fallback);
      }
    }

    const primary = (strategy.bundle?.items || []).filter((i) => i.role === "primary");
    const focusNames = joinNames(primary.map((i) => i.brandName));
    const typeWord = lead.projectType ? PROJECT_TYPES[lead.projectType].toLowerCase().split(" / ")[0] : "premium";
    const content: GeneratedContent = {
      leadId: lead.id,
      touches,
      specSheet: buildSpecSheet(lead, strategy),
      linkedinPost: `On most ${typeWord} projects, the facade, windows, lighting, bath and finishes come from separate vendors. Every hand-off is a chance for the design intent to slip.\n\nAt the ${stageLabel(lead)} stage, specifying ${focusNames} together keeps one palette, one schedule and one point of after-sales.\n\nWhich category is hardest for you to coordinate on site?`,
      drafter: llmCount === 0 ? "template" : llmCount === touches.length ? "llm" : "mixed",
      linkedinHeadlineSuggestion: `Specification partner for architects and designers | ${focusNames} | AllHome`,
      generatedAt: new Date().toISOString(),
    };

    if (touches.length) {
      await generatedContentCol().insertMany(touches.map((t) => ({ _id: nanoid(), leadId: lead.id, ...t, subject: t.subject || null, generatedAt: content.generatedAt })));
    }

    const summary = `${touches.length} touches (${touches.map((t) => `T${t.touchNumber}:${t.channel}`).join(", ")}) + spec sheet${llmCount ? ` · LLM-edited ${llmCount}/${touches.length}` : " · templates"}`;
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "complete", summary);
    sseManager.emit("content_update", lead.id, content);
    console.log(`✅ Agent 6 complete in ${Date.now() - start}ms: ${summary}`);
    return content;
  } catch (error) {
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "error", undefined, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
