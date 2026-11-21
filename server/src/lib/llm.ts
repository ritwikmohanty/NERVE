import { createGroq } from "@ai-sdk/groq";
import { generateText, generateObject } from "ai";
import { config } from "../config.js";
import { isSeeding, setSeeding } from "./runtime.js";
import type { ZodSchema } from "zod";

const groq = createGroq({
  apiKey: config.groqApiKey,
});

// Groq-hosted model. Override with GROQ_MODEL — Groq retires models periodically
// (llama-3.3-70b-versatile is no longer available).
export const LLM_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MODEL = LLM_MODEL;

/**
 * Thrown when the LLM can't be used (no API key, or rate-limited / quota exhausted).
 * Callers are expected to catch this and fall back to their rule-based / template logic.
 */
export class LLMUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMUnavailableError";
  }
}

/** True when a usable Groq API key is configured. */
export function hasLLMKey(): boolean {
  return !!(config.groqApiKey && config.groqApiKey.length > 10);
}

/** Temporarily disable LLM calls (e.g. while seeding the demo workspace at boot). */
export function suppressLLM(value: boolean) {
  setSeeding(value);
}

/**
 * Should agents use the LLM right now? Requires a key, and either live mode or
 * LLM_IN_SIMULATION=true (messages are still never sent in simulation).
 */
export function llmEnabled(): boolean {
  return !isSeeding() && hasLLMKey() && (!config.simulationMode || config.llmInSimulation);
}

/** Check if the error is a quota/rate-limit error */
function isQuotaError(error: unknown): boolean {
  const msg = String(error);
  return /RESOURCE_EXHAUSTED|quota|429|rate[_ ]limit/i.test(msg);
}

/** Groq rate limits are per model, so a second model gives us independent headroom. */
const MODEL_CHAIN = Array.from(new Set([MODEL, process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b"]));

/** gpt-oss models are reasoning models — keep reasoning light to save tokens/latency. */
function providerOptionsFor(model: string) {
  return model.startsWith("openai/gpt-oss") ? { groq: { reasoningEffort: "low" as const } } : undefined;
}

/**
 * Generate free-form text from Groq. Tries the primary model, then the fallback model
 * on rate limits. Throws LLMUnavailableError when no key is set or every model is limited —
 * callers catch that and use their template / rule-based fallback.
 */
export async function llmGenerateText(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  if (!hasLLMKey()) {
    throw new LLMUnavailableError("GROQ_API_KEY not set");
  }

  let lastError: unknown;
  for (const model of MODEL_CHAIN) {
    try {
      const { text } = await generateText({
        model: groq(model),
        system: systemPrompt,
        prompt: userMessage,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(30_000),
        providerOptions: providerOptionsFor(model),
      });
      return text;
    } catch (error) {
      lastError = error;
      if (!isQuotaError(error)) throw error;
      console.warn(`[LLM] ${model} rate-limited${model !== MODEL_CHAIN[MODEL_CHAIN.length - 1] ? " — trying fallback model" : ""}`);
    }
  }
  throw new LLMUnavailableError(`Groq rate limit on all models: ${String(lastError).slice(0, 120)}`);
}

/** Generate structured JSON from Groq using a Zod schema */
export async function llmGenerateObject<T>(
  systemPrompt: string,
  userMessage: string,
  schema: ZodSchema<T>,
  schemaName: string
): Promise<T> {
  if (!hasLLMKey()) {
    throw new LLMUnavailableError(`GROQ_API_KEY not set — cannot generate structured object for "${schemaName}"`);
  }

  try {
    const { object } = await generateObject({
      model: groq(MODEL),
      system: systemPrompt,
      prompt: userMessage,
      schema,
      schemaName,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(30_000),
    });
    return object;
  } catch (error) {
    if (isQuotaError(error)) {
      throw new LLMUnavailableError(`Groq rate limit for "${schemaName}"`);
    }
    throw error;
  }
}
