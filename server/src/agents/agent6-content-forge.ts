import { nanoid } from "nanoid";
import { generatedContentCol } from "../db/index.js";
import { sseManager } from "../lib/sse.js";
import { llmGenerateText, llmEnabled } from "../lib/llm.js";
import { ALLHOME, getBrand, PROJECT_TYPES, STAGES, stageIndex, SEGMENTS, type Brand } from "../allhome/catalog.js";
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
    rules: "WhatsApp: 3 short paragraphs maximum, under 450 characters in total, plain text, no emoji. Read naturally on a phone. No subject line.",
  },
  linkedin_dm: {
    maxLength: 380,
    rules: "LinkedIn DM: under 320 characters, 2–3 sentences, conversational and specific. No subject line, no emoji.",
  },
  email: {
    maxLength: 1400,
    rules: "Email: subject line under 60 characters that names the project or the specific capability (never 'Quick note' / 'Following up'). Body 90–150 words in 3–4 short paragraphs, plain text, one clear ask, then a sign-off with the sender's name and title.",
  },
};

const BANNED = ["I hope this finds you well", "I wanted to reach out", "reaching out", "touch base", "synergy", "game-changer", "game changer", "revolutionize", "revolutionise", "cutting-edge", "world-class", "one-stop shop", "elevate your", "unlock", "leverage", "circle back", "just checking in"];

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

function stageLabel(lead: EnrichedLead): string {
  return STAGES[stageIndex(lead.projectStage || "design")].label.toLowerCase();
}

/** How we may refer to the project without inventing anything. */
function projectRef(lead: EnrichedLead): string {
  if (lead.projectName) return lead.projectName;
  const type = lead.projectType ? PROJECT_TYPES[lead.projectType].toLowerCase() : "premium";
  return lead.projectAssumed ? "your upcoming projects" : `your ${type} project${lead.projectCity ? ` in ${lead.projectCity}` : ""}`;
}

/** One concrete, verifiable detail about the recipient (or undefined). */
function recipientHook(lead: EnrichedLead, signals: SignalBundle): string | undefined {
  const top = signals.topSignal;
  if (lead.dataSource === "live") {
    if (top && top.category !== "other") return `I came across ${top.title.replace(/\.$/, "")}`;
    if (lead.portfolio?.[0]) return `I've been looking at ${lead.portfolio[0]}`;
    if (lead.specialties?.[0]) return `Your studio's work in ${lead.specialties[0].toLowerCase()} stood out`;
    return undefined;
  }
  if (!top) return undefined;
  const project = projectRef(lead);
  switch (top.category) {
    case "project_launch": return `Congratulations on ${project}`;
    case "possession_milestone": return `Good to see ${project} moving into interiors`;
    case "award_publication": return "Congratulations on the recent recognition for your work";
    case "exhibition": return "Good to hear your team was at Design POV";
    case "office_opening": return "Congratulations on the new studio";
    case "hiring_spike": return "Looks like the studio is growing fast";
    default: return undefined;
  }
}

function centreLine(strategy: OutreachStrategy): string {
  const c = strategy.experienceCentre;
  if (!c) return "one of our experience centres";
  const near = c.sameCity || c.distanceKm < 0 || c.distanceKm <= 150;
  return near ? `our ${c.brandName} experience centre in ${c.centre.city}` : `our ${c.brandName} experience centre in ${c.centre.city} (or we can courier a sample kit)`;
}

/** The only sign-off a draft may use — models otherwise invent sender names. */
function signOff(channel: OutreachChannel, ctx: ContentCtx): string {
  const who = /allhome/i.test(ctx.senderName) ? ctx.senderName : `${ctx.senderName}, AllHome`;
  return channel === "email" ? `Regards,\n${ctx.senderName}\n${ctx.senderTitle}` : `— ${who}`;
}

/** Replace whatever closing the model wrote with the exact sign-off. */
function enforceSignOff(body: string, channel: OutreachChannel, ctx: ContentCtx): string {
  const lines = body.trimEnd().split("\n");
  // Drop trailing closing lines (dash sign-offs, "Regards," / "Best," and short name/title lines after them)
  const closing = /^(—|–|-{1,2})\s*\S|^(warm\s+)?(best\s+)?(kind\s+)?(regards|wishes|thanks|thank you|cheers|sincerely)\b[,!.]?\s*$/i;
  let cut = lines.length;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 4); i--) {
    const l = lines[i].trim();
    if (!l) { cut = i; continue; }
    if (closing.test(l)) { cut = i; break; }
    if (l.length > 60 || /[?.!]$/.test(l)) break;
  }
  // Also drop an inline sign-off glued to the last sentence ("…centre? – AllHome Specifier Desk")
  const kept = lines.slice(0, cut).join("\n").trimEnd().replace(/\s+[—–-]{1,2}\s+[^?.!\n]*(allhome|desk|team)[^?.!\n]*$/i, "");
  return `${kept}\n\n${signOff(channel, ctx)}`;
}

