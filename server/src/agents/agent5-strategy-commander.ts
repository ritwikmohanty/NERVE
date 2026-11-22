import { nanoid } from "nanoid";
import { strategiesCol } from "../db/index.js";
import { sseManager } from "../lib/sse.js";
import { buildBundle, buildRadar } from "../allhome/bundler.js";
import { bestCentreForBrands, SEGMENTS, STAGES, stageIndex } from "../allhome/catalog.js";
import type {
  EnrichedLead,
  SignalBundle,
  IntentScore,
  PersonaProfile,
  OutreachStrategy,
  OutreachChannel,
  ToneFramework,
  TouchPoint,
  StrategyDecision,
} from "../types/index.js";

const AGENT_NUMBER = 5;
const AGENT_NAME = "Strategy Commander";
const CH: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", linkedin_dm: "LinkedIn DM" };

function selectChannels(lead: EnrichedLead, signals: SignalBundle, intent: IntentScore): { primary: OutreachChannel; secondary?: OutreachChannel; decision: StrategyDecision } {
  const seg = lead.segment || "architect";
  const hasPhone = !!lead.contactPhone;
  const hasEmail = !!lead.contactEmail;
  const hasLinkedIn = !!lead.contactLinkedIn;
  let primary: OutreachChannel;
  let secondary: OutreachChannel | undefined;
  let reasoning: string;

  if ((seg === "architect" || seg === "id_firm" || seg === "contractor" || seg === "homeowner") && hasPhone) {
    primary = "whatsapp";
    secondary = hasEmail ? "email" : hasLinkedIn ? "linkedin_dm" : undefined;
    reasoning = `${SEGMENTS[seg].label}s in India run projects on WhatsApp, sharing finish photos and site updates there is normal, and it's where a quick "can we send samples?" gets answered.`;
  } else if (seg === "developer" && hasEmail) {
    primary = "email";
    secondary = hasLinkedIn ? "linkedin_dm" : hasPhone ? "whatsapp" : undefined;
    reasoning = `Developer procurement teams evaluate vendors over email (pricing, lead times, spec sheets get forwarded internally). LinkedIn reaches the project director as a second touch.`;
  } else if (hasLinkedIn && signals.linkedinActivityScore > 60) {
    primary = "linkedin_dm";
    secondary = hasEmail ? "email" : undefined;
    reasoning = `${lead.contactName} is active on LinkedIn (${signals.linkedinActivityScore}/100), so a DM that references their published work lands well.`;
  } else if (!hasEmail && !hasPhone && !hasLinkedIn) {
    primary = seg === "developer" ? "email" : "whatsapp";
    secondary = seg === "developer" ? "linkedin_dm" : "email";
    reasoning = `No verified contact details are available for ${lead.companyName} yet (they are never guessed). The drafts are ready. Add the principal's ${primary === "whatsapp" ? "WhatsApp number" : "email"} to send them.`;
  } else {
    primary = hasEmail ? "email" : "whatsapp";
    secondary = undefined;
    reasoning = "Best available channel given the contact data.";
  }

  return {
    primary,
    secondary,
    decision: {
      decision: `${CH[primary] || primary} first${secondary ? `, then ${CH[secondary] || secondary} as the follow-up` : ""}`,
      reasoning,
      factors: [`Segment: ${SEGMENTS[seg].label}`, `Intent: ${intent.tier} (${intent.compositeScore}/100)`, hasPhone ? "WhatsApp-reachable" : "No phone", hasEmail ? "Email available" : "No email"],
    },
  };
}

function selectTone(persona: PersonaProfile, intent: IntentScore): { tone: ToneFramework; decision: StrategyDecision } {
  const map: Record<string, ToneFramework> = {
    design_architect: "insight_led",
    aesthetic_designer: "relationship_first",
    developer_buyer: "insight_led",
    execution_contractor: "peer_problem",
    premium_homeowner: "relationship_first",
  };
  let tone = map[persona.archetype] || "insight_led";
  if (intent.tier === "HOT" && intent.compositeScore >= 88) tone = "growth_urgency";
  return {
    tone,
    decision: {
      decision: `Tone: ${tone.replace(/_/g, " ")}`,
      reasoning: `${persona.archetypeLabel} persona → ${persona.preferredTone}`,
      factors: [`Persona: ${persona.archetypeLabel}`, `Intent: ${intent.tier}`, `Avoid: ${persona.avoidInMessaging.slice(0, 2).join(", ")}`],
    },
  };
}

/** Next Tuesday/Thursday at 10:30 IST — mid-morning, after site visits start, before lunch. */
function firstSendTime(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getUTCDay();
  const add = day < 2 ? 2 - day : day < 4 ? 4 - day : 9 - day; // Tue (2) or Thu (4)
  d.setUTCDate(d.getUTCDate() + (add === 0 ? 2 : add));
  d.setUTCHours(0, 10 * 60 + 30 - 330, 0, 0); // 10:30 IST = 05:00 UTC
  return d;
}

