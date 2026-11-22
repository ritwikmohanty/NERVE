import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Radar, Loader2, Play, FlaskConical, Check, ExternalLink, AlertTriangle, Search, Brain, Filter, Workflow,
  CalendarClock, Save, X, ChevronDown, ChevronUp, Coins, MapPin, Lock, ArrowRight,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  AutopilotConfig, AutopilotEstimate, AutopilotOverview, Prospect, ProspectRun, Segment, TriggerType,
} from "@/lib/types";

const PROSPECTABLE: Segment[] = ["architect", "id_firm", "developer", "contractor"];
const EXTRA_CITIES = ["Pune", "Gurugram", "Noida", "Ahmedabad", "Goa", "Kochi", "Lucknow", "Surat"];
const MAX_CITIES = 6;
const ACTIVE_RUN = ["scanning", "running_pipelines"];

const STAGE_LABEL: Record<string, string> = {
  design: "Concept & Design", structure: "Structure", mep: "MEP", fitout: "Fit-out", finishing: "Finishing", handover: "Handover",
};

function ago(iso?: string): string {
  if (!iso) return "date not stated";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 60) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function when(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST";
}

/** Mirrors the server's planner so the estimate updates while editing. */
function estimate(cfg: AutopilotConfig, ov: AutopilotOverview, live: boolean): AutopilotEstimate {
  const unit = live ? ov.unitCosts.live : ov.unitCosts.sample;
  const combos = cfg.triggers.length * cfg.cities.length;
  const needed = Math.ceil(cfg.firmsPerRun / 3) + 1;
  const max = ov.limits.maxQueriesPerRun;
  const queries = Math.min(combos, Math.min(max, Math.max(needed, Math.min(cfg.cities.length, max))));
  const scan = { tavily: queries * unit.perQuery.tavily, groq: queries * unit.perQuery.groq };
  const per = unit.perPipeline;
  const k = cfg.pipelinesPerRun;
  const pipelineCost = { tavily: k * per.tavily, groq: k * per.groq, apollo: k * per.apollo };
  const total = { tavily: scan.tavily + pipelineCost.tavily, groq: scan.groq + pipelineCost.groq, apollo: pipelineCost.apollo };
  const everyFirm = { firms: cfg.firmsPerRun, tavily: scan.tavily + cfg.firmsPerRun * per.tavily, groq: scan.groq + cfg.firmsPerRun * per.groq, apollo: cfg.firmsPerRun * per.apollo };
  const r = ov.usage.remaining;
  const short: string[] = [];
  if (total.tavily > r.tavily) short.push(`${total.tavily} web searches needed, ${r.tavily} left today`);
  if (total.groq > r.groq) short.push(`${total.groq} AI calls needed, ${r.groq} left today`);
  return { live, queries, scan, pipelines: k, pipelineCost, total, everyFirm, perPipeline: per, fitsBudget: !short.length, shortfall: short.join("; ") || undefined };
}

const sameConfig = (a: AutopilotConfig, b: AutopilotConfig) =>
  JSON.stringify([a.triggers, a.segments, a.cities, a.firmsPerRun, a.pipelinesPerRun, a.lookbackDays, a.schedule]) ===
  JSON.stringify([b.triggers, b.segments, b.cities, b.firmsPerRun, b.pipelinesPerRun, b.lookbackDays, b.schedule]);