/** Where in the build the featured brand is specified, relative to the project's current stage. */
function focusStageLine(lead: EnrichedLead, tp: TouchPoint): string {
  const b = brands(tp.focusBrands)[0];
  if (!b) return "";
  const stages = b.specifyAt.map((st) => STAGES[stageIndex(st)].label);
  if (lead.projectAssumed) return `${b.name} is typically specified during: ${stages.join(" / ")}.`;
  const cur = stageIndex(lead.projectStage || "design");
  const idx = b.specifyAt.map((st) => stageIndex(st));
  if (idx.includes(cur)) return `${b.name} is specified at the CURRENT stage (${STAGES[cur].label}) — say "now is when it is specified".`;
  const next = idx.filter((i) => i > cur).sort((x, y) => x - y)[0];
  if (next !== undefined) return `${b.name} is specified at a LATER stage (${STAGES[next].label}); the project is currently at ${STAGES[cur].label}. Say the project is "heading towards ${STAGES[next].label.toLowerCase()}, when ${b.name} is usually specified" — never say it is specified now.`;
  return `${b.name}'s usual specification stage (${stages.join(" / ")}) has passed — position it as a replacement / upgrade or for the next project.`;
}

/** The full grounding pack handed to the LLM — the only facts it may use. */
function groundingPack(lead: EnrichedLead, signals: SignalBundle, persona: PersonaProfile, strategy: OutreachStrategy, tp: TouchPoint, ctx: ContentCtx): string {
  const focus = brands(tp.focusBrands);
  const r = lead.research;
  const realSignals = signals.signals.filter((s) => s.category !== "linkedin_activity").slice(0, 3);
  return [
    `## About AllHome (sender)`,
    `${ALLHOME.positioning} ${ALLHOME.model}`,
    `Collective facts: ${ALLHOME.facts.join("; ")}.`,
    `Why it matters to specifiers: one relationship instead of separate vendors for facade, windows, lighting, bath, hardware and finishes — consistent finishes, coordinated delivery, one point of after-sales.`,
    ``,
    `## Brands to feature in THIS message`,
    ...focus.map((b) => `- ${b.name}${b.formalName ? ` (${b.formalName})` : ""}: ${b.pitch}\n  Product systems: ${b.productLines.join("; ")}\n  Services: ${b.services.join("; ") || "—"}\n  Verified figures: ${b.facts.join("; ")}${b.partners.length ? `\n  International brands carried: ${b.partners.slice(0, 6).join(", ")}` : ""}`),
    ``,
    `## Recipient`,
    `Name: ${lead.contactUnknown ? "UNKNOWN — address the studio/team, not a person" : `${lead.contactName}${lead.contactTitle ? `, ${lead.contactTitle}` : ""}`}`,
    `Firm: ${lead.companyName} (${lead.segment ? SEGMENTS[lead.segment].label : "specifier"})${lead.projectCity ? `, ${lead.projectCity}` : ""}`,
    r?.summary ? `Public profile: ${r.summary}` : "",
    lead.specialties?.length ? `Known for: ${lead.specialties.join(", ")}` : "",
    lead.portfolio?.length ? `Public projects: ${lead.portfolio.join("; ")}` : "",
    realSignals.length ? `Recent public signals:\n${realSignals.map((s) => `- ${s.title}${s.sourceUrl ? ` (${s.source})` : ""}`).join("\n")}` : "Recent public signals: none found",
    ``,
    `## Project`,
    lead.projectAssumed
      ? `Project details NOT provided. Do not name, size, type or describe any project (no "villa", "tower", "drawings of X"). Refer only to "${projectRef(lead)}" or to the firm's public work listed above.`
      : `${projectRef(lead)} — ${lead.projectType ? PROJECT_TYPES[lead.projectType] : ""}, currently at ${stageLabel(lead)} stage${lead.projectValue ? `, approx. ${lead.projectValue}` : ""}.`,
    lead.projectAssumed ? "" : `Internal planning notes (context only — do NOT quote timings, weeks or these phrases): ${strategy.bundle?.items.filter((i) => tp.focusBrands?.includes(i.brandId)).map((i) => `${i.brandName}: ${i.reason}`).join(" | ") || "—"}`,
    `Stage context: the project is currently at ${lead.projectAssumed ? "an unknown stage" : stageLabel(lead)}. ${focusStageLine(lead, tp)}`,
    ``,
    `## Persona`,
    `${persona.archetypeLabel}. Tone: ${persona.preferredTone}. What they care about (needs, NOT AllHome claims): ${persona.talkingPoints.slice(0, 3).join("; ")}. Avoid: ${persona.avoidInMessaging.join(", ")}.`,
    ``,
    `## Call to action options`,
    `Visit ${centreLine(strategy)}; or a sample kit / finish board; or a 20-minute call to review drawings.`,
    ``,
    `## Sender`,
    `${ctx.senderName}, ${ctx.senderTitle}`,
    `Exact sign-off to use: "${signOff(tp.channel, ctx).replace(/\n/g, " / ")}" (on email put the name and title on separate lines)`,
  ].filter((l) => l !== "").join("\n");
}

