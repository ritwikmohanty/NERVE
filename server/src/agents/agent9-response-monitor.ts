import { nanoid } from "nanoid";
import { responseEventsCol, leadsCol, visitsCol, strategiesCol } from "../db/index.js";
import { bestCentreForBrands, getBrand } from "../allhome/catalog.js";
import { sseManager } from "../lib/sse.js";
import { llmGenerateText, hasLLMKey, llmEnabled } from "../lib/llm.js";
import { config } from "../config.js";
import type {
  ResponseAction,
  ResponseEvent,
  ResponseSentiment,
  OutreachChannel,
  DeliveryResult,
} from "../types/index.js";

const AGENT_NUMBER = 9;
const AGENT_NAME = "Response Monitor";

// ─── Sentiment Classification (LLM + keyword fallback) ───

const SENTIMENT_SYSTEM_PROMPT = `You are an NLP sentiment classifier for B2B sales responses. Classify the response into EXACTLY one category:

- "positive": Interested, wants to learn more, agrees to meeting, asks follow-up questions, thanks for reaching out
- "neutral": Acknowledges but non-committal, asks to follow up later, "let me think about it", auto-replies
- "negative": Explicit rejection, "not interested", "remove me", hostile tone, "do not contact"
- "no_reply": Use this only when explicitly told there was no response

Also determine the recommended next action:
- "book_visit": Positive AND they want to see samples / visit a showroom or experience centre
- "escalate_human": For positive responses — hand off to a human sales rep
- "continue_cadence": For neutral responses — proceed with next touch
- "cancel_sequence": For negative responses — stop all outreach, mark as do-not-contact
- "nurture": For no-reply — add to long-term nurture sequence

Return as JSON:
{
  "sentiment": "positive" | "neutral" | "negative" | "no_reply",
  "reasoning": "one sentence explaining the classification",
  "action": "book_visit" | "escalate_human" | "continue_cadence" | "cancel_sequence" | "nurture"
}

Return ONLY the JSON.`;

async function classifySentimentLLM(
  messageBody: string
): Promise<{ sentiment: ResponseSentiment; reasoning: string; action: ResponseEvent["action"] }> {
  try {
    const response = await llmGenerateText(SENTIMENT_SYSTEM_PROMPT, `Classify this response:\n\n"${messageBody}"`);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        sentiment: ResponseSentiment;
        reasoning: string;
        action: ResponseEvent["action"];
      };
      const actionFor: Record<ResponseSentiment, ResponseEvent["action"]> = {
        positive: "escalate_human",
        neutral: "continue_cadence",
        negative: "cancel_sequence",
        no_reply: "nurture",
      };
      if (parsed.sentiment in actionFor) {
        return {
          sentiment: parsed.sentiment,
          reasoning: parsed.reasoning || "Classified by LLM",
          // Keep sentiment and action consistent even if the model mixes them up
          action: parsed.sentiment === "positive" && (parsed.action === "book_visit" || VISIT_RE.test(messageBody)) ? "book_visit" : actionFor[parsed.sentiment],
        };
      }
    }
  } catch {
    // Fall through to keyword classifier
  }

  return classifySentimentKeywords(messageBody);
}

// ─── Keyword-Based Fallback Classifier ───

/** Wants to see / touch the product → book an experience-centre visit */
const VISIT_RE = /(visit|experience cent(re|er)|showroom|come (by|over|down)|drop by|see (the )?(samples|finishes|products|options)|walkthrough|walk-through|in person)/i;

