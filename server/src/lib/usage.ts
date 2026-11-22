/**
 * API usage meter + daily budgets.
 *
 * Every real call to a paid / quota-limited provider (Tavily, Groq, Apollo) is counted here,
 * per UTC day, across the whole deployment — the keys are shared by every workspace.
 * Autopilot prospecting checks the remaining budget before it spends anything; the other
 * features are only metered (never blocked), so nothing that worked before can break.
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
  }
}

/** Count one real provider call. Fire-and-forget — never throws. */
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
  };
}