export async function runStrategyCommanderAgent(
  lead: EnrichedLead,
  signals: SignalBundle,
  intent: IntentScore,
  persona: PersonaProfile,
  ctx: { brands?: string[] } = {}
): Promise<OutreachStrategy> {
  const start = Date.now();
  sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "running");
  try {
    const stage = lead.projectStage || "design";
    const segment = lead.segment || "architect";
    const enabledBrands = ctx.brands?.length ? ctx.brands : undefined;

    // F1 + F2 + F3
    const bundle = buildBundle({ segment, projectType: lead.projectType || "villa", projectStage: stage, city: lead.projectCity, budgetTier: lead.budgetTier, enabledBrands });
    const radar = buildRadar(stage, enabledBrands);
    // Prefer a centre in the lead's own city for any brand in the bundle
    const experienceCentre = bestCentreForBrands(lead.projectCity, bundle.items.map((i) => i.brandId));

    const { primary, secondary, decision: channelDecision } = selectChannels(lead, signals, intent);
    const { tone, decision: toneDecision } = selectTone(persona, intent);

    // Stage-timed cadence: T1 now (open windows), T2 short follow-up with spec sheet,
    // T3 lands just before the next brand's specification window opens.
    const sendDate = firstSendTime();
    const followUpDays = intent.tier === "HOT" ? 3 : intent.tier === "WARM" ? 5 : 7;
    const nextWeeks = bundle.nextBrand?.weeksUntil;
    const t3Days = nextWeeks !== undefined ? Math.min(120, Math.max(followUpDays + 7, nextWeeks * 7 - 7)) : followUpDays + 9;
    const at = (days: number) => {
      const d = new Date(sendDate);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString();
    };
    const primaryNames = bundle.items.filter((i) => i.role === "primary").map((i) => i.brandId);

    const cadence: TouchPoint[] = [
      { touchNumber: 1, channel: primary, scheduledAt: at(0), dayOffset: 0, toneFramework: tone, focusBrands: primaryNames, purpose: "Introduce the bundle for the open specification window" },
      { touchNumber: 2, channel: secondary || primary, scheduledAt: at(followUpDays), dayOffset: followUpDays, toneFramework: tone, focusBrands: primaryNames, purpose: `Share the spec sheet + invite to ${experienceCentre?.centre.city || "the nearest"} experience centre` },
      {
        touchNumber: 3,
        channel: primary,
        scheduledAt: at(t3Days),
        dayOffset: t3Days,
        toneFramework: tone,
        focusBrands: bundle.nextBrand ? [bundle.nextBrand.brandId] : primaryNames,
        purpose: bundle.nextBrand ? `Pre-specify ${bundle.nextBrand.brandName} before its window opens` : "Final check-in",
      },
    ];

    const decisions: StrategyDecision[] = [
      channelDecision,
      toneDecision,
      {
        decision: `Bundle: ${bundle.headline}`,
        reasoning: bundle.items.map((i) => `${i.brandName}: ${i.reason}`).join(" | "),
        factors: [`Stage: ${STAGES[stageIndex(stage)].label}`, `${bundle.vendorsReplaced} vendors consolidated into one AllHome relationship`],
      },
      {
        decision: `Stage-timed cadence: Day 0 / +${followUpDays} / +${t3Days}`,
        reasoning: bundle.nextBrand
          ? `Touch 3 is timed to land ~1 week before ${bundle.nextBrand.brandName}'s specification window opens (~${bundle.nextBrand.weeksUntil} weeks out)`
          : "No upcoming brand windows, so standard follow-up spacing",
        factors: cadence.map((c) => `T${c.touchNumber}: ${c.channel} · ${c.focusBrands?.join(", ")}`),
      },
      {
        decision: experienceCentre ? `Invite to ${experienceCentre.brandName} experience centre, ${experienceCentre.centre.city}` : "No experience centre nearby",
        reasoning: experienceCentre
          ? experienceCentre.sameCity
            ? "Same-city centre. Seeing the finishes in person persuades specifiers more than a PDF"
            : `Nearest centre ~${experienceCentre.distanceKm} km away. Offer a sample kit plus a visit during their next trip`
          : "Offer sample kits instead",
        factors: experienceCentre ? [experienceCentre.centre.address] : [],
      },
    ];

    const strategy: OutreachStrategy = {
      leadId: lead.id,
      primaryChannel: primary,
      secondaryChannel: secondary,
      sendTimestamp: sendDate.toISOString(),
      timezone: "Asia/Kolkata",
      toneFramework: tone,
      cadence,
      decisions,
      bundle,
      radar,
      experienceCentre,
      generatedAt: new Date().toISOString(),
    };

    await strategiesCol().insertOne({ _id: nanoid(), ...strategy, cadence: JSON.stringify(cadence), decisions: JSON.stringify(decisions), bundle: JSON.stringify(bundle) });

    const summary = `${primary}${secondary ? " + " + secondary : ""} | ${bundle.items.map((i) => i.brandName).join(", ")} | T3 at +${t3Days}d`;
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "complete", summary);
    sseManager.emit("strategy_update", lead.id, strategy);
    console.log(`✅ Agent 5 complete in ${Date.now() - start}ms, ${summary}`);
    return strategy;
  } catch (error) {
    sseManager.emitAgentStatus(lead.id, AGENT_NUMBER, AGENT_NAME, "error", undefined, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