export default function AutopilotPage() {
  const { session, catalog } = useAuth();
  const isDemo = session?.user.role === "demo";
  const [ov, setOv] = useState<AutopilotOverview | null>(null);
  const [draft, setDraft] = useState<AutopilotConfig | null>(null);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ run: ProspectRun; prospects: Prospect[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState<"live" | "sample" | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const dirty = !!(ov && draft && !sameConfig(ov.config, draft));

  const loadOverview = useCallback(async () => {
    try {
      const data = await api.autopilot();
      setOv(data);
      setLoadError("");
      setDraft((d) => d ?? data.config);
      setSelectedRun((r) => r ?? data.activeRunId ?? data.runs[0]?.id ?? null);
      return data;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load Autopilot");
      return null;
    }
  }, []);

  const loadRun = useCallback(async (id: string) => {
    try {
      setDetail(await api.autopilotRun(id));
    } catch {
      /* run list refresh will recover */
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (selectedRun) void loadRun(selectedRun);
  }, [selectedRun, loadRun]);

  // Poll while a run or an on-demand pipeline is working
  const working =
    !!ov?.activeRunId ||
    (!!detail && (ACTIVE_RUN.includes(detail.run.status) || detail.prospects.some((p) => p.status === "queued" || p.status === "running")));
  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => {
      void loadOverview();
      if (selectedRun) void loadRun(selectedRun);
    }, 2500);
    return () => clearInterval(t);
  }, [working, selectedRun, loadOverview, loadRun]);

  const cities = useMemo(
    () => Array.from(new Set([...(catalog?.cities || []), ...EXTRA_CITIES, ...(draft?.cities || [])])).sort(),
    [catalog, draft?.cities]
  );

  if (loadError && !ov) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000] max-w-md space-y-3">
          <p className="font-black uppercase flex items-center gap-2"><AlertTriangle className="size-5" /> Autopilot unavailable</p>
          <p className="text-sm">{loadError}</p>
          <button onClick={() => void loadOverview()} className="h-9 px-4 border-2 border-black bg-primary text-white font-black uppercase text-xs">Retry</button>
        </div>
      </div>
    );
  }
  if (!ov || !draft) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>;
  }

  const live = ov.live;
  const est = estimate(draft, ov, live);
  const sampleEst = estimate(draft, ov, false);
  const set = (patch: Partial<AutopilotConfig>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const active = !!ov.activeRunId;

  async function save(): Promise<boolean> {
    if (!draft) return false;
    setSaving(true);
    setError("");
    try {
      const data = await api.saveAutopilot(draft);
      setOv(data);
      setDraft(data.config);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function run(sample: boolean) {
    setError("");
    setStarting(sample ? "sample" : "live");
    try {
      if (dirty && !(await save())) return;
      const { runId } = await api.runAutopilot(sample);
      setSelectedRun(runId);
      setDetail(null);
      await loadOverview();
      await loadRun(runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start Autopilot");
    } finally {
      setStarting(null);
    }
  }

  async function runProspect(p: Prospect) {
    setRowBusy(p.id);
    setError("");
    try {
      await api.runProspect(p.id);
      if (selectedRun) await loadRun(selectedRun);
      await loadOverview();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Couldn't start the pipeline");
    } finally {
      setRowBusy(null);
    }
  }

  async function dismiss(p: Prospect) {
    setRowBusy(p.id);
    try {
      await api.dismissProspect(p.id);
      if (selectedRun) await loadRun(selectedRun);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't dismiss");
    } finally {
      setRowBusy(null);
    }
  }

  const selectedTriggers = ov.triggers.filter((t) => draft.triggers.includes(t.id));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight flex items-center gap-3"><Radar className="size-8" /> Autopilot</h1>
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">NERVE finds the firms itself — from events that mean materials will be specified soon</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
            <span className={`border-2 border-black px-2 py-1 flex items-center gap-1 ${live ? "bg-[#CEEBFC]" : "bg-white"}`} title={live ? "Tavily news search + Groq extraction (read-only)" : "No research keys — sample scans only"}>
              <Search className="size-3.5" /> {live ? "Live research" : "Sample mode"}
            </span>
            {ov.sendingLocked && (
              <span className="border-2 border-black px-2 py-1 bg-secondary flex items-center gap-1"><Lock className="size-3.5" /> Nothing is sent</span>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="grid sm:grid-cols-3 gap-3" data-tour="autopilot-how">
          {[
            { icon: Search, title: "1 · Scan the news", body: "Searches recent news per trigger and city. AI extracts the firms named — a firm is only kept if its name appears in the source.", cost: live ? "1 search + 1 AI call per query" : "Sample: no API calls" },
            { icon: Filter, title: "2 · Triage for free", body: "Ranks every firm on trigger type, recency, specifier influence, nearby experience centre and a named project.", cost: "No API calls" },
            { icon: Workflow, title: "3 · Full pipeline for the top few", body: "Only the top firms get all 10 agents. The rest wait in a shortlist — run any of them on demand.", cost: `~${ov.unitCosts.live.perPipeline.tavily} searches + ~${ov.unitCosts.live.perPipeline.groq} AI calls per firm` },
          ].map(({ icon: Icon, title, body, cost }) => (
            <div key={title} className="border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000] space-y-1.5">
              <p className="text-xs font-black uppercase flex items-center gap-2"><Icon className="size-4" /> {title}</p>
              <p className="text-[11px] font-semibold text-muted-foreground leading-snug">{body}</p>
              <p className="text-[10px] font-black uppercase inline-flex items-center gap-1 border-2 border-black px-1.5 py-0.5 bg-[#FFDA5C]"><Coins className="size-3" /> {cost}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          {/* ── Setup ── */}
          <div className="border-2 border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0_0_#000] space-y-5">
            <div data-tour="autopilot-triggers" className="space-y-2">
              <p className="text-xs font-black uppercase">Triggers to watch</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                {ov.triggers.map((t) => {
                  const on = draft.triggers.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => set({ triggers: toggle(draft.triggers, t.id as TriggerType) })} className={`text-left border-2 border-black p-2.5 transition-all ${on ? "bg-accent shadow-[3px_3px_0_0_#000]" : "bg-white opacity-70 hover:opacity-100"}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{t.label}</span>
                        <span className={`ml-auto size-5 shrink-0 border-2 border-black flex items-center justify-center ${on ? "bg-black text-white" : "bg-white"}`}>{on && <Check className="size-3" />}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{t.description}</p>
                      <p className="text-[10px] mt-1 leading-snug">{t.allhomeAngle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-5">
              <div className="space-y-2">
                <p className="text-xs font-black uppercase">Segments</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROSPECTABLE.map((s) => {
                    const on = draft.segments.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => set({ segments: toggle(draft.segments, s) })} className={`border-2 border-black px-2.5 py-1 text-xs font-bold ${on ? "bg-black text-white" : "bg-white"}`}>
                        {catalog?.segments[s]?.label || s}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground">Private homeowners are never prospected automatically.</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black uppercase">Cities <span className="text-muted-foreground">({draft.cities.length}/{MAX_CITIES})</span></p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {cities.map((c) => {
                    const on = draft.cities.includes(c);
                    const full = !on && draft.cities.length >= MAX_CITIES;
                    const hasCentre = catalog?.cities.includes(c);
                    return (
                      <button key={c} type="button" disabled={full} onClick={() => set({ cities: toggle(draft.cities, c) })} className={`border-2 border-black px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 disabled:opacity-30 ${on ? "bg-black text-white" : "bg-white"}`} title={hasCentre ? "Has an AllHome centre" : "No AllHome centre — visits go to the nearest one"}>
                        {hasCentre && <MapPin className="size-3" />} {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-5" data-tour="autopilot-volume">
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase">Firms to find per run</p>
                <input type="range" min={1} max={ov.limits.maxFirmsPerRun} value={draft.firmsPerRun} onChange={(e) => { const n = Number(e.target.value); set({ firmsPerRun: n, pipelinesPerRun: Math.min(draft.pipelinesPerRun, n) }); }} className="w-full accent-[#EA435F]" />
                <p className="text-xs font-black">{draft.firmsPerRun} firm{draft.firmsPerRun === 1 ? "" : "s"} <span className="text-muted-foreground font-bold">· max {ov.limits.maxFirmsPerRun}{isDemo ? " in the demo" : ""}</span></p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase">Full pipelines per run</p>
                <input type="range" min={0} max={Math.min(ov.limits.maxPipelinesPerRun, draft.firmsPerRun)} value={draft.pipelinesPerRun} onChange={(e) => set({ pipelinesPerRun: Number(e.target.value) })} className="w-full accent-[#EA435F]" />
                <p className="text-xs font-black">Top {draft.pipelinesPerRun} of {draft.firmsPerRun} <span className="text-muted-foreground font-bold">· max {ov.limits.maxPipelinesPerRun}{isDemo ? " in the demo" : ""}</span></p>
              </div>
              <p className="xl:col-span-2 text-[11px] font-bold border-2 border-black bg-[#FFF6D6] px-2.5 py-2 flex gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Not every firm gets a full pipeline. Each one costs ~{est.perPipeline.tavily} web searches and ~{est.perPipeline.groq} AI calls, so only the top {draft.pipelinesPerRun} run automatically and the other {Math.max(0, draft.firmsPerRun - draft.pipelinesPerRun)} are shortlisted.</span>
              </p>
            </div>

            <div className="grid xl:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase">Look-back window</p>
                <div className="flex flex-wrap gap-1.5">
                  {[7, 14, 30, 60].map((d) => (
                    <button key={d} type="button" onClick={() => set({ lookbackDays: d })} className={`border-2 border-black px-2.5 py-1 text-xs font-bold ${draft.lookbackDays === d ? "bg-black text-white" : "bg-white"}`}>{d} days</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase flex items-center gap-1.5"><CalendarClock className="size-4" /> Schedule</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["off", "daily", "weekly"] as const).map((s) => (
                    <button key={s} type="button" disabled={s !== "off" && !ov.limits.scheduleAllowed} onClick={() => set({ schedule: s })} className={`border-2 border-black px-2.5 py-1 text-xs font-bold uppercase disabled:opacity-30 ${draft.schedule === s ? "bg-black text-white" : "bg-white"}`}>{s}</button>
                  ))}
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {!ov.limits.scheduleAllowed
                    ? "Scheduling is off in the shared demo — sign up for your own workspace to run Autopilot every morning."
                    : ov.config.schedule !== "off" && ov.config.nextRunAt
                      ? `Next run ${when(ov.config.nextRunAt)}. Runs at 9:00 IST; if the server is asleep it runs as soon as it wakes.`
                      : "Runs at 9:00 IST. Scheduled runs use the same budget checks as manual ones."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 border-t-2 border-dashed border-black/20">
              <button type="button" onClick={() => void save()} disabled={!dirty || saving} className="h-9 px-4 border-2 border-black bg-white font-black uppercase text-xs flex items-center gap-2 disabled:opacity-40 mt-3">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save settings
              </button>
              {dirty && <span className="text-[11px] font-bold mt-3">Unsaved changes — running will save them first.</span>}
              {!draft.triggers.length || !draft.segments.length || !draft.cities.length ? <span className="text-[11px] font-bold text-destructive mt-3">Pick at least one trigger, segment and city.</span> : null}
            </div>
          </div>

          {/* ── Cost + run ── */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] space-y-3" data-tour="autopilot-cost">
              <p className="text-xs font-black uppercase flex items-center gap-2"><Coins className="size-4" /> {live ? "This run will use" : "Sample run uses"}</p>
              <div className="grid grid-cols-2 gap-2">
                <CostTile label="Web searches" value={est.total.tavily} sub={`${est.scan.tavily} scan + ${est.pipelineCost.tavily} pipelines`} />
                <CostTile label="AI calls" value={est.total.groq} sub={`${est.scan.groq} scan + ${est.pipelineCost.groq} pipelines`} />
              </div>
              {live && (
                <div className="border-2 border-black bg-[#FFE3E8] p-2.5 space-y-1">
                  <p className="text-[11px] font-black uppercase flex items-center gap-1.5"><AlertTriangle className="size-3.5" /> Full pipeline for all {est.everyFirm.firms} firms</p>
                  <p className="text-xs font-bold">~{est.everyFirm.tavily} web searches + ~{est.everyFirm.groq} AI calls{est.everyFirm.apollo ? ` + ${est.everyFirm.apollo} Apollo lookups` : ""}</p>
                  <p className="text-[10px] font-semibold leading-snug">
                    {est.everyFirm.tavily > ov.usage.budget.tavily || est.everyFirm.groq > ov.usage.budget.groq
                      ? "More than the whole day's free-tier budget. "
                      : `${Math.round(Math.max(est.everyFirm.tavily / Math.max(1, est.total.tavily), 1) * 10) / 10}× this run. `}
                    That's why NERVE runs the top {draft.pipelinesPerRun} and shortlists the rest.
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Shared budget today (all workspaces)</p>
                <BudgetBar label="Web searches (Tavily)" used={ov.usage.used.tavily} budget={ov.usage.budget.tavily} planned={live ? est.total.tavily : 0} />
                <BudgetBar label="AI calls (Groq)" used={ov.usage.used.groq} budget={ov.usage.budget.groq} planned={live ? est.total.groq : sampleEst.total.groq} />
                <p className="text-[10px] font-semibold text-muted-foreground leading-snug">Free tiers: Tavily ≈ 1,000 searches a month; Groq caps requests and tokens per minute and per day. Autopilot stops before the budget runs out.</p>
              </div>
            </div>

            <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] space-y-2.5" data-tour="autopilot-run">
              {live && (
                <button type="button" onClick={() => void run(false)} disabled={active || !!starting || !est.fitsBudget || !draft.triggers.length || !draft.cities.length || !draft.segments.length} className="w-full h-11 bg-primary text-white font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0_0_#000] disabled:opacity-50 flex items-center justify-center gap-2">
                  {starting === "live" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run Autopilot now
                </button>
              )}
              {live && !est.fitsBudget && <p className="text-[11px] font-bold text-destructive">Over today's budget: {est.shortfall}. Lower the pipelines, or run a sample scan.</p>}
              <button type="button" onClick={() => void run(true)} disabled={active || !!starting || !draft.triggers.length || !draft.cities.length || !draft.segments.length} className={`w-full h-10 font-black uppercase text-xs border-2 border-black flex items-center justify-center gap-2 disabled:opacity-50 ${live ? "bg-white" : "bg-primary text-white shadow-[3px_3px_0_0_#000]"}`}>
                {starting === "sample" ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />} Run sample scan{sampleEst.total.groq ? ` (${sampleEst.total.groq} AI calls, no searches)` : " (no API cost)"}
              </button>
              <p className="text-[10px] font-semibold text-muted-foreground leading-snug">
                {live ? "Live runs research real firms — read-only, nothing is sent. " : "Live research is off on this server, so only fictional sample firms are available. "}
                Sample scans use fictional firms. {ov.limits.maxRunsPerDay} runs and {ov.limits.maxPipelinesPerDay} pipelines per workspace per day ({ov.pipelinesToday} used).
              </p>
              {active && <p className="text-[11px] font-black flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" /> A run is in progress…</p>}
              {error && <p className="text-xs font-bold text-white bg-destructive border-2 border-black px-2.5 py-2">{error}</p>}
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="border-2 border-black bg-white p-4 sm:p-5 shadow-[4px_4px_0_0_#000] space-y-4" data-tour="autopilot-results">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <p className="text-sm font-black uppercase flex items-center gap-2"><Brain className="size-4" /> Firms found</p>
            {ov.runs.length > 0 && (
              <select value={selectedRun || ""} onChange={(e) => setSelectedRun(e.target.value)} className="h-8 border-2 border-black bg-white px-2 text-[11px] font-black uppercase max-w-full">
                {ov.runs.map((r) => (
                  <option key={r.id} value={r.id}>{when(r.startedAt)} · {r.mode} · {r.found} firms</option>
                ))}
              </select>
            )}
          </div>

          {!detail && ov.runs.length === 0 && (
            <div className="border-2 border-dashed border-black p-8 text-center space-y-2">
              <Radar className="size-8 mx-auto" />
              <p className="font-black uppercase text-sm">No runs yet</p>
              <p className="text-xs font-semibold text-muted-foreground max-w-md mx-auto">Pick your triggers and cities, check the cost, then run Autopilot. Try a sample scan first; it costs nothing.</p>
            </div>
          )}
          {!detail && ov.runs.length > 0 && <div className="py-10 text-center"><Loader2 className="size-5 animate-spin mx-auto" /></div>}

          {detail && (
            <>
              <RunProgress run={detail.run} />
              {detail.run.notes?.length > 0 && (
                <ul className="space-y-1">
                  {detail.run.notes.map((n, i) => <li key={i} className="text-[11px] font-bold border-l-4 border-black pl-2">{n}</li>)}
                </ul>
              )}
              {detail.prospects.length === 0 && !ACTIVE_RUN.includes(detail.run.status) && (
                <p className="text-xs font-semibold text-muted-foreground">No new firms in this run.</p>
              )}
              <ShortlistSummary prospects={detail.prospects} perPipeline={detail.run.mode === "live" ? ov.unitCosts.live.perPipeline : ov.unitCosts.sample.perPipeline} />
              <div className="space-y-2.5">
                {detail.prospects.filter((p) => p.status !== "dismissed").map((p) => (
                  <ProspectRow key={p.id} p={p} busy={rowBusy === p.id} perPipeline={p.dataSource === "live" ? ov.unitCosts.live.perPipeline : ov.unitCosts.sample.perPipeline} onRun={() => void runProspect(p)} onDismiss={() => void dismiss(p)} segmentLabel={catalog?.segments[p.segment]?.label || p.segment} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── History ── */}
        <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] space-y-2" data-tour="autopilot-history">
          <p className="text-xs font-black uppercase">Run history</p>
          {ov.runs.length === 0 && <p className="text-xs font-semibold text-muted-foreground">Runs appear here with what they found and anything they skipped.</p>}
          <div className="divide-y-2 divide-black/10">
            {ov.runs.map((r) => (
              <button key={r.id} type="button" onClick={() => setSelectedRun(r.id)} className={`w-full text-left py-2 px-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs hover:bg-muted/40 ${selectedRun === r.id ? "bg-[#CEEBFC]/60" : ""}`}>
                <RunBadge status={r.status} />
                <span className="font-black">{when(r.startedAt)}</span>
                <span className={`text-[10px] font-black uppercase border-2 border-black px-1.5 ${r.mode === "live" ? "bg-[#CEEBFC]" : "bg-muted"}`}>{r.mode}</span>
                <span className="font-bold">{r.found} firms · {r.pipelinesDone}/{r.pipelinesPlanned} pipelines</span>
                <span className="text-muted-foreground font-semibold">{r.by === "schedule" ? "scheduled" : r.by === "seed" ? "demo sample" : "manual"} · {r.config.cities.join(", ")}</span>
              </button>
            ))}
          </div>
          {selectedTriggers.length > 0 && <p className="text-[10px] font-semibold text-muted-foreground">Watching: {selectedTriggers.map((t) => t.label).join(" · ")}</p>}
        </div>
      </div>
    </div>
  );
}

function CostTile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="border-2 border-black p-2 bg-[#CEEBFC]">
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="text-[10px] font-black uppercase mt-1">{label}</p>
      <p className="text-[10px] font-semibold text-muted-foreground">{sub}</p>
    </div>
  );
}

function BudgetBar({ label, used, budget, planned }: { label: string; used: number; budget: number; planned: number }) {
  const pct = (n: number) => `${Math.min(100, budget ? (n / budget) * 100 : 0)}%`;
  const over = used + planned > budget;
  return (
    <div>
      <div className="flex justify-between text-[10px] font-black">
        <span>{label}</span>
        <span className={over ? "text-destructive" : ""}>{used}{planned ? ` + ${planned}` : ""} / {budget}</span>
      </div>
      <div className="h-2.5 border-2 border-black bg-white flex overflow-hidden">
        <div className="bg-black" style={{ width: pct(used) }} />
        <div className={over ? "bg-destructive" : "bg-[#FFDA5C]"} style={{ width: pct(Math.min(planned, Math.max(0, budget - used))) }} />
      </div>
    </div>
  );
}

function RunBadge({ status }: { status: ProspectRun["status"] }) {
  const map: Record<string, [string, string]> = {
    scanning: ["Scanning", "bg-[#FFDA5C]"],
    running_pipelines: ["Pipelines", "bg-[#FFDA5C]"],
    done: ["Done", "bg-[#599D77] text-white"],
    failed: ["Failed", "bg-destructive text-white"],
    skipped_budget: ["Over budget", "bg-destructive text-white"],
    interrupted: ["Interrupted", "bg-muted"],
  };
  const [label, cls] = map[status] || [status, "bg-muted"];
  return <span className={`text-[10px] font-black uppercase border-2 border-black px-1.5 py-0.5 ${cls}`}>{label}</span>;
}

function RunProgress({ run }: { run: ProspectRun }) {
  const steps = [
    { label: "Scan", detail: `${run.queriesDone}/${run.queriesPlanned} searches`, done: run.status !== "scanning", active: run.status === "scanning" },
    { label: "Triage", detail: `${run.found} firms ranked`, done: run.status !== "scanning", active: false },
    { label: "Pipelines", detail: `${run.pipelinesDone}/${run.pipelinesPlanned} done`, done: ["done"].includes(run.status), active: run.status === "running_pipelines" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RunBadge status={run.status} />
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          {i > 0 && <ArrowRight className="size-3.5 text-muted-foreground" />}
          <span className={`text-[11px] font-black border-2 border-black px-2 py-0.5 flex items-center gap-1.5 ${s.done ? "bg-[#599D77] text-white" : s.active ? "bg-[#FFDA5C]" : "bg-white"}`}>
            {s.active ? <Loader2 className="size-3 animate-spin" /> : s.done ? <Check className="size-3" /> : null}
            {s.label} <span className="font-bold opacity-80">· {s.detail}</span>
          </span>
        </div>
      ))}
      <span className={`text-[10px] font-black uppercase border-2 border-black px-1.5 py-0.5 ${run.mode === "live" ? "bg-[#CEEBFC]" : "bg-muted"}`}>{run.mode === "live" ? "Live research" : "Sample — fictional firms"}</span>
    </div>
  );
}

function ShortlistSummary({ prospects, perPipeline }: { prospects: Prospect[]; perPipeline: { tavily: number; groq: number } }) {
  const shortlisted = prospects.filter((p) => p.status === "shortlisted").length;
  if (!shortlisted) return null;
  return (
    <div className="border-2 border-black bg-[#FFF6D6] px-3 py-2 text-[11px] font-bold flex gap-2">
      <AlertTriangle className="size-4 shrink-0" />
      <span>
        {shortlisted} firm{shortlisted > 1 ? "s are" : " is"} shortlisted — the full pipeline was not run to save API calls.
        Running all of them would use ~{shortlisted * perPipeline.tavily} web searches and ~{shortlisted * perPipeline.groq} AI calls. Run the ones worth it below.
      </span>
    </div>
  );
}

function ProspectRow({ p, busy, perPipeline, onRun, onDismiss, segmentLabel }: {
  p: Prospect; busy: boolean; perPipeline: { tavily: number; groq: number }; onRun: () => void; onDismiss: () => void; segmentLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const tierCls = p.tier === "HOT" ? "bg-primary text-white" : p.tier === "WARM" ? "bg-[#FFDA5C]" : "bg-muted";
  return (
    <div className={`border-2 border-black p-3 ${p.status === "pipeline_done" ? "bg-[#EAF6EF]" : "bg-white"}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="size-9 shrink-0 border-2 border-black bg-white flex flex-col items-center justify-center leading-none" title="Triage score (free, before any pipeline)">
          <span className="text-sm font-black">{p.triageScore}</span>
          <span className="text-[7px] font-black uppercase">triage</span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-black text-sm">#{p.rank} {p.companyName}</span>
            <span className="text-[9px] font-black uppercase border-2 border-black px-1 bg-[#CEEBFC]">{segmentLabel}</span>
            <span className="text-[9px] font-black uppercase border-2 border-black px-1 flex items-center gap-0.5"><MapPin className="size-2.5" />{p.city}</span>
            <span className="text-[9px] font-black uppercase border-2 border-black px-1 bg-accent">{p.triggerLabel}</span>
            {p.dataSource === "sample" && <span className="text-[9px] font-black uppercase border-2 border-black px-1 bg-muted">Sample · fictional</span>}
          </div>
          <p className="text-xs font-bold">{p.title}</p>
          <p className="text-[11px] font-semibold text-muted-foreground">
            {p.detail} <span className="whitespace-nowrap">· {ago(p.eventDate)}</span>
            {p.stage && <span className="whitespace-nowrap"> · likely stage: {STAGE_LABEL[p.stage] || p.stage}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {p.sourceUrl ? (
              <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="font-black underline flex items-center gap-1 max-w-full truncate">
                <ExternalLink className="size-3 shrink-0" /> {p.sourceTitle || p.sourceUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
              </a>
            ) : (
              <span className="font-bold text-muted-foreground">No source — fictional sample event</span>
            )}
            <button type="button" onClick={() => setOpen((o) => !o)} className="font-black flex items-center gap-0.5">
              Why this firm {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          </div>
          {open && (
            <div className="border-2 border-black bg-[#F7F7F2] p-2 space-y-1">
              <p className="text-[11px] font-bold">{p.allhomeAngle}</p>
              <ul className="text-[10px] font-semibold list-disc pl-4">{p.triageReasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          )}
        </div>

        <div className="w-full sm:w-auto sm:min-w-[190px] flex sm:flex-col items-stretch gap-1.5">
          {p.status === "pipeline_done" && p.leadId && (
            <>
              <span className="text-[10px] font-black uppercase border-2 border-black px-2 py-1 bg-[#599D77] text-white flex items-center gap-1"><Check className="size-3" /> Full pipeline done</span>
              <Link to={`/dashboard/pipeline/${p.leadId}`} className="text-[11px] font-black uppercase border-2 border-black px-2 py-1 bg-white flex items-center justify-between gap-2 shadow-[2px_2px_0_0_#000]">
                {p.score !== undefined ? <span className={`px-1 border border-black ${tierCls}`}>{p.score} {p.tier}</span> : null} Open mission <ArrowRight className="size-3" />
              </Link>
            </>
          )}
          {p.status === "already_in_pipeline" && (
            <>
              <span className="text-[10px] font-black uppercase border-2 border-black px-2 py-1 bg-muted">Already a mission</span>
              {p.leadId && <Link to={`/dashboard/pipeline/${p.leadId}`} className="text-[11px] font-black uppercase border-2 border-black px-2 py-1 bg-white flex items-center justify-between gap-2">Open <ArrowRight className="size-3" /></Link>}
            </>
          )}
          {(p.status === "queued" || p.status === "running") && (
            <span className="text-[10px] font-black uppercase border-2 border-black px-2 py-1.5 bg-[#FFDA5C] flex items-center gap-1.5"><Loader2 className="size-3 animate-spin" /> {p.status === "queued" ? "Queued for pipeline" : "Running 10 agents…"}</span>
          )}
          {(p.status === "shortlisted" || p.status === "error") && (
            <>
              <span className={`text-[10px] font-black uppercase border-2 border-black px-2 py-1 ${p.status === "error" ? "bg-destructive text-white" : "bg-[#FFF6D6]"}`} title={p.error}>
                {p.status === "error" ? "Pipeline failed" : "Shortlisted · pipeline not run"}
              </span>
              <button type="button" onClick={onRun} disabled={busy} className="text-[11px] font-black uppercase border-2 border-black px-2 py-1 bg-primary text-white shadow-[2px_2px_0_0_#000] flex items-center justify-center gap-1.5 disabled:opacity-50">
                {busy ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />} {p.status === "error" ? "Retry" : "Run pipeline"}
              </button>
              <span className="text-[9px] font-bold text-muted-foreground text-center">{perPipeline.tavily ? `~${perPipeline.tavily} searches + ` : ""}~{perPipeline.groq} AI calls</span>
              <button type="button" onClick={onDismiss} disabled={busy} className="text-[10px] font-black uppercase flex items-center justify-center gap-1 text-muted-foreground hover:text-black">
                <X className="size-3" /> Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
