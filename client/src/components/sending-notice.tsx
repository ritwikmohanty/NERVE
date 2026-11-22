import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageCircle, Linkedin, Database, ShieldCheck, AlertTriangle, CheckCircle2, KeyRound, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import type { ChannelId, ChannelStatus, IntegrationsReport } from "@/lib/types";

// ─── Shared, cached readiness report ───
let cached: IntegrationsReport | null = null;
let inflight: Promise<IntegrationsReport> | null = null;
const listeners = new Set<(r: IntegrationsReport) => void>();

function load(refresh = false): Promise<IntegrationsReport> {
  if (!refresh && inflight) return inflight;
  inflight = api.integrations(refresh).then((r) => {
    cached = r;
    listeners.forEach((l) => l(r));
    return r;
  });
  inflight.catch(() => {
    inflight = null;
  });
  return inflight;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useIntegrations(): IntegrationsReport | null {
  const [report, setReport] = useState<IntegrationsReport | null>(cached);
  useEffect(() => {
    listeners.add(setReport);
    if (!cached) load().catch(() => {});
    return () => {
      listeners.delete(setReport);
    };
  }, []);
  return report;
}

// eslint-disable-next-line react-refresh/only-export-components
export function refreshIntegrations() {
  return load(true);
}

const ICONS: Record<ChannelId, typeof Mail> = { email: Mail, whatsapp: MessageCircle, linkedin_dm: Linkedin, crm: Database };

function stateLabel(c: ChannelStatus, simulation: boolean): { text: string; cls: string } {
  if (c.canSendLive) return { text: "Live", cls: "bg-[#599D77] text-white" };
  if (c.state === "ready") return { text: simulation ? "Ready · demo mode" : "Ready", cls: "bg-[#CEEBFC] text-black" };
  if (c.state === "needs_setup") return { text: "Key added · setup pending", cls: "bg-secondary text-black" };
  return { text: "Add API key", cls: "bg-white text-black" };
}

/** One-line reason a message on this channel is (or isn't) really sent. */
function shortReason(c: ChannelStatus, simulation: boolean): string {
  if (c.canSendLive) return `Sent live via ${c.provider}`;
  if (c.state === "not_connected") return `Simulated. Add your ${c.provider} API key to send`;
  if (c.state === "needs_setup") return `Simulated. ${c.provider} key added; ${c.shortAction} to send`;
  return simulation ? `Simulated. ${c.provider} is ready, but demo mode keeps sending off` : `Sent via ${c.provider}`;
}

/** Compact inline badge for a single message / channel. */
export function ChannelBadge({ channel, className = "" }: { channel: ChannelId | string; className?: string }) {
  const report = useIntegrations();
  const c = report?.channels.find((x) => x.channel === channel);
  if (!c || !report) return null;
  const Icon = ICONS[c.channel];
  const live = c.canSendLive;
  return (
    <span
      title={`${c.detail}${c.nextSteps.length ? `\nNext: ${c.nextSteps.join(" · ")}` : ""}\n\nFor AllHome: ${c.forAllHome}`}
      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase border-2 border-black px-1.5 py-0.5 ${live ? "bg-[#599D77] text-white" : "bg-white"} ${className}`}
    >
      {live ? <CheckCircle2 className="size-3" /> : <KeyRound className="size-3" />}
      <Icon className="size-3" /> {shortReason(c, report.simulationMode)}
    </span>
  );
}

/**
 * Full explanation shown wherever NERVE sends something: what's simulated, why,
 * which keys are needed, and what this means for the AllHome team.
 */
export function SendingBanner({ channels, compact = false, context = "messages" }: { channels?: ChannelId[]; compact?: boolean; context?: string }) {
  const report = useIntegrations();
  if (!report) return null;
  const shown = report.channels.filter((c) => !channels || channels.includes(c.channel));
  const allLive = shown.every((c) => c.canSendLive);
  if (allLive) {
    return (
      <div className="border-2 border-black bg-[#599D77] text-white px-3 py-2 text-xs font-black flex items-center gap-2">
        <CheckCircle2 className="size-4" /> Live sending is on: {context} go out through your connected accounts.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="border-2 border-black bg-accent px-3 py-2 text-[11px] font-semibold flex flex-wrap items-center gap-x-2 gap-y-1" data-tour="sending-notice">
        <ShieldCheck className="size-4 shrink-0" />
        <span>
          <span className="font-black">{report.simulationMode ? "Sending is off:" : "Not live yet:"}</span> {context} are researched, drafted and tracked but <span className="font-black">never sent</span>{report.liveResearch ? ". This demo uses the developer's personal API keys for research only" : ""}. To send for real, the company connects its own WhatsApp, email and LinkedIn accounts.
        </span>
        <Link to="/dashboard/settings#integrations" className="font-black underline whitespace-nowrap">Set up sending →</Link>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white shadow-[3px_3px_0_0_#000]" data-tour="sending-notice">
      <div className="flex items-start gap-3 p-4 border-b-2 border-black bg-accent">
        <ShieldCheck className="size-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-black uppercase">{report.simulationMode ? "Sending is locked: nothing is ever sent from this demo" : "Some channels aren't connected yet"}</p>
          <p className="text-[12px] font-semibold leading-relaxed">
            NERVE researches, writes, schedules and tracks every {context.replace(/s$/, "")} exactly as it would in production.{report.liveResearch ? " Research uses live data, but the API keys on this deployment are the developer's personal keys, so sending is permanently disabled." : ""} In production each channel uses <span className="font-black">the company's own account and API key</span>, so messages go out from AllHome's own number, domain and LinkedIn profiles, never from NERVE.
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-px bg-black">
        {shown.map((c) => {
          const Icon = ICONS[c.channel];
          const st = stateLabel(c, report.simulationMode);
          return (
            <div key={c.channel} className="bg-white p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className="size-4" />
                <span className="text-xs font-black">{c.label}</span>
                <span className="text-[10px] font-bold text-muted-foreground">via {c.provider}</span>
                <span className={`ml-auto text-[9px] font-black uppercase border-2 border-black px-1.5 py-0.5 ${st.cls}`}>{st.text}</span>
              </div>
              <p className="text-[11px] font-semibold">{c.detail}</p>
              {c.nextSteps.length > 0 && (
                <p className="text-[10px] font-bold flex items-start gap-1">
                  <AlertTriangle className="size-3 shrink-0 mt-0.5" /> Next: {c.nextSteps[0]}
                </p>
              )}
              <p className="text-[10px] font-semibold text-muted-foreground leading-snug"><span className="font-black text-black">For AllHome:</span> {c.forAllHome}</p>
            </div>
          );
        })}
      </div>
      <Link to="/dashboard/settings#integrations" className="flex items-center gap-1 px-4 py-2 border-t-2 border-black text-[11px] font-black uppercase hover:bg-secondary">
        See full setup steps in Settings → Integrations <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
