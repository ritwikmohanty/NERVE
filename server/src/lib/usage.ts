/**
 * API usage meter + daily budgets.
 *
 * Every real call to a paid / quota-limited provider (Tavily, Groq, Apollo) is counted here,
 * per UTC day, across the whole deployment — the keys are shared by every workspace.
 * Autopilot prospecting checks the remaining budget before it spends anything.
 *
 * On top of that, every call passes a hard daily SAFETY LIMIT (all features together). Past it the
 * call is refused and the caller uses its fallback (templates, rule-based scoring, "no public
 * information found"), so a busy public demo can never run up the provider quotas.
 * Provider failures are recorded and shown in Settings -> API usage, so a fallback is never silent.
 *
 * Budgets are deliberately conservative defaults sized to the providers' free tiers:
 *   - Tavily free plan: 1,000 search credits / month  (≈ 33 / day)
 *   - Groq free plan: per-model request & token limits per minute and per day
 * Override with env vars when you have paid plans.
 */
import { getDB } from "../db/index.js";

export type Provider = "tavily" | "groq" | "apollo";

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

/** Shared daily budgets for Autopilot (all workspaces together). */
export const DAILY_BUDGET: Record<Provider, number> = {
  tavily: num(process.env.DAILY_TAVILY_BUDGET, 40),
  groq: num(process.env.DAILY_GROQ_BUDGET, 400),
  apollo: num(process.env.DAILY_APOLLO_BUDGET, 40),
};

/** Hard daily ceilings for ALL features together. Must be >= the Autopilot budget above. */
export const HARD_LIMIT: Record<Provider, number> = {
  tavily: Math.max(DAILY_BUDGET.tavily, num(process.env.TAVILY_DAILY_HARD_LIMIT, 50)),
  groq: Math.max(DAILY_BUDGET.groq, num(process.env.GROQ_DAILY_HARD_LIMIT, 900)),
  apollo: Math.max(DAILY_BUDGET.apollo, num(process.env.APOLLO_DAILY_HARD_LIMIT, 50)),
};

export class QuotaGuardError extends Error {
  constructor(public provider: Provider) {
    super(`${provider} daily safety limit reached (${HARD_LIMIT[provider]} calls); using the fallback`);
    this.name = "QuotaGuardError";
  }
}

export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Calls made today, kept in memory too so a DB hiccup never blocks a request. */
let memDay = dayKey();
const mem: Record<Provider, number> = { tavily: 0, groq: 0, apollo: 0 };

function rollDay() {
  const today = dayKey();
  if (today !== memDay) {
    memDay = today;
    mem.tavily = mem.groq = mem.apollo = 0;
    failCount.tavily = failCount.groq = failCount.apollo = 0;
    blocked.tavily = blocked.groq = blocked.apollo = 0;
  }
}

export interface ProviderFailure { at: string; provider: Provider; message: string; fallback: string }
const failures: ProviderFailure[] = [];
const failCount: Record<Provider, number> = { tavily: 0, groq: 0, apollo: 0 };
const blocked: Record<Provider, number> = { tavily: 0, groq: 0, apollo: 0 };

/** Record a provider error (rate limit, timeout, HTTP error) and the fallback that was used. Never throws. */
export function recordFailure(provider: Provider, error: unknown, fallback: string): void {
  rollDay();
  failCount[provider] += 1;
  failures.unshift({ at: new Date().toISOString(), provider, message: String(error instanceof Error ? error.message : error).slice(0, 200), fallback });
  failures.length = Math.min(failures.length, 25);
}

/**
 * Call before every real provider request. Throws QuotaGuardError once today's hard limit is reached;
 * every caller already catches errors and falls back, so this can only ever degrade, never break.
 */
export function guardCall(provider: Provider): void {
  rollDay();
  if (mem[provider] >= HARD_LIMIT[provider]) {
    blocked[provider] += 1;
    throw new QuotaGuardError(provider);
  }
}

/** Load today's count from the DB into memory at boot, so a restart can't reset the safety limit. */
export async function primeUsage(): Promise<void> {
  await usageToday().catch(() => undefined);
}

/** Count one real provider call. Fire-and-forget; never throws. */
export function recordUsage(provider: Provider, n = 1): void {
  rollDay();
  mem[provider] += n;
  try {
    void getDB()
      .collection<{ _id: string }>("api_usage")
      .updateOne({ _id: memDay }, { $inc: { [provider]: n }, $set: { updatedAt: new Date().toISOString() } }, { upsert: true })
      .catch(() => {});
  } catch {
    /* DB not connected yet (e.g. during boot) — the in-memory count still applies */
  }
}

export interface UsageToday {
  day: string;
  used: Record<Provider, number>;
  budget: Record<Provider, number>;
  remaining: Record<Provider, number>;
  /** Hard daily safety limits (all features) */
  hardLimit: Record<Provider, number>;
  /** Provider errors today, and calls refused by the safety limit */
  failures: Record<Provider, number>;
  blocked: Record<Provider, number>;
  recentFailures: ProviderFailure[];
}

/** Today's usage (max of DB and memory, so restarts don't reset the count). */
export async function usageToday(): Promise<UsageToday> {
  rollDay();
  let doc: Partial<Record<Provider, number>> = {};
  try {
    doc = ((await getDB().collection<{ _id: string }>("api_usage").findOne({ _id: memDay })) as Partial<Record<Provider, number>>) || {};
  } catch {
    /* use memory only */
  }
  const used = {
    tavily: Math.max(mem.tavily, Number(doc.tavily) || 0),
    groq: Math.max(mem.groq, Number(doc.groq) || 0),
    apollo: Math.max(mem.apollo, Number(doc.apollo) || 0),
  };
  // Keep memory in sync after a restart
  mem.tavily = used.tavily;
  mem.groq = used.groq;
  mem.apollo = used.apollo;
  return {
    day: memDay,
    used,
    budget: { ...DAILY_BUDGET },
    remaining: {
      tavily: Math.max(0, DAILY_BUDGET.tavily - used.tavily),
      groq: Math.max(0, DAILY_BUDGET.groq - used.groq),
      apollo: Math.max(0, DAILY_BUDGET.apollo - used.apollo),
    },
    hardLimit: { ...HARD_LIMIT },
    failures: { ...failCount },
    blocked: { ...blocked },
    recentFailures: failures.filter((f) => f.at.slice(0, 10) === memDay).slice(0, 10),
  };
}