const PURPOSE: Record<number, string> = {
  1: "Touch 1 (first contact): open with the one recipient-specific detail, connect it to ONE concrete capability of the featured brand(s) relevant to the current stage, then one low-friction ask.",
  2: "Touch 2 (follow-up, a few days later): briefly reference the first message in one clause, then add new value — the attached one-page specification sheet (recommended product systems, lead times and order-by dates). Ask whether they'd like to review it at the experience centre or receive samples.",
  3: "Touch 3 (timed to the next specification window): explain that the project is approaching the stage where the featured brand is usually specified, offer one concrete service of that brand (e.g. lighting design & lux calculations, shop drawings, finish samples) so they can lock it in early. Polite, no pressure.",
};

const SYSTEM = `You are a senior B2B copywriter on AllHome's specification team in India, writing outreach to architects, interior designers, developers, contractors and premium homeowners.

Write like a knowledgeable industry peer: specific, concise, warm, never salesy. Indian business English.

Hard rules:
1. Use ONLY facts from the grounding pack. Never invent prices, discounts, delivery times, client names, project names, awards, statistics or personal details. Quote figures exactly as given (e.g. "3,500+ SKUs").
2. Mention at most two brands, and at most two figures, in one message — pick the most relevant to the recipient's stage.
3. Exactly one clear ask.
4. If the recipient's name is UNKNOWN, greet the studio/team ("Hello team at <Firm>,") — never invent a person.
5. If project details were not provided, do not name, type or describe a specific project.
6. Do not characterise the recipient's design language, style, intent or preferences unless the pack states it explicitly. Referencing a public project by name is fine; interpreting it is not.
7. Only claim products, services and figures listed for the featured brand. "What they care about" lines are the recipient's needs — never present them as AllHome capabilities.
8. Never use these phrases: ${BANNED.join(", ")}.
9. No markdown (no **, #, bullet symbols) — plain text only.
10. Open with a greeting line: "Hi <first name>," (or "Hello team at <Firm>," when the name is unknown). First name is normal in Indian design practice; never "Dear Sir/Madam".
11. Never state a number of weeks, a lead-time duration or a calendar date in the body. You may say the spec sheet "includes lead times and order-by dates" — the sheet carries the numbers.
12. End with the exact sign-off given in the pack under "Sender" — never invent or change a sender name.

Return ONLY JSON: {"subject": string|null, "body": string, "groundedIn": string[]}
"groundedIn" lists the 2–4 specific facts from the pack you actually used (short phrases).`;

// ─── Templates (deterministic fallback, same rules) ───