function classifySentimentKeywords(
  messageBody: string
): { sentiment: ResponseSentiment; reasoning: string; action: ResponseEvent["action"] } {
  const text = messageBody.toLowerCase();

  // Negative patterns
  const negativePatterns = [
    /not interested/i,
    /no thanks/i,
    /remove me/i,
    /unsubscribe/i,
    /stop (contacting|emailing|messaging)/i,
    /do not contact/i,
    /please don't/i,
    /not (?:a )?good (?:fit|time)/i,
    /f[*u]ck off/i,
    /leave me alone/i,
    /not (?:a )?priority/i,
    /(?:we're|we are) all set/i,
    /not looking/i,
    /no longer/i,
  ];

  for (const pattern of negativePatterns) {
    if (pattern.test(text)) {
      return {
        sentiment: "negative",
        reasoning: `Matched negative pattern: "${pattern.source}"`,
        action: "cancel_sequence",
      };
    }
  }

  // Positive patterns
  const positivePatterns = [
    /(?:yes|sure|sounds good|interested|love to|happy to|let's)/i,
    /(?:book|schedule|meeting|call|chat|demo|15.?min)/i,
    /(?:tell me more|learn more|send.+(?:info|details|deck))/i,
    /(?:great|awesome|perfect|wonderful|fantastic|lovely|nice)/i,
    /(?:samples?|visit|showroom|experience cent)/i,
    /(?:when.*available|free.*(?:this|next) week)/i,
  ];

  let positiveCount = 0;
  for (const pattern of positivePatterns) {
    if (pattern.test(text)) positiveCount++;
  }

  if (positiveCount >= 1 && VISIT_RE.test(text)) {
    return {
      sentiment: "positive",
      reasoning: "Positive reply asking to see products in person — booking an experience-centre visit",
      action: "book_visit",
    };
  }

  if (positiveCount >= 2) {
    return {
      sentiment: "positive",
      reasoning: `Matched ${positiveCount} positive patterns — strong buying signals`,
      action: "escalate_human",
    };
  }

  if (positiveCount === 1) {
    return {
      sentiment: "positive",
      reasoning: "Single positive signal detected — likely interested",
      action: "escalate_human",
    };
  }

  // Neutral patterns
  const neutralPatterns = [
    /(?:maybe|perhaps|possibly|let me think)/i,
    /(?:follow up|reach out).*(?:later|next|month|quarter)/i,
    /(?:busy|swamped|slammed) (?:right now|at the moment)/i,
    /auto.?reply|out of (?:office|town)/i,
    /(?:thanks|thank you)(?!.*(?:interested|love|happy|book|schedule|call))/i,
  ];

  for (const pattern of neutralPatterns) {
    if (pattern.test(text)) {
      return {
        sentiment: "neutral",
        reasoning: `Matched neutral pattern: "${pattern.source}" — non-committal response`,
        action: "continue_cadence",
      };
    }
  }

  // Default: neutral
  return {
    sentiment: "neutral",
    reasoning: "No strong positive or negative signals detected — treating as neutral",
    action: "continue_cadence",
  };
}

// ─── Process Response (called by webhook or pipeline) ───

export async function runResponseMonitorAgent(
  leadId: string,
  channel: OutreachChannel,
  messageBody?: string,
  noReplyNote?: string
): Promise<ResponseEvent> {
  const startTime = Date.now();

  sseManager.emitAgentStatus(leadId, AGENT_NUMBER, AGENT_NAME, "running");

  try {
    let sentiment: ResponseSentiment;
    let reasoning: string;
    let action: ResponseAction;
    let visitInfo: ResponseEvent["visit"];

    if (!messageBody) {
      // No reply case
      sentiment = "no_reply";
      reasoning = noReplyNote || "No response received within monitoring window";
      action = "nurture";
    } else {
      // Classify the response — use keyword-based in simulation mode, LLM otherwise
      const classification = !llmEnabled()
        ? classifySentimentKeywords(messageBody)
        : await classifySentimentLLM(messageBody);
      sentiment = classification.sentiment;
      reasoning = classification.reasoning;
      action = classification.action;
    }

    // Book an experience-centre visit (F3)
    if (action === "book_visit") {
      const lead = await leadsCol().findOne({ _id: leadId });
      const strategyDoc = await strategiesCol().findOne({ leadId }, { sort: { generatedAt: -1 } });
      let bundleBrands: string[] = [];
      try {
        bundleBrands = ((JSON.parse(String(strategyDoc?.bundle || "{}")) as { items?: Array<{ brandId: string }> }).items || []).map((i) => i.brandId);
      } catch { /* ignore */ }
      const match = bestCentreForBrands(lead?.projectCity as string | undefined, bundleBrands);
      if (match && lead) {
        const when = new Date();
        when.setUTCDate(when.getUTCDate() + (when.getUTCDay() >= 4 ? 4 : 2));
        when.setUTCHours(5, 30, 0, 0); // 11:00 IST
        const visit = {
          centreId: match.centre.id,
          centreCity: match.centre.city,
          brandName: getBrand(match.centre.brandId)?.name || match.centre.brandId,
          scheduledAt: when.toISOString(),
        };
        await visitsCol().insertOne({
          _id: nanoid(),
          orgId: lead.orgId,
          leadId,
          companyName: lead.companyName,
          contactName: lead.contactName,
          address: match.centre.address,
          mapUrl: match.centre.mapUrl,
          status: "scheduled",
          createdAt: new Date().toISOString(),
          ...visit,
        });
        visitInfo = visit;
        reasoning = `${reasoning} Visit booked at ${visit.brandName}, ${visit.centreCity}.`;
      }
    }

    const responseEvent: ResponseEvent = {
      leadId,
      channel,
      messageBody,
      sentiment,
      classificationReasoning: reasoning,
      receivedAt: new Date().toISOString(),
      action,
      visit: visitInfo,
    };

    // Persist to DB
    await responseEventsCol().insertOne({
      _id: nanoid(),
      leadId,
      channel,
      messageBody: messageBody || null,
      sentiment,
      classificationReasoning: reasoning,
      action,
      receivedAt: responseEvent.receivedAt,
      visit: visitInfo || null,
    });

    // Update lead status based on action
    if (action === "cancel_sequence") {
      await leadsCol().updateOne(
        { _id: leadId },
        { $set: { status: "do_not_contact" } }
      );
    } else if (action === "escalate_human") {
      await leadsCol().updateOne({ _id: leadId }, { $set: { status: "active" } });
    } else if (action === "book_visit") {
      await leadsCol().updateOne({ _id: leadId }, { $set: { status: "visit_booked" } });
    }

    const durationMs = Date.now() - startTime;
    const summary = `${sentiment.toUpperCase()} → ${action.replace(/_/g, " ")}`;

    sseManager.emitAgentStatus(leadId, AGENT_NUMBER, AGENT_NAME, "complete", summary);
    sseManager.emit("response_update", leadId, responseEvent);

    console.log(`✅ Agent 9 complete in ${durationMs}ms — ${summary}`);
    return responseEvent;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    sseManager.emitAgentStatus(leadId, AGENT_NUMBER, AGENT_NAME, "error", undefined, errMsg);
    throw error;
  }
}

// ─── Simulate a "no reply" after delivery (auto-trigger in pipeline) ───

export async function simulateNoReply(
  leadId: string,
  deliveryResults: DeliveryResult[]
): Promise<ResponseEvent> {
  // In a real system, this would wait for actual responses via webhooks.
  // For the hackathon pipeline, simulate realistic response scenarios
  // based on the delivery channel and a deterministic hash of the lead ID.
  const firstDelivery = deliveryResults.find((d) => d.touchNumber === 1);
  const channel = firstDelivery?.channel || "email";

  // Deterministic "response" based on lead ID — so same lead always gets same outcome
  const hash = leadId.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const outcome = Math.abs(hash) % 100;

  // Distribution: 15% positive, 10% negative, 25% neutral, 50% no_reply
  if (outcome < 15) {
    const positiveResponses = [
      "Interesting timing — we were actually looking into this. Could you share more details about how this works for companies our size?",
      "Thanks for reaching out! This looks relevant. Let's find 15 minutes this week to chat.",
      "Hi, I saw your message. We're evaluating solutions in this space. Can you send over a deck?",
      "Sure, happy to connect. I'm free Thursday at 2pm IST — does that work?",
      "This caught my eye. Let's schedule a quick call — send me your Calendly.",
      "Lovely — can we visit your experience centre on Thursday to see the finishes in person?",
      "Interested. Could my team come by the showroom next week to see samples?",
    ];
    const msg = positiveResponses[Math.abs(hash) % positiveResponses.length];
    return runResponseMonitorAgent(leadId, channel, msg);
  } else if (outcome < 25) {
    const negativeResponses = [
      "Not interested, thanks. Please remove me from your list.",
      "We're all set in this area. Please don't follow up.",
      "Not a priority for us right now. Thanks anyway.",
    ];
    const msg = negativeResponses[Math.abs(hash) % negativeResponses.length];
    return runResponseMonitorAgent(leadId, channel, msg);
  } else if (outcome < 50) {
    const neutralResponses = [
      "Thanks for the note. I'm swamped this quarter — can you follow up next month?",
      "Interesting. Let me loop in my team and get back to you.",
      "Appreciate the outreach. Not the best time, but keep me on your radar.",
      "Out of office until next Monday. Will review when I'm back.",
    ];
    const msg = neutralResponses[Math.abs(hash) % neutralResponses.length];
    return runResponseMonitorAgent(leadId, channel, msg);
  } else {
    // No reply (most common in real outreach)
    return runResponseMonitorAgent(leadId, channel, undefined);
  }
}
