import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { ApiUsage } from "@/lib/types";

const PROVIDERS: Array<{ id: keyof ApiUsage["used"]; label: string; use: string; fallback: string }> = [
  { id: "tavily", label: "Tavily web search", use: "Researching real firms, Autopilot news scans", fallback: "Research continues without those results; nothing is invented." },
  { id: "groq", label: "Groq AI calls", use: "Message editing, profile extraction, reply classification, calendar chat", fallback: "Checked templates and rule-based scoring take over." },
  { id: "apollo", label: "Apollo lookups", use: "Company size and industry", fallback: "The profile is built from web research only." },
];

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

/**
 * Today's API usage against the Autopilot budget and the hard daily safety limit, plus any
 * provider failures and the fallback each one triggered. Nothing degrades silently.
 */
export function ApiUsagePanel() {
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsage(await api.usage());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load usage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const totalFailures = usage ? usage.failures.tavily + usage.failures.groq + usage.failures.apollo : 0;
  const totalBlocked = usage ? usage.blocked.tavily + usage.blocked.groq + usage.blocked.apollo : 0;
  const healthy = usage && totalFailures === 0 && totalBlocked === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {usage && (
          <span className={`text-[10px] font-black uppercase border-2 border-black px-2 py-1 flex items-center gap-1 ${healthy ? "bg-[#599D77] text-white" : "bg-secondary"}`}>
            {healthy ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
            {healthy ? "No provider errors since the server started" : `${totalFailures} provider error${totalFailures === 1 ? "" : "s"} · ${totalBlocked} call${totalBlocked === 1 ? "" : "s"} held back`}
          </span>
        )}
        <span className="text-[10px] font-bold text-muted-foreground">Day {usage?.day || "…"} (UTC), shared by every workspace on this server</span>
        <button type="button" onClick={load} className="ml-auto h-7 px-2 border-2 border-black bg-white text-[10px] font-black uppercase flex items-center gap-1 hover:bg-secondary">
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {error && <p className="text-xs font-bold text-primary">{error}</p>}

      <div className="grid md:grid-cols-3 gap-2">
        {PROVIDERS.map((p) => {
          if (!usage) return <div key={p.id} className="border-2 border-black p-3 h-28 animate-pulse bg-muted" />;
          const used = usage.used[p.id];
          const hard = usage.hardLimit[p.id] || 1;
          const pct = Math.min(100, (used / hard) * 100);
          const budgetPct = Math.min(100, (usage.budget[p.id] / hard) * 100);
          return (
            <div key={p.id} className="border-2 border-black p-3 space-y-2 bg-white">
              <div className="flex items-baseline gap-2">
                <p className="text-xs font-black">{p.label}</p>
                <p className="ml-auto text-sm font-black tabular-nums">
                  {used}
                  <span className="text-muted-foreground text-[10px]"> / {usage.hardLimit[p.id]}</span>
                </p>
              </div>
              <div className="relative h-3 border-2 border-black bg-muted" title={`Autopilot budget ${usage.budget[p.id]} · safety limit ${usage.hardLimit[p.id]}`}>
                <div className={`h-full ${pct >= 100 ? "bg-primary" : pct > 75 ? "bg-secondary" : "bg-[#599D77]"}`} style={{ width: `${pct}%` }} />
                <div className="absolute top-[-4px] bottom-[-4px] w-0.5 bg-black" style={{ left: `${budgetPct}%` }} />
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground leading-snug">{p.use}</p>
              <p className="text-[10px] font-bold leading-snug">
                Autopilot stops at {usage.budget[p.id]} (the tick). Everything stops at {usage.hardLimit[p.id]}.
                {(usage.failures[p.id] > 0 || usage.blocked[p.id] > 0) && (
                  <span className="text-primary"> {usage.failures[p.id]} errors, {usage.blocked[p.id]} held back since the server started.</span>
                )}
              </p>
              <p className="text-[10px] font-semibold border-t border-black/10 pt-1.5">If unavailable: {p.fallback}</p>
            </div>
          );
        })}
      </div>

      <div className="border-2 border-black bg-white">
        <p className="px-3 py-2 text-[10px] font-black uppercase border-b-2 border-black flex items-center gap-1.5">
          <Activity className="size-3.5" /> Recent provider errors
        </p>
        {usage && usage.recentFailures.length === 0 ? (
          <p className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">None since the server last started. Every call made since then succeeded.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {(usage?.recentFailures || []).map((f, i) => (
              <li key={i} className="px-3 py-2 text-[11px] grid grid-cols-[48px_64px_1fr] gap-2">
                <span className="font-mono font-bold">{time(f.at)}</span>
                <span className="font-black uppercase">{f.provider}</span>
                <span>
                  <span className="font-bold">{f.message}</span>
                  <span className="text-muted-foreground"> · used: {f.fallback}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
