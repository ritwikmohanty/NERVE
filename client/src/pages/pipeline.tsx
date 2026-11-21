import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSSE } from "@/hooks/use-sse";
import { api } from "@/lib/api";
import type { LeadDetail, AgentRun } from "@/lib/types";
import { PhaseContainer } from "@/components/pipeline/phase-container";
import type { PhaseStatus } from "@/components/pipeline/phase-container";
import {
  ThinkingIndicator,
  OutcomeCard,
  OutcomeRow,
  DataChip,
  MetricTile,
  StreamItem,
  AgentTile,
  ScoreBar,
} from "@/components/pipeline/phase-outputs";
import { StreamingText } from "@/components/ui/motion";
import SimulateReply from "@/components/simulate-reply";
import { BundlePanel, StageRadar } from "@/components/bundle-panel";
import { SendingBanner, ChannelBadge } from "@/components/sending-notice";
import { ResearchCard, SampleDataNote } from "@/components/research-card";
import type { FirmResearch } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import type { BrandBundle, RadarEntry, CentreMatch, CrmSync } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Building2,
  User,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Globe,
  DollarSign,
  Users,
  TrendingUp,
  Radar,
  Target,
  Brain,
  Zap,
  Lightbulb,
  Send,
  MessageSquare,
  Eye,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Volume2,
  Calendar,
  ArrowRight,
  RefreshCw,
  Loader2,
  FileText,
  Sparkles,
  Shield,
} from "lucide-react";

/* ─── Helpers ─── */
function parseAgentOutput(run?: AgentRun): Record<string, unknown> {
  if (!run?.output) return {};
  try {
    return typeof run.output === "string" ? JSON.parse(run.output) : (run.output as Record<string, unknown>);
  } catch {
    return {};
  }
}

/** Latest run for an agent — Agents 9/10 run again each time a reply is simulated. */
function getAgentRun(runs: AgentRun[], num: number): AgentRun | undefined {
  for (let i = runs.length - 1; i >= 0; i--) {
    if (runs[i].agentNumber === num) return runs[i];
  }
  return undefined;
}

type LiveAgentState = { running: Set<number>; errored: Set<number> };

function agentStatus(runs: AgentRun[], num: number, live: LiveAgentState): PhaseStatus {
  if (live.running.has(num)) return "running";
  if (live.errored.has(num)) return "error";
  const run = getAgentRun(runs, num);
  if (run?.status === "complete") return "complete";
  if (run?.status === "error") return "error";
  return "idle";
}

function phaseStatus(agents: number[], runs: AgentRun[], live: LiveAgentState): PhaseStatus {
  const statuses = agents.map((n) => agentStatus(runs, n, live));
  if (statuses.some((st) => st === "running")) return "running";
  if (statuses.some((st) => st === "error")) return "error";
  if (statuses.every((st) => st === "complete")) return "complete";
  return "idle";
}

/** AgentTile only knows idle / running / complete */
function tileStatus(st: PhaseStatus): "idle" | "running" | "complete" {
  return st === "complete" || st === "running" ? st : "idle";
}

/* ─── Phase Definitions ─── */
const PHASES = [
  { id: 1, label: "Ingest",     agents: [1],       icon: "Users" },
  { id: 2, label: "Intel",      agents: [2, 3, 4], icon: "Radar" },
  { id: 3, label: "Strategy",   agents: [5],       icon: "Lightbulb" },
  { id: 4, label: "Content",    agents: [6],       icon: "FileText" },
  { id: 5, label: "Explain",    agents: [7],       icon: "Eye" },
  { id: 6, label: "Deliver",    agents: [8],       icon: "Send" },
  { id: 7, label: "Learn",      agents: [9, 10],   icon: "GraduationCap" },
] as const;