function templateTouch(lead: EnrichedLead, strategy: OutreachStrategy, persona: PersonaProfile, signals: SignalBundle, tp: TouchPoint, ctx: ContentCtx): TouchContent {
  const focus = brands(tp.focusBrands);
  const lead1 = focus[0];
  const names = joinNames(focus.map((b) => b.name));
  const greet = lead.contactUnknown ? `Hello team at ${lead.companyName},` : `Hi ${firstName(lead.contactName)},`;
  const hook = recipientHook(lead, signals);
  const project = projectRef(lead);
  const stage = stageLabel(lead);
  const centre = centreLine(strategy);
  const sign = `${ctx.senderName}\n${ctx.senderTitle}`;
  const capability = lead1 ? lead1.pitch : ALLHOME.positioning;
  const service = lead1?.services[0] ? lead1.services[0].charAt(0).toLowerCase() + lead1.services[0].slice(1) : "finish samples";
  const grounded = [lead1?.facts[0], hook ? "recipient signal / public work" : undefined, strategy.experienceCentre ? `${strategy.experienceCentre.brandName} centre, ${strategy.experienceCentre.centre.city}` : undefined].filter(Boolean) as string[];

  let subject: string | undefined;
  let body: string;

  if (tp.channel === "email") {
    if (tp.touchNumber === 1) {
      subject = `${lead1?.name || "AllHome"} for ${lead.projectName || `${lead.companyName}'s next project`}`.slice(0, 60);
      body = `${greet}\n\n${hook ? `${hook}. ` : ""}${lead.projectAssumed ? `For ${project}` : `With ${project} at the ${stage} stage`}, this is when ${names} ${focus.length > 1 ? "are" : "is"} usually specified.\n\n${capability}\n\nWould a 20-minute walkthrough at ${centre} be useful next week? We can bring options matched to your material palette.\n\nRegards,\n${sign}`;
    } else if (tp.touchNumber === 2) {
      subject = `Specification sheet: ${names}`.slice(0, 60);
      body = `${greet}\n\nFollowing my earlier note, I've prepared a one-page specification sheet for ${project}: the recommended ${names} systems, typical lead times and the order-by dates that keep the programme on track.\n\n${lead.segment === "developer" ? "It is laid out so your procurement team can compare it directly against current vendors." : "It is laid out to drop straight into your material schedule."}\n\nShall I walk you through it at ${centre}, or send it along with a sample kit?\n\nRegards,\n${sign}`;
    } else {
      subject = `Before ${lead1?.name || "the next package"} is specified`.slice(0, 60);
      body = `${greet}\n\n${lead.projectAssumed ? "As your current projects move forward" : `As ${project} moves towards its next stage`}, ${names} ${focus.length > 1 ? "are" : "is"} typically specified next. Locking ${focus.length > 1 ? "them" : "it"} in early avoids lead-time pressure on site.\n\nIf useful, the ${lead1?.name || "AllHome"} team can start with ${service} this week.\n\nRegards,\n${sign}`;
    }
  } else if (tp.channel === "whatsapp") {
    const g = lead.contactUnknown ? `Hello team at ${lead.companyName},` : `Hi ${firstName(lead.contactName)},`;
    if (tp.touchNumber === 1) {
      body = `${g} this is ${ctx.senderName} from AllHome. ${hook ? `${hook}. ` : ""}\n\n${lead1 ? lead1.pitch : capability}\n\nWould you like to see the options at ${centre}, or shall I send a sample kit?`;
    } else if (tp.touchNumber === 2) {
      body = `${g} sharing a one-page specification sheet for ${project} — ${names} with lead times and order-by dates. Happy to walk you through it at ${centre} whenever convenient.`;
    } else {
      body = `${g} ${lead.projectAssumed ? "as your projects move ahead" : `${project} is approaching the stage`} where ${names} ${focus.length > 1 ? "are" : "is"} usually specified. The ${lead1?.name || "AllHome"} team can start with ${service} — shall I set that up?`;
    }
  } else {
    const g = lead.contactUnknown ? `Hello ${lead.companyName} team —` : `Hi ${firstName(lead.contactName)} —`;
    if (tp.touchNumber === 1) body = `${g} ${hook ? `${hook}. ` : ""}${lead1 ? `${lead1.name}: ${lead1.facts[0]}.` : ""} Open to a short look at options for ${project}?`;
    else if (tp.touchNumber === 2) body = `${g} I've put together a one-page spec sheet (${names}, lead times, order-by dates) for ${project}. Shall I send it over?`;
    else body = `${g} ${names} usually gets specified at the next stage — happy to help lock it in early with ${service}.`;
  }

  return { touchNumber: tp.touchNumber, channel: tp.channel, subject, body: body.replace(/ {2,}/g, " ").trim(), preview: body.slice(0, 100), groundedIn: grounded };
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

async function llmTouch(lead: EnrichedLead, strategy: OutreachStrategy, persona: PersonaProfile, signals: SignalBundle, tp: TouchPoint, ctx: ContentCtx): Promise<TouchContent> {
  const rules = CHANNEL_RULES[tp.channel];
  const prompt = `${groundingPack(lead, signals, persona, strategy, tp, ctx)}

## Task
${PURPOSE[tp.touchNumber]}
Channel: ${rules.rules}
Write it now.`;
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
  body = enforceSignOff(plain(body).replace(/\p{Extended_Pictographic}\uFE0F?/gu, "").replace(/ {2,}/g, " "), tp.channel, ctx);
  subject = tp.channel === "email" ? plain(subject || "").slice(0, 70) || undefined : undefined;
  if (!body || body.length < 40) throw new Error("empty or too-short LLM draft");
  if (BANNED.some((b) => body.toLowerCase().includes(b.toLowerCase()))) throw new Error("draft used a banned phrase");
  if (body.length > rules.maxLength * 1.4) throw new Error("draft too long for channel");
  return { touchNumber: tp.touchNumber, channel: tp.channel, subject, body, preview: body.slice(0, 100), groundedIn };
}

// ─── Spec sheet ───

function buildSpecSheet(lead: EnrichedLead, strategy: OutreachStrategy): string {
  const b = strategy.bundle;
  const rows = (b?.items || []).map((i) => {
    const brand = getBrand(i.brandId);
    const radar = strategy.radar?.find((r) => r.brandId === i.brandId);
    const when = radar?.status === "now" ? "Specify now" : radar?.status === "upcoming" ? `In ~${radar.weeksUntil} wks` : "Add-on";
    const orderBy = radar?.orderBy ? new Date(radar.orderBy).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
    return `| ${i.brandName} | ${(brand?.productLines || []).slice(0, 3).join(", ")} | ${brand?.facts[0] || ""} | ${when} | ~${brand?.leadTimeWeeks ?? "—"} wks | ${orderBy} | ${i.centre ? i.centre.centre.city : "—"} |`;
  });
  return [
    `# AllHome Specification Sheet — ${lead.projectName || lead.companyName}`,
    ``,
    `**Prepared for:** ${lead.contactUnknown ? lead.companyName : `${lead.contactName}${lead.contactTitle ? `, ${lead.contactTitle}` : ""} · ${lead.companyName}`}`,
    `**Project:** ${lead.projectAssumed ? "Details to be confirmed" : `${lead.projectType ? PROJECT_TYPES[lead.projectType] : "Premium project"} · ${lead.projectCity || ""}${lead.projectValue ? ` · ${lead.projectValue}` : ""} · Stage: ${STAGES[stageIndex(lead.projectStage || "design")].label}`}`,
    ``,
    `| Brand | Recommended systems | Proof point | Window | Lead time* | Order by* | Nearest centre |`,
    `|---|---|---|---|---|---|---|`,
    ...rows,
    ``,
    `**Why one collective:** ${b?.vendorsReplaced || rows.length} categories through one AllHome relationship — consistent finishes, coordinated delivery and a single point of after-sales.`,
    strategy.experienceCentre ? `**Visit:** ${strategy.experienceCentre.brandName} — ${strategy.experienceCentre.centre.address}` : "",
    `*Lead times and order-by dates are planning estimates — confirm with the brand team.`,
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
    // Sequential: keeps within free-tier rate limits and lets each touch be checked on its own
    for (const tp of strategy.cadence) {
      const fallback = templateTouch(lead, strategy, persona, signals, tp, ctx);
      if (!useLLM) {
        touches.push(fallback);
        continue;
      }
      try {
        touches.push(await llmTouch(lead, strategy, persona, signals, tp, ctx));
      } catch (err) {
        console.warn(`[Agent 6] LLM draft rejected for touch ${tp.touchNumber}, using template:`, String(err).slice(0, 160));
        touches.push(fallback);
      }
    }

    const focusNames = joinNames((strategy.bundle?.items || []).filter((i) => i.role === "primary").map((i) => i.brandName));
    const content: GeneratedContent = {
      leadId: lead.id,
      touches,
      specSheet: buildSpecSheet(lead, strategy),
      linkedinPost: `On ${lead.projectType ? PROJECT_TYPES[lead.projectType].toLowerCase() : "premium"} projects, the facade, windows, lighting, bath and finishes are usually sourced from separate vendors — and design intent erodes at every hand-off.\n\nAt the ${stageLabel(lead)} stage, specifying ${focusNames} together keeps one palette, one schedule and one point of after-sales.\n\nWhich category is hardest for you to coordinate on site?`,
      linkedinHeadlineSuggestion: `Specification partner for architects & designers — ${focusNames} | AllHome`,
      generatedAt: new Date().toISOString(),
    };

    if (touches.length) {
      await generatedContentCol().insertMany(touches.map((t) => ({ _id: nanoid(), leadId: lead.id, ...t, subject: t.subject || null, generatedAt: content.generatedAt })));
    }

    const summary = `${touches.length} touches (${touches.map((t) => `T${t.touchNumber}:${t.channel}`).join(", ")}) + spec sheet${useLLM ? " · LLM, grounded" : " · templates"}`;
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "complete", summary);
    sseManager.emit("content_update", lead.id, content);
    console.log(`✅ Agent 6 complete in ${Date.now() - start}ms — ${summary}`);
    return content;
  } catch (error) {
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "error", undefined, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
