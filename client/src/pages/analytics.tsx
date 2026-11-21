import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Download, Loader2, RefreshCw, TrendingUp, Users, MapPin, MessageSquare, Brain } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AnalyticsData } from "@/lib/types";

const DIM_LABELS: Record<string, string> = {
  specifierInfluence: "Specifier Influence", segmentFit: "Segment Fit", projectValue: "Project Value", stageFit: "Stage Fit",
  centreProximity: "Centre Proximity", signalStrength: "Signal Strength", portfolioFit: "Portfolio Fit",
  contactReachability: "Reachability", engagementHistory: "Engagement History",
};

function Card({ title, icon, children, className = "", tour }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string; tour?: string }) {
  return (
    <div className={`border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] ${className}`} data-tour={tour}>
      <p className="text-xs font-black uppercase tracking-wider flex items-center gap-2 mb-3">{icon} {title}</p>
      {children}
    </div>
  );
}

function Bars({ rows, max }: { rows: Array<{ label: string; value: number; sub?: string; color?: string }>; max?: number }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.label} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-2">
          <span className="text-[11px] font-bold truncate">{r.label}</span>
          <div className="h-4 bg-muted border-2 border-black overflow-hidden">
            <motion.div className="h-full" style={{ background: r.color || "#EA435F" }} initial={{ width: 0 }} animate={{ width: `${(r.value / m) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.04 }} />
          </div>
          <span className="text-[11px] font-black font-mono min-w-10 text-right">{r.sub ?? r.value}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="text-xs font-semibold text-muted-foreground">No data yet — launch a few missions.</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { catalog } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      setData(await api.analytics());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function exportCsv() {
    const blob = await api.exportCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allhome-nerve-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const brandColor = (id: string) => catalog?.brands.find((b) => b.id === id)?.color;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">Analytics</h1>
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">What's converting — by segment, city, brand and bundle</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="h-9 px-3 border-2 border-black bg-white text-xs font-black uppercase flex items-center gap-1.5"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
            <button onClick={exportCsv} data-tour="analytics-export" className="h-9 px-3 border-2 border-black bg-secondary text-xs font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0_0_#000]"><Download className="size-3.5" /> Export CSV</button>
          </div>
        </div>

        {error && <p className="text-xs font-bold text-white bg-destructive border-2 border-black px-3 py-2">{error}</p>}
        {!data && loading && <div className="py-20 text-center"><Loader2 className="size-6 animate-spin mx-auto" /></div>}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-tour="analytics-kpis">
              {[
                { l: "Leads", v: data.totals.leads },
                { l: "Reply rate", v: `${Math.round(data.totals.replyRate * 100)}%` },
                { l: "Interested", v: data.totals.positive },
                { l: "Visits booked", v: data.totals.visits },
                { l: "Handed to sales", v: data.totals.handedOff },
              ].map((k) => (
                <div key={k.l} className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
                  <p className="text-3xl font-black font-mono">{k.v}</p>
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">{k.l}</p>
                </div>
              ))}
            </div>

            <Card tour="analytics-funnel" title="Outreach funnel" icon={<TrendingUp className="size-4" />}>
              <div className="flex items-end gap-2 h-44">
                {data.funnel.map((f, i) => {
                  const max = Math.max(1, data.funnel[0].count);
                  return (
                    <div key={f.stage} className="flex-1 flex flex-col items-center h-full gap-1 min-w-0">
                      {/* Bar track has its own height so the % is exact (labels sit outside it) */}
                      <div className="flex-1 w-full flex flex-col justify-end items-center">
                        <span className="text-sm font-black font-mono">{f.count}</span>
                        <motion.div className="w-full border-2 border-black" style={{ background: ["#1A1A18", "#0A66C2", "#FFDA5C", "#599D77", "#14B8A6", "#EA435F"][i] }} initial={{ height: 0 }} animate={{ height: `${Math.max(3, (f.count / max) * 85)}%` }} transition={{ duration: 0.6, delay: i * 0.06 }} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-center leading-tight h-6">{f.stage}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card title="By segment" icon={<Users className="size-4" />}>
                <Bars rows={data.bySegment.map((r) => ({ label: r.label, value: r.count, sub: `${r.positive}/${r.count}` }))} />
              </Card>
              <Card title="By city" icon={<MapPin className="size-4" />}>
                <Bars rows={data.byCity.map((r) => ({ label: r.label, value: r.count, sub: `${r.positive}/${r.count}`, color: "#0A66C2" }))} />
              </Card>
              <Card title="By project stage" icon={<BarChart3 className="size-4" />}>
                <Bars rows={data.byStage.map((r) => ({ label: r.label, value: r.count, sub: `${r.positive}/${r.count}`, color: "#599D77" }))} />
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Brands pitched (positive replies)" icon={<MessageSquare className="size-4" />}>
                <Bars rows={data.byBrand.map((b) => ({ label: b.brandName, value: b.pitched, sub: `${b.positive}/${b.pitched}`, color: brandColor(b.brandId) }))} />
              </Card>
              <Card tour="analytics-bundles" title="Bundle conversion by segment (Agent 10)" icon={<Brain className="size-4" />}>
                <div className="space-y-2">
                  {data.bundles.map((b, i) => (
                    <div key={i} className="border-2 border-black p-2 flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">{b.segmentLabel}</p>
                        <p className="text-[11px] font-bold truncate">{b.brandNames.join(" + ")}</p>
                      </div>
                      <span className={`text-[11px] font-black px-2 py-0.5 border-2 border-black ${b.rate > 0 ? "bg-[#599D77] text-white" : "bg-muted"}`}>{b.positive}/{b.total}</span>
                    </div>
                  ))}
                  {data.bundles.length === 0 && <p className="text-xs font-semibold text-muted-foreground">No outcomes recorded yet.</p>}
                </div>
              </Card>
            </div>

            <Card tour="analytics-weights" title="Learned scoring weights (Agent 10)" icon={<Brain className="size-4" />}>
              <p className="text-[11px] font-semibold text-muted-foreground mb-3">Every reply nudges these weights: positive replies reinforce the dimensions that predicted intent, negative ones dampen them. Scores for future leads use the updated weights.</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                {data.weights.map((w) => {
                  const delta = Number(w.weight) - Number(w.previousWeight ?? w.weight);
                  return (
                    <div key={w.dimension} className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <div>
                        <p className="text-[11px] font-bold">{DIM_LABELS[w.dimension] || w.dimension}</p>
                        <div className="h-2 bg-muted border border-black mt-0.5"><div className="h-full bg-black" style={{ width: `${Math.min(100, Number(w.weight) * 400)}%` }} /></div>
                      </div>
                      <span className="text-[11px] font-black font-mono">
                        {Number(w.weight).toFixed(3)}
                        {Math.abs(delta) > 0.0005 && <span className={delta > 0 ? "text-[#2E7D4F]" : "text-primary"}> {delta > 0 ? "▲" : "▼"}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