/* ─── Main Pipeline Page ─── */
export default function PipelinePage() {
  const { id } = useParams<{ id: string }>();
  const { events, connected, clear } = useSSE(id);
  const { catalog } = useAuth();
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const d = await api.getLead(id);
      setDetail(d);
    } catch {
      // lead may not exist yet
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Derive live agent state from the SSE stream (agents 3 & 4 run in parallel)
  const live = useMemo<LiveAgentState>(() => {
    const status = new Map<number, string>();
    for (const e of events) {
      if (e.type !== "agent_status") continue;
      const d = e.data as { agentNumber?: number; status?: string };
      if (d.agentNumber) status.set(d.agentNumber, d.status || "idle");
    }
    const running = new Set<number>();
    const errored = new Set<number>();
    for (const [n, st] of status) {
      if (st === "running") running.add(n);
      if (st === "error") errored.add(n);
    }
    return { running, errored };
  }, [events]);

  const latestRunningAgent = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type !== "agent_status") continue;
      const d = e.data as { agentNumber?: number; status?: string };
      if (d.status === "running" && d.agentNumber && live.running.has(d.agentNumber)) return d.agentNumber;
    }
    return null;
  }, [events, live]);

  // Auto-advance to the phase containing the agent that just started
  useEffect(() => {
    if (latestRunningAgent == null) return;
    const targetPhase = PHASES.find((p) => (p.agents as readonly number[]).includes(latestRunningAgent));
    if (targetPhase) setActivePhase(targetPhase.id);
  }, [latestRunningAgent]);

  const runs = useMemo(() => detail?.agentRuns || [], [detail]);
  const lead = detail?.lead;

  // Complete if the stream said so, or the stored runs show the final agent finished
  // (covers opening a finished pipeline from the dashboard)
  const pipelineComplete =
    events.some((e) => e.type === "pipeline_complete") ||
    runs.some((r) => r.agentNumber === 10 && r.status === "complete");
  const pipelineError =
    !pipelineComplete && (lead?.status === "error" || events.some((e) => e.type === "error"));
  const hasLiveActivity = events.some((e) => e.type !== "connected");
  const isRunning =
    !pipelineComplete && !pipelineError && (hasLiveActivity || lead?.status === "processing");
  const completedCount = new Set(
    runs.filter((r) => r.status === "complete").map((r) => r.agentNumber)
  ).size;

  // Poll while the pipeline is running; refetch once when it finishes
  const hasDetail = !!detail;
  useEffect(() => {
    if (pipelineComplete || pipelineError) {
      const t = setTimeout(fetchDetail, 500);
      return () => clearTimeout(t);
    }
    if (isRunning || !hasDetail) {
      const interval = setInterval(fetchDetail, 2000);
      return () => clearInterval(interval);
    }
  }, [pipelineComplete, pipelineError, isRunning, hasDetail, fetchDetail]);

  // Parse all agent outputs
  const o1 = useMemo(() => parseAgentOutput(getAgentRun(runs, 1)), [runs]);
  const o2 = useMemo(() => parseAgentOutput(getAgentRun(runs, 2)), [runs]);
  const o3 = useMemo(() => parseAgentOutput(getAgentRun(runs, 3)), [runs]);
  const o4 = useMemo(() => parseAgentOutput(getAgentRun(runs, 4)), [runs]);
  const o5 = useMemo(() => parseAgentOutput(getAgentRun(runs, 5)), [runs]);
  const o6 = useMemo(() => parseAgentOutput(getAgentRun(runs, 6)), [runs]);
  const o7 = useMemo(() => parseAgentOutput(getAgentRun(runs, 7)), [runs]);
  const o8 = useMemo(() => parseAgentOutput(getAgentRun(runs, 8)), [runs]);
  const o9 = useMemo(() => parseAgentOutput(getAgentRun(runs, 9)), [runs]);
  const o10 = useMemo(() => parseAgentOutput(getAgentRun(runs, 10)), [runs]);

  // Navigation helpers
  const canGoNext = activePhase < 7;
  const canGoPrev = activePhase > 1;
  const goNext = useCallback(() => {
    if (canGoNext) {
      setActivePhase((p) => p + 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [canGoNext]);
  const goPrev = useCallback(() => {
    if (canGoPrev) {
      setActivePhase((p) => p - 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [canGoPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't hijack arrow keys while the user is typing (e.g. the Simulate Reply box)
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Phase status for each step
  const phaseStatuses = useMemo(
    () => PHASES.map((p) => phaseStatus([...p.agents], runs, live)),
    [runs, live]
  );

  // Show simulate reply on last phase when pipeline is complete
  const showSimulate = pipelineComplete && activePhase === 7;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="shrink-0 px-5 py-3 border-b-2 border-black flex items-center gap-3 bg-white" data-tour="pipeline-header">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none">
            <ArrowLeft className="size-3" /> Back
          </Button>
        </Link>
        <div className="h-6 w-0.5 bg-black ml-2 mr-2" />

        {lead ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0_0_#000]">
              <Building2 className="size-4 text-black" />
              <span className="text-sm font-black uppercase">{lead.companyName}</span>
            </div>
            {lead.contactName && (
              <span className="text-xs font-bold text-muted-foreground border border-black px-2 py-0.5">{lead.contactName}</span>
            )}
          </motion.div>
        ) : loading ? (
          <span className="flex items-center gap-1.5 text-sm font-bold uppercase">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </span>
        ) : null}

        {/* Pipeline Status */}
        <div className="ml-3">
          {pipelineComplete ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase border-2 border-black bg-[#599D77] text-white shadow-[2px_2px_0_0_#000]">
              <CheckCircle2 className="size-3.5" /> Complete — {completedCount}/10 Agents
            </span>
          ) : pipelineError ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase border-2 border-black bg-destructive text-white shadow-[2px_2px_0_0_#000]">
              <AlertTriangle className="size-3.5" /> Failed — {completedCount}/10 Agents
            </span>
          ) : isRunning ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase border-2 border-black bg-secondary text-black shadow-[2px_2px_0_0_#000]">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 bg-primary" />
              </span>
              Running — {completedCount}/10
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000]">
              Idle
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 border-2 border-black px-2.5 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000] ${
              connected
                ? "bg-[#599D77] text-white"
                : "bg-destructive text-white"
            }`}
          >
            {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {connected ? "Live" : "Offline"}
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all" onClick={() => { clear(); fetchDetail(); }}>
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Phase Stepper Bar ── */}
      <div className="shrink-0 px-5 py-4 border-b-2 border-black bg-secondary" data-tour="pipeline-stepper">
        <div className="max-w-6xl mx-auto flex items-center gap-1 overflow-x-auto">
          {PHASES.map((phase, idx) => {
            const st = phaseStatuses[idx];
            const isActive = activePhase === phase.id;
            return (
              <div key={phase.id} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => { setActivePhase(phase.id); scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
                  data-tour={`phase-${phase.label.toLowerCase()}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 w-full min-w-0 border-2 border-black ${
                    isActive
                      ? st === "running"
                        ? "bg-[#FFDA5C] shadow-[4px_4px_0_0_#000]"
                        : st === "complete"
                        ? "bg-[#599D77] text-white shadow-[2px_2px_0_0_#000]"
                        : "bg-primary text-white shadow-[2px_2px_0_0_#000]"
                      : "bg-white shadow-[2px_2px_0_0_#000] hover:shadow-[4px_4px_0_0_#000]"
                  }`}
                >
                  {/* Step indicator */}
                  <div
                    className={`size-6 rounded-md flex items-center justify-center shrink-0 border-2 border-black text-[10px] font-black transition-all ${
                      st === "complete"
                        ? "bg-white text-[#599D77]"
                        : st === "running"
                        ? "bg-white text-black"
                        : st === "error"
                        ? "bg-white text-destructive"
                        : isActive
                        ? "bg-white text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {st === "complete" ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : st === "running" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      phase.id
                    )}
                  </div>
                  <span
                    className={`text-xs font-black uppercase tracking-wide whitespace-nowrap ${isActive ? "" : "hidden lg:inline"} ${
                      isActive
                        ? st === "running" ? "text-black" : st === "complete" ? "text-white" : "text-white"
                        : "text-black"
                    }`}
                  >
                    {phase.label}
                  </span>
                </button>
                {/* Connector line */}
                {idx < PHASES.length - 1 && (
                  <div className={`w-4 h-0.5 shrink-0 mx-1 border-b-2 border-black`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Phase-Wise Content ── */}
      <div className="flex-1 overflow-auto" ref={scrollRef} data-tour="pipeline-content">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {pipelineError && (
            <div className="mb-6 flex items-start gap-3 border-2 border-black bg-[#EA435F] text-white p-4 shadow-[4px_4px_0_0_#000]">
              <AlertTriangle className="size-5 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-black uppercase">Pipeline failed</p>
                <p className="text-xs font-mono break-words mt-1">
                  {String(
                    (lead as { error?: string } | undefined)?.error ||
                      (events.find((e) => e.type === "error")?.data as { error?: string } | undefined)?.error ||
                      "An agent failed — check the server logs."
                  )}
                </p>
              </div>
            </div>
          )}
          {!loading && !lead && (
            <div className="mb-6 border-2 border-black bg-white p-6 text-center shadow-[4px_4px_0_0_#000]">
              <p className="text-sm font-black uppercase">Lead not found</p>
              <Link to="/dashboard" className="text-xs font-bold underline">Back to Command Center</Link>
            </div>
          )}
          <AnimatePresence mode="wait">

          {/* ═══════ PHASE 1: Lead Ingestion ═══════ */}
          {activePhase === 1 && (
          <motion.div key="phase-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <PhaseContainer
            phaseNumber={1}
            title="Lead Ingestion & Enrichment"
            subtitle={o1.dataSource === "live" ? "Agent 1 — Researches the real firm on the web and news, extracts a sourced profile, deduplicates" : "Agent 1 — Accepts lead input, enriches it, validates & deduplicates"}
            icon={<Users className="size-5" />}
            status={phaseStatus([1], runs, live)}
            accentColor="emerald"
            integrations={o1.dataSource === "live" ? ["Tavily", "Groq"] : o1.dataSource === "simulated" ? ["Sample data"] : ["Tavily", "Apollo"]}
          >
            {phaseStatus([1], runs, live) === "running" && (
              <ThinkingIndicator label="Researching the firm (web + news)…" />
            )}
            {phaseStatus([1], runs, live) === "complete" && (
              <div className="space-y-4">
                {o1.dataSource === "live" && o1.research ? (
                  <ResearchCard research={o1.research as FirmResearch} contactUnknown={!!o1.contactUnknown} projectAssumed={!!o1.projectAssumed} />
                ) : o1.dataSource === "simulated" ? (
                  <SampleDataNote />
                ) : null}

                {/* Firm / project profile */}
                <OutcomeCard title={o1.segment === "homeowner" ? "Homeowner Profile" : "Firm Profile"}>
                  <div className="grid sm:grid-cols-2 gap-x-6">
                    <OutcomeRow icon={<Building2 className="size-3" />} label={o1.segment === "homeowner" ? "Household" : "Firm"} value={String(o1.companyName || "—")} accent="text-foreground" />
                    <OutcomeRow icon={<Briefcase className="size-3" />} label="Segment" value={String(o1.firmType || o1.industry || "—")} />
                    <OutcomeRow icon={<MapPin className="size-3" />} label="Based in" value={String(o1.headquarters || "—")} />
                    <OutcomeRow icon={<Users className="size-3" />} label="Team size" value={String(o1.companySize || "—")} />
                    <OutcomeRow icon={<TrendingUp className="size-3" />} label="Projects / year" value={String(o1.projectsPerYear ?? "—")} />
                    <OutcomeRow icon={<Globe className="size-3" />} label="Domain" value={String(o1.companyDomain || "—")} mono />
                  </div>
                  {Array.isArray(o1.specialties) && o1.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(o1.specialties as string[]).map((t) => <DataChip key={t} variant="purple">{t}</DataChip>)}
                    </div>
                  )}
                  {Array.isArray(o1.portfolio) && o1.portfolio.length > 0 && (
                    <p className="text-[11px] font-semibold text-muted-foreground mt-2">Recent work: {(o1.portfolio as string[]).join(" · ")}</p>
                  )}
                </OutcomeCard>

                <OutcomeCard title={o1.projectAssumed ? "Project (planning assumption)" : "Current Project"}>
                  <div className="grid sm:grid-cols-2 gap-x-6">
                    <OutcomeRow icon={<Target className="size-3" />} label="Project" value={String(o1.projectName || (o1.projectAssumed ? "Not provided" : "—"))} accent="text-foreground" />
                    <OutcomeRow icon={<Building2 className="size-3" />} label="Type" value={`${String(o1.projectType || "—").replace(/_/g, " ")}${o1.projectAssumed ? " (assumed)" : ""}`} />
                    <OutcomeRow icon={<Clock className="size-3" />} label="Stage" value={`${String(o1.projectStage || "—")}${o1.projectAssumed ? " (assumed)" : ""}`} />
                    <OutcomeRow icon={<DollarSign className="size-3" />} label="Value" value={`${o1.projectValue || "—"}${o1.budgetTier ? ` · ${o1.budgetTier}` : ""}`} />
                    <OutcomeRow icon={<MapPin className="size-3" />} label="City" value={String(o1.projectCity || "—")} />
                  </div>
                </OutcomeCard>

                <OutcomeCard title="Contact Details">
                  <div className="grid sm:grid-cols-2 gap-x-6">
                    <OutcomeRow icon={<User className="size-3" />} label="Name" value={String(o1.contactName || "—")} accent="text-foreground" />
                    <OutcomeRow icon={<Briefcase className="size-3" />} label="Title" value={String(o1.contactTitle || "—")} />
                    <OutcomeRow icon={<Mail className="size-3" />} label="Email" value={String(o1.contactEmail || "—")} mono />
                    <OutcomeRow icon={<Phone className="size-3" />} label="WhatsApp" value={String(o1.contactPhone || "—")} mono />
                    <OutcomeRow icon={<Linkedin className="size-3" />} label="LinkedIn" value={String(o1.contactLinkedIn || "—")} mono />
                    <OutcomeRow icon={<Shield className="size-3" />} label="Seniority" value={String(o1.seniority || "—")} />
                  </div>
                  {o1.dataSource === "live" && !o1.contactEmail && !o1.contactPhone && (
                    <p className="text-[10px] font-bold mt-2 text-muted-foreground">No email or WhatsApp on file — add them if you have them; NERVE never guesses contact details for real people.</p>
                  )}
                  {String(o1.contactEmail || "").endsWith(".example") && (
                    <p className="text-[10px] font-bold mt-2 text-muted-foreground">Sample contact — simulated enrichment uses reserved <span className="font-mono">.example</span> addresses, so nothing can reach a real person.</p>
                  )}
                </OutcomeCard>
              </div>
            )}
          </PhaseContainer>
          </motion.div>
          )}

          {/* ═══════ PHASE 2: Intelligence Gathering (Agents 2, 3, 4 parallel) ═══════ */}
          {activePhase === 2 && (
          <motion.div key="phase-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <PhaseContainer
            phaseNumber={2}
            title="Intelligence Gathering"
            subtitle="Agents 2, 3, 4 — Signal scouting, intent scoring, and persona profiling run in parallel"
            icon={<Radar className="size-5" />}
            status={phaseStatus([2, 3, 4], runs, live)}
            accentColor="purple"
            integrations={["Tavily API", "LinkedIn"]}
          >
            {phaseStatus([2, 3, 4], runs, live) === "running" && (
              <ThinkingIndicator label="Scanning signals, scoring intent, profiling persona…" />
            )}
            <div className="grid grid-cols-3 gap-4">
              {/* Agent 2: Signal Scout */}
              <AgentTile
                name="Signal Scout"
                status={tileStatus(agentStatus(runs, 2, live))}
                icon={<Radar className="size-4" />}
              >
                {agentStatus(runs, 2, live) === "complete" && !!o2.signals && (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-emerald-400">{(o2.signals as unknown[]).length} signals detected</span>
                    </div>
                    {(o2.signals as Array<Record<string, unknown>>).slice(0, 4).map((sig, i) => (
                      <StreamItem key={i} delay={i * 0.1}>
                        <div className="rounded-lg border border-border/15 bg-card/20 p-2.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <DataChip variant={sig.strength === "HIGH" ? "red" : sig.strength === "MEDIUM" ? "orange" : "default"}>
                              {String(sig.strength || "—")}
                            </DataChip>
                            <DataChip variant="purple">{String(sig.category || "signal").replace(/_/g, " ")}</DataChip>
                          </div>
                          <p className="text-[10px] text-foreground/80 leading-relaxed">{String(sig.title || "")}</p>
                        </div>
                      </StreamItem>
                    ))}
                  </div>
                )}
              </AgentTile>

              {/* Agent 3: Intent Scorer */}
              <AgentTile
                name="Intent Scorer"
                status={tileStatus(agentStatus(runs, 3, live))}
                icon={<Target className="size-4" />}
              >
                {agentStatus(runs, 3, live) === "complete" && (
                  <div className="space-y-3 mt-1">
                    {/* Score Circle */}
                    <div className="flex items-center gap-3">
                      <div className="relative size-16">
                        <svg className="size-16 -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                          <motion.circle
                            cx="50" cy="50" r="40" fill="none" strokeWidth="6" strokeLinecap="round"
                            className={
                              (o3.tier || o3.priority) === "HOT" ? "stroke-red-400" :
                              (o3.tier || o3.priority) === "WARM" ? "stroke-orange-400" : "stroke-cyan-400"
                            }
                            initial={{ strokeDasharray: "0 251" }}
                            animate={{ strokeDasharray: `${((o3.compositeScore as number || o3.totalScore as number || 0) / 100) * 251} 251` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-bold font-mono">{(o3.compositeScore || o3.totalScore || 0) as number}</span>
                          <span className="text-[8px] text-muted-foreground">/100</span>
                        </div>
                      </div>
                      <div>
                        <DataChip variant={(o3.tier || o3.priority) === "HOT" ? "red" : (o3.tier || o3.priority) === "WARM" ? "orange" : "cyan"}>
                          {(o3.tier || o3.priority || "—") as string}
                        </DataChip>
                      </div>
                    </div>

                    {/* Top dimensions */}
                    {[...((o3.dimensions as Array<Record<string, unknown>>) || [])].sort((a, b) => Number(b.weightedScore || 0) - Number(a.weightedScore || 0)).slice(0, 4).map((dim: Record<string, unknown>, i: number) => (
                      <StreamItem key={i} delay={i * 0.08}>
                        <ScoreBar
                          label={(dim.name || dim.dimension || `Factor ${i + 1}`) as string}
                          value={Number(dim.rawScore ?? dim.score ?? 0)}
                          max={100}
                          color={(o3.tier || o3.priority) === "HOT" ? "red" : "orange"}
                        />
                      </StreamItem>
                    ))}
                  </div>
                )}
              </AgentTile>

              {/* Agent 4: Persona Analyst */}
              <AgentTile
                name="Persona Analyst"
                status={tileStatus(agentStatus(runs, 4, live))}
                icon={<Brain className="size-4" />}
              >
                {agentStatus(runs, 4, live) === "complete" && (
                  <div className="space-y-2.5 mt-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Archetype</p>
                      <DataChip variant="purple">
                        {String(o4.archetypeLabel || o4.archetype || "").replace(/_/g, " ")}
                      </DataChip>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted/20 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-purple-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${((o4.confidence as number || o4.confidenceScore as number || 0.85) * 100)}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                        <span className="text-[10px] font-mono">{Math.round((o4.confidence as number || o4.confidenceScore as number || 0.85) * 100)}%</span>
                      </div>
                    </div>
                    {!!o4.preferredTone && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Recommended Tone</p>
                        <p className="text-[11px] text-foreground/80">{String(o4.preferredTone)}</p>
                      </div>
                    )}
                    {!!o4.traits && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Key Traits</p>
                        <div className="flex flex-wrap gap-1">
                          {(o4.traits as string[]).slice(0, 3).map((t) => (
                            <DataChip key={t}>{t}</DataChip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </AgentTile>
            </div>
          </PhaseContainer>
          </motion.div>
          )}

          {/* ═══════ PHASE 3: Strategy Brain ═══════ */}
          {activePhase === 3 && (
          <motion.div key="phase-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <PhaseContainer
            phaseNumber={3}
            title="Strategy Commander"
            subtitle="Agent 5 — The central decision brain. Decides channel, timing, tone, and full cadence"
            icon={<Lightbulb className="size-5" />}
            status={phaseStatus([5], runs, live)}
            accentColor="blue"
          >
            {phaseStatus([5], runs, live) === "running" && (
              <ThinkingIndicator label="Computing optimal outreach strategy…" />
            )}
            {phaseStatus([5], runs, live) === "complete" && (
              <div className="space-y-4">
                {/* Decision Cards Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <MetricTile
                    label="Primary Channel"
                    value={((o5.primaryChannel || "—") as string).replace(/_/g, " ")}
                    icon={<Send className="size-4" />}
                    accentColor="cyan"
                  />
                  <MetricTile
                    label="Tone Framework"
                    value={((o5.approach || o5.toneFramework || "—") as string).replace(/_/g, " ")}
                    icon={<Volume2 className="size-4" />}
                    accentColor="purple"
                  />
                  <MetricTile
                    label="Send Timing"
                    value={o5.sendTimestamp ? new Date(o5.sendTimestamp as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Optimal"}
                    sub={o5.timezone as string || ""}
                    icon={<Clock className="size-4" />}
                    accentColor="orange"
                  />
                  <MetricTile
                    label="Cadence"
                    value={`${(o5.cadence as unknown[])?.length || 3} touches`}
                    sub={o5.secondaryChannel ? `+ ${(o5.secondaryChannel as string).replace(/_/g, " ")}` : ""}
                    icon={<Calendar className="size-4" />}
                    accentColor="emerald"
                  />
                </div>

                {/* Cadence Timeline */}
                {!!o5.cadence && (
                  <OutcomeCard title="Cadence Schedule">
                    <div className="flex items-center gap-2">
                      {(o5.cadence as Array<Record<string, unknown>>).map((tp, i, arr) => (
                        <div key={i} className="flex items-center gap-2 flex-1">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.15 }}
                            className="flex-1 rounded-lg border border-border/20 bg-card/20 p-3 text-center"
                          >
                            <p className="text-[10px] text-muted-foreground">Touch {(tp.touchNumber || i + 1) as number}</p>
                            <p className="text-[12px] font-semibold mt-1">
                              {((tp.channel || "") as string).replace(/_/g, " ")}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Day +{(tp.dayOffset || 0) as number}
                            </p>
                            {Array.isArray(tp.focusBrands) && (
                              <p className="text-[10px] font-black mt-1">{(tp.focusBrands as string[]).map((b) => catalog?.brands.find((x) => x.id === b)?.name || b).join(", ")}</p>
                            )}
                          </motion.div>
                          {i < arr.length - 1 && (
                            <ArrowRight className="size-3.5 text-muted-foreground/30 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </OutcomeCard>
                )}

                {/* AllHome: bundle, radar, experience centre */}
                {!!o5.bundle && (
                  <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
                    <BundlePanel bundle={o5.bundle as BrandBundle} brands={catalog?.brands} />
                  </div>
                )}
                {Array.isArray(o5.radar) && (
                  <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000]">
                    <StageRadar radar={o5.radar as RadarEntry[]} brands={catalog?.brands} />
                  </div>
                )}
                {!!o5.experienceCentre && (() => {
                  const ec = o5.experienceCentre as CentreMatch;
                  return (
                    <div className="border-2 border-black bg-[#CEEBFC] p-4 shadow-[2px_2px_0_0_#000] flex items-start gap-3" data-tour="centre">
                      <div className="size-9 shrink-0 border-2 border-black bg-white flex items-center justify-center"><MapPin className="size-4" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest">Experience Centre invite</p>
                        <p className="text-sm font-black">{ec.brandName} — {ec.centre.city}{ec.sameCity ? " (same city)" : ec.distanceKm > 0 ? ` (~${ec.distanceKm} km)` : ""}</p>
                        <p className="text-[11px] font-semibold">{ec.centre.address}</p>
                        <a href={ec.centre.mapUrl} target="_blank" rel="noreferrer" className="text-[11px] font-black underline">Open in Maps</a>
                      </div>
                    </div>
                  );
                })()}

                {/* Key Decisions */}
                {!!o5.decisions && (
                  <OutcomeCard title="Key Decisions">
                    {(o5.decisions as Array<Record<string, string>>).map((d, i) => (
                      <StreamItem key={i} delay={i * 0.1}>
                        <div className="py-2 border-b border-border/10 last:border-0">
                          <p className="text-[11px] font-medium text-foreground">{d.decision}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{d.reasoning}</p>
                        </div>
                      </StreamItem>
                    ))}
                  </OutcomeCard>
                )}
              </div>
            )}
          </PhaseContainer>
          </motion.div>
          )}

          {/* ═══════ PHASE 4: Content Generation ═══════ */}
          {activePhase === 4 && (
          <motion.div key="phase-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <PhaseContainer
            phaseNumber={4}
            title="Content Generation"
            subtitle="Agent 6 — AI-crafted multi-touch outreach messages, LinkedIn posts, and headline suggestions"
            icon={<FileText className="size-5" />}
            status={phaseStatus([6], runs, live)}
            accentColor="teal"
            integrations={["Groq LLM", "GPT-OSS 120B"]}
          >
            {phaseStatus([6], runs, live) === "running" && (
              <ThinkingIndicator label="Generating personalized outreach content…" />
            )}
            {phaseStatus([6], runs, live) === "complete" && !!o6.touches && (
              <div className="space-y-4">
                <SendingBanner compact context="messages" />
                {/* Touch Cards */}
                {(o6.touches as Array<Record<string, unknown>>).map((touch, i) => (
                  <StreamItem key={i} delay={i * 0.2}>
                    <OutcomeCard
                      title={`Touch ${touch.touchNumber} — ${((touch.channel || "") as string).replace(/_/g, " ")}`}
                    >
                      {!!touch.subject && (
                        <div className="mb-2 pb-2 border-b border-border/10">
                          <span className="text-[10px] text-muted-foreground">Subject: </span>
                          <span className="text-[11px] font-medium">{touch.subject as string}</span>
                        </div>
                      )}
                      <div className="text-[11px] leading-relaxed font-mono text-foreground/80 whitespace-pre-wrap bg-background/30 rounded-lg p-3 border border-border/10">
                        <StreamingText text={touch.body as string || ""} speed={5} showCursor={false} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <DataChip variant={touch.channel === "linkedin_dm" ? "cyan" : touch.channel === "email" ? "purple" : "emerald"}>
                          {((touch.channel || "") as string).replace(/_/g, " ")}
                        </DataChip>
                        <span className="text-[9px] text-muted-foreground">
                          {(touch.body as string || "").length} chars
                        </span>
                        <ChannelBadge channel={String(touch.channel)} className="ml-auto" />
                      </div>
                      {Array.isArray(touch.groundedIn) && (touch.groundedIn as string[]).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Grounded in:</span>
                          {(touch.groundedIn as string[]).map((g) => (
                            <span key={g} className="text-[9px] font-bold border border-black px-1.5 py-0.5 bg-accent">{g}</span>
                          ))}
                        </div>
                      )}
                    </OutcomeCard>
                  </StreamItem>
                ))}

                {/* Specification sheet */}
                {!!o6.specSheet && <SpecSheet markdown={String(o6.specSheet)} />}

                {/* LinkedIn Post */}
                {!!o6.linkedinPost && (
                  <OutcomeCard title="LinkedIn Thought Leadership Post">
                    <div className="text-[11px] leading-relaxed whitespace-pre-wrap bg-background/30 rounded-lg p-3 border border-border/10">
                      <StreamingText text={o6.linkedinPost as string} speed={5} showCursor={false} />
                    </div>
                  </OutcomeCard>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <MetricTile label="Touches Generated" value={(o6.touches as unknown[]).length} icon={<MessageSquare className="size-4" />} />
                  <MetricTile label="Channels Used" value={[...new Set((o6.touches as Array<Record<string, string>>).map((t) => t.channel))].length} icon={<Send className="size-4" />} />
                  <MetricTile label="Total Content" value={`${(o6.touches as Array<Record<string, string>>).reduce((a, t) => a + (t.body?.length || 0), 0)} chars`} icon={<FileText className="size-4" />} />
                </div>
              </div>
            )}
          </PhaseContainer>
          </motion.div>
          )}

          {/* ═══════ PHASE 5: Decision Trace ═══════ */}
          {activePhase === 5 && (
          <motion.div key="phase-5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <PhaseContainer
            phaseNumber={5}
            title="Decision Trace & Explainability"
            subtitle="Agent 7 — Reads the full trace of every decision, generates plain-English rationale"
            icon={<Eye className="size-5" />}
            status={phaseStatus([7], runs, live)}
            accentColor="yellow"
          >
            {phaseStatus([7], runs, live) === "running" && (
              <ThinkingIndicator label="Tracing all agent decisions for explainability…" />
            )}
            {phaseStatus([7], runs, live) === "complete" && (
              <div className="space-y-4">
                {/* Summary */}
                {!!o7.summary && (
                  <OutcomeCard title="Executive Summary">
                    <div className="text-[12px] leading-relaxed text-foreground/80">
                      <StreamingText text={o7.summary as string} speed={8} showCursor={false} />
                    </div>
                  </OutcomeCard>
                )}

                {/* Rationale Items */}
                {!!(o7.rationale || o7.explanations) && (
                  <OutcomeCard title="Agent Decision Rationale">
                    <div className="space-y-2.5">
                      {((o7.rationale || o7.explanations) as Array<Record<string, unknown>>).map((item, i) => (
                        <StreamItem key={i} delay={i * 0.1}>
                          <div className="rounded-lg border border-border/15 bg-card/20 p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <DataChip variant="purple">{String(item.agentName || item.agent || `Agent ${i + 1}`)}</DataChip>
                              {!!item.confidence && (
                                <span className="text-[9px] font-mono text-emerald-400">
                                  {Math.round((item.confidence as number) * 100)}% confident
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-foreground">{(item.decision || "") as string}</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{(item.explanation || item.reasoning || "") as string}</p>
                          </div>
                        </StreamItem>
                      ))}
                    </div>
                  </OutcomeCard>
                )}
              </div>
            )}
          </PhaseContainer>
          </motion.div>
          )}

          {/* ═══════ PHASE 6: Delivery & Execution ═══════ */}
          {activePhase === 6 && (
          <motion.div key="phase-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <PhaseContainer
            phaseNumber={6}
            title="Delivery & Execution"
            subtitle="Agent 8 — Sends messages via selected platforms. Tracks delivery receipts"
            icon={<Send className="size-5" />}
            status={phaseStatus([8], runs, live)}
            accentColor="emerald"
            integrations={["HeyReach", "Resend", "AiSensy"]}
          >
            {phaseStatus([8], runs, live) === "running" && (
              <ThinkingIndicator label="Dispatching outreach messages…" />
            )}
            {phaseStatus([8], runs, live) === "complete" && !!o8.results && (
              <div className="space-y-4">
                <SendingBanner context="messages" />
                {/* Delivery Results */}
                <div className="space-y-2.5">
                  {(o8.results as Array<Record<string, unknown>>).map((result, i) => (
                    <StreamItem key={i} delay={i * 0.15}>
                      <div className="flex items-center gap-3 border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000] mb-2">
                        {/* Status Icon */}
                        <div className={`size-10 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000] ${
                          result.status === "sent" || result.status === "simulated"
                            ? "bg-[#599D77]"
                            : result.status === "queued"
                            ? "bg-[#FFDA5C]"
                            : "bg-[#EA435F]"
                        }`}>
                          {result.status === "sent" || result.status === "simulated" ? (
                            <CheckCircle2 className="size-5 text-white" />
                          ) : result.status === "queued" ? (
                            <Clock className="size-5 text-black" />
                          ) : (
                            <AlertTriangle className="size-5 text-white" />
                          )}
                        </div>
                        {/* Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase">Touch {Number(result.touchNumber || i + 1)}</span>
                            <DataChip variant={result.channel === "linkedin_dm" ? "cyan" : result.channel === "email" ? "purple" : "emerald"}>
                              {((result.channel || "") as string).replace(/_/g, " ")}
                            </DataChip>
                            <DataChip variant={
                              result.status === "sent" || result.status === "simulated" ? "emerald" :
                              result.status === "queued" ? "orange" : "red"
                            }>
                              {result.status as string}
                            </DataChip>
                          </div>
                          <div className="mt-1.5"><ChannelBadge channel={String(result.channel)} /></div>
                          {!!result.messageId && (
                            <p className="text-[9px] font-black font-mono text-black mt-1 border border-black inline-block px-1 bg-muted">
                              ID: {result.messageId as string}
                            </p>
                          )}
                        </div>
                        {/* Platform badge */}
                        <span className="text-[9px] font-black uppercase border-2 border-black px-2 py-0.5 bg-secondary shadow-[1px_1px_0_0_#000]">
                          {result.channel === "linkedin_dm" ? "HeyReach" : result.channel === "email" ? "Resend" : "AiSensy"}
                        </span>
                      </div>
                    </StreamItem>
                  ))}
                </div>

                {/* Delivery Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <MetricTile
                    label="Sent"
                    value={(o8.results as Array<Record<string, string>>).filter((r) => r.status === "sent" || r.status === "simulated").length}
                    icon={<CheckCircle2 className="size-4" />}
                    accentColor="emerald"
                  />
                  <MetricTile
                    label="Queued"
                    value={(o8.results as Array<Record<string, string>>).filter((r) => r.status === "queued").length}
                    icon={<Clock className="size-4" />}
                    accentColor="orange"
                  />
                  <MetricTile
                    label="Failed"
                    value={(o8.results as Array<Record<string, string>>).filter((r) => r.status === "failed").length}
                    icon={<AlertTriangle className="size-4" />}
                    accentColor="red"
                  />
                </div>
              </div>
            )}
          </PhaseContainer>
          </motion.div>
          )}

          {/* ═══════ PHASE 7: Monitor & Learn ═══════ */}
          {activePhase === 7 && (
          <motion.div key="phase-7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <PhaseContainer
            phaseNumber={7}
            title="Response Monitor & Learning Loop"
            subtitle="Agents 9 & 10 — Classifies response sentiment, then updates scoring weights for compounding improvement"
            icon={<GraduationCap className="size-5" />}
            status={phaseStatus([9, 10], runs, live)}
            accentColor="orange"
            isLast
          >
            {phaseStatus([9, 10], runs, live) === "running" && (
              <ThinkingIndicator label="Monitoring for responses & updating model weights…" />
            )}
            {(agentStatus(runs, 9, live) === "complete" || agentStatus(runs, 10, live) === "complete") && (
              <div className="space-y-4">
                {/* Agent 9: Response Classification */}
                {agentStatus(runs, 9, live) === "complete" && (
                  <OutcomeCard title="Response Classification — Agent 9">
                    <div className="flex items-center gap-3 mb-3">
                      <DataChip variant={
                        o9.sentiment === "positive" ? "emerald" :
                        o9.sentiment === "negative" ? "red" :
                        o9.sentiment === "neutral" ? "orange" : "default"
                      }>
                        {((o9.sentiment || "no_reply") as string).replace(/_/g, " ")}
                      </DataChip>
                      <ArrowRight className="size-3 text-muted-foreground/40" />
                      <DataChip variant="purple">
                        {((o9.action || "nurture") as string).replace(/_/g, " ")}
                      </DataChip>
                    </div>
                    {!!o9.classificationReasoning && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed font-mono">
                        {o9.classificationReasoning as string}
                      </p>
                    )}
                  </OutcomeCard>
                )}

                {/* Agent 10: Learning Loop */}
                {agentStatus(runs, 10, live) === "complete" && !!o10.weightUpdates && (
                  <OutcomeCard title="Learning Loop — Agent 10">
                    <div className="space-y-3">
                      {/* Weight Updates */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-semibold">
                          Scoring Weight Updates ({(o10.weightUpdates as unknown[]).length} dimensions)
                        </p>
                        <div className="space-y-1.5">
                          {(o10.weightUpdates as Array<Record<string, unknown>>).map((wu, i) => (
                            <StreamItem key={i} delay={i * 0.05}>
                              <div className="flex items-center gap-2 py-1.5 border-b border-border/10 last:border-0">
                                <span className="text-[10px] text-muted-foreground min-w-24">{wu.dimension as string}</span>
                                <span className="text-[10px] font-mono text-foreground/60">{(wu.previousWeight as number)?.toFixed(2)}</span>
                                <ArrowRight className="size-2.5 text-muted-foreground/40" />
                                <span className={`text-[10px] font-mono font-semibold ${
                                  (wu.delta as number) > 0 ? "text-emerald-400" : (wu.delta as number) < 0 ? "text-red-400" : "text-muted-foreground"
                                }`}>
                                  {(wu.newWeight as number)?.toFixed(2)}
                                </span>
                                <span className={`text-[9px] font-mono ${
                                  (wu.delta as number) > 0 ? "text-emerald-400" : (wu.delta as number) < 0 ? "text-red-400" : "text-muted-foreground"
                                }`}>
                                  ({(wu.delta as number) > 0 ? "+" : ""}{(wu.delta as number)?.toFixed(3)})
                                </span>
                              </div>
                            </StreamItem>
                          ))}
                        </div>
                      </div>

                      {/* Heuristic Updates */}
                      {Array.isArray(o10.heuristicUpdates) && o10.heuristicUpdates.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">
                            Strategy Heuristic Updates
                          </p>
                          {(o10.heuristicUpdates as string[]).map((h, i) => (
                            <StreamItem key={i} delay={i * 0.1}>
                              <p className="text-[10px] text-foreground/80 py-1 flex items-start gap-1.5">
                                <Sparkles className="size-2.5 text-purple-400 mt-0.5 shrink-0" /> {h}
                              </p>
                            </StreamItem>
                          ))}
                        </div>
                      )}

                      {/* Tone Rule Updates */}
                      {Array.isArray(o10.toneRuleUpdates) && o10.toneRuleUpdates.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">
                            Tone Rule Adjustments
                          </p>
                          {(o10.toneRuleUpdates as string[]).map((t, i) => (
                            <StreamItem key={i} delay={i * 0.1}>
                              <p className="text-[10px] text-foreground/80 py-1 flex items-start gap-1.5">
                                <Volume2 className="size-2.5 text-orange-400 mt-0.5 shrink-0" /> {t}
                              </p>
                            </StreamItem>
                          ))}
                        </div>
                      )}
                    </div>
                  </OutcomeCard>
                )}

                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <MetricTile
                    label="Sentiment"
                    value={((o9.sentiment || "no_reply") as string).replace(/_/g, " ")}
                    icon={<MessageSquare className="size-4" />}
                    accentColor={o9.sentiment === "positive" ? "emerald" : o9.sentiment === "negative" ? "red" : "orange"}
                  />
                  <MetricTile
                    label="Action"
                    value={((o9.action || "nurture") as string).replace(/_/g, " ")}
                    icon={<Zap className="size-4" />}
                    accentColor="purple"
                  />
                  <MetricTile
                    label="Weights Updated"
                    value={(o10.weightUpdates as unknown[] || []).length}
                    icon={<TrendingUp className="size-4" />}
                    accentColor="cyan"
                  />
                </div>
              </div>
            )}
          </PhaseContainer>

          {/* ═══════ SIMULATE REPLY SECTION (on Phase 7) ═══════ */}
          {showSimulate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 border-2 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="size-12 border-2 border-black bg-secondary flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                  <MessageSquare className="size-6 text-black" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase">Simulate a Response</h3>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Test how Agent 9 classifies sentiment and Agent 10 updates the learning weights
                  </p>
                </div>
              </div>
              <SimulateReply
                leadId={id || ""}
                channel={
                  (o5.primaryChannel as "email" | "linkedin_dm" | "whatsapp") || "email"
                }
                disabled={false}
                onSent={() => {
                  setTimeout(fetchDetail, 600);
                }}
              />
            </motion.div>
          )}

          {/* ═══════ VISITS + CRM HAND-OFF ═══════ */}
          {showSimulate && detail && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-5">
              <HandoffPanel detail={detail} onChange={fetchDetail} />
            </motion.div>
          )}

          {/* ═══════ VIEW CALENDAR CTA (on Phase 7 after pipeline complete) ═══════ */}
          {showSimulate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-5"
            >
              <Link to="/dashboard/calendar">
                <div className="border-2 border-black bg-[#FFDA5C] p-5 shadow-[4px_4px_0_0_#000] flex items-center gap-4 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all cursor-pointer group">
                  <div className="size-12 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                    <Calendar className="size-6 text-black" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black uppercase">View Outreach Calendar</h3>
                    <p className="text-xs font-semibold text-black/70">
                      See all scheduled touchpoints on a month view · Chat with AI about your schedule
                    </p>
                  </div>
                  <ArrowRight className="size-5 text-black group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          )}
          </motion.div>
          )}

          </AnimatePresence>

          {/* ── Navigation Buttons ── */}
          <div className="flex items-center justify-between mt-8 pb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={!canGoPrev}
              className="gap-2 h-10 px-5 border-border/40 hover:bg-muted/20 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
              <span className="text-sm">Previous Phase</span>
            </Button>

            {/* Phase counter */}
            <span className="text-xs text-muted-foreground font-mono">
              Phase {activePhase} of 7
            </span>

            {activePhase < 7 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                className="gap-2 h-10 px-5 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary"
              >
                <span className="text-sm">Next Phase</span>
                <ChevronRight className="size-4" />
              </Button>
            ) : pipelineComplete ? (
              <div className="flex items-center gap-2">
                <Link to="/dashboard/calendar">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-10 px-5 border-2 border-black bg-[#FFDA5C] text-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none font-black uppercase text-xs"
                  >
                    <Calendar className="size-4" />
                    <span>Calendar</span>
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-10 px-5 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400"
                  >
                    <CheckCircle2 className="size-4" />
                    <span className="text-sm">Done</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="gap-2 h-10 px-5 border-border/40 disabled:opacity-30"
              >
                <span className="text-sm">Waiting…</span>
                <Loader2 className="size-4 animate-spin" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Spec sheet renderer (tiny markdown subset: headings, bold, tables) ─── */
function SpecSheet({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const table = lines.filter((l) => l.startsWith("|") && !/^\|[-| ]+\|$/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  const bold = (t: string) => t.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
  const copy = () => navigator.clipboard?.writeText(markdown).catch(() => {});
  return (
    <div className="border-2 border-black bg-white shadow-[2px_2px_0_0_#000]">
      <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-black bg-secondary">
        <FileText className="size-4" />
        <span className="text-xs font-black uppercase">Specification Sheet</span>
        <button onClick={copy} className="ml-auto text-[10px] font-black uppercase border-2 border-black bg-white px-2 py-0.5">Copy markdown</button>
      </div>
      <div className="p-4 space-y-2 text-[12px]">
        {lines.filter((l) => !l.startsWith("|") && l.trim()).map((l, i) =>
          l.startsWith("# ") ? <p key={i} className="text-sm font-black">{l.slice(2)}</p> : <p key={i}>{bold(l)}</p>
        )}
        {table.length > 1 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-2 border-black mt-2">
              <thead className="bg-muted"><tr>{table[0].map((h) => <th key={h} className="text-left font-black px-2 py-1 border-b-2 border-black">{h}</th>)}</tr></thead>
              <tbody>{table.slice(1).map((r, i) => <tr key={i} className="border-b border-black/20">{r.map((c, j) => <td key={j} className="px-2 py-1">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Visits + Zoho hand-off (F3 / F5) ─── */
function HandoffPanel({ detail, onChange }: { detail: LeadDetail; onChange: () => void }) {
  const [pushing, setPushing] = useState(false);
  const [crm, setCrm] = useState<CrmSync | null>(detail.crmSync);
  const [showPayload, setShowPayload] = useState(false);
  const status = detail.lead.status;
  const canPush = ["active", "visit_booked"].includes(status);

  async function push() {
    setPushing(true);
    try {
      setCrm(await api.crmPush(detail.lead.id));
      setShowPayload(true);
      onChange();
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000] space-y-2">
        <p className="text-xs font-black uppercase flex items-center gap-2"><MapPin className="size-4" /> Experience-centre visits</p>
        {detail.visits.length === 0 ? (
          <p className="text-[11px] font-semibold text-muted-foreground">No visit booked yet. Simulate a reply like “can we see the samples at your showroom?” to book one.</p>
        ) : (
          detail.visits.map((v) => (
            <div key={v.id} className="border-2 border-black p-2 bg-[#CEEBFC]">
              <p className="text-xs font-black">{v.brandName} · {v.centreCity}</p>
              <p className="text-[11px] font-semibold">{new Date(v.scheduledAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST · {v.status}</p>
              {v.address && <p className="text-[10px]">{v.address}</p>}
            </div>
          ))
        )}
      </div>
      <div className="border-2 border-black bg-white p-4 shadow-[2px_2px_0_0_#000] space-y-2">
        <p className="text-xs font-black uppercase flex items-center gap-2"><Send className="size-4" /> Hand-off to Zoho CRM</p>
        <p className="text-[11px] font-semibold text-muted-foreground">Warm leads (escalated or visit booked) are pushed to the city sales team with the full NERVE context.</p>
        <ChannelBadge channel="crm" />
        <button onClick={push} disabled={!canPush || pushing} className="h-9 px-4 border-2 border-black bg-primary text-white text-xs font-black uppercase shadow-[2px_2px_0_0_#000] disabled:opacity-40 flex items-center gap-2">
          {pushing ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />} {crm ? "Push again" : "Push to Zoho"}
        </button>
        {!canPush && <p className="text-[10px] font-bold text-muted-foreground">Available once the lead replies positively.</p>}
        {crm && (
          <div className="space-y-1">
            <p className="text-[11px] font-black text-[#2E7D4F]">✓ Synced {new Date(crm.pushedAt).toLocaleTimeString()} ({crm.mode})</p>
            <button onClick={() => setShowPayload((x) => !x)} className="text-[10px] font-black underline">{showPayload ? "Hide" : "Show"} Zoho Leads API payload</button>
            {showPayload && <pre className="text-[10px] bg-[#1A1A18] text-[#CEEBFC] p-2 overflow-auto max-h-56 border-2 border-black">{JSON.stringify(crm.payload, null, 2)}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}
