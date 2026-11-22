import { useMemo } from "react";
import { useSSE } from "@/hooks/use-sse";
import type { SSEEvent } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/ui/motion";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Zap,
  Globe,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Send,
  Brain,
  Cpu,
} from "lucide-react";

export default function ActivityPage() {
  const { events, connected } = useSSE(); // No ID = global events
  // Newest first, last 100 events (the hook already accumulates the stream)
  const log = useMemo(
    () => events.filter((e) => e.type !== "connected").slice(-100).reverse(),
    [events]
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="max-w-4xl mx-auto w-full p-6 space-y-6 flex-1 flex flex-col min-h-0">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-black tracking-tight uppercase">System Activity</h1>
                <div data-tour="activity-status" className={`flex items-center gap-2 px-3 py-1.5 rounded-none font-bold uppercase tracking-wider text-xs border-2 border-black shadow-[2px_2px_0_0_#000] transition-colors ${connected
                    ? "bg-[#599D77] text-white"
                    : "bg-destructive text-white"
                  }`}>
                  <Radio className={`size-4 ${connected ? "animate-pulse" : ""}`} />
                  {connected ? "LIVE FEED" : "DISCONNECTED"}
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                Global event stream from the Nerve autonomous engine
              </p>
            </div>
          </div>
        </FadeIn>

        <Card data-tour="activity-feed" className="flex-1 min-h-0 border-2 border-black shadow-[4px_4px_0_0_#000] bg-white overflow-hidden flex flex-col rounded-md mt-6">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b-2 border-black bg-secondary flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-black" />
                <span className="text-sm font-black uppercase tracking-widest text-black">Live Logs</span>
              </div>
              <span className="text-xs font-bold font-mono text-black">
                Displaying {log.length} recent events
              </span>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-2">
                <AnimatePresence initial={false}>
                  {log.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                      <div className="size-16 rounded-md border-2 border-black shadow-[4px_4px_0_0_#000] bg-muted/50 flex items-center justify-center mx-auto opacity-50">
                        <Zap className="size-8 text-black" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-wider text-black">Waiting for system signals…</p>
                    </div>
                  ) : (
                    log.map((event) => (
                      <motion.div
                        key={`${event.timestamp}-${event.type}-${event.leadId}-${String((event.data as Record<string, unknown>)?.agentNumber ?? "")}-${String((event.data as Record<string, unknown>)?.status ?? "")}-${String((event.data as Record<string, unknown>)?.touchNumber ?? "")}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-4 p-4 rounded-md border-2 border-black shadow-[2px_2px_0_0_#000] bg-white transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0_0_#000] group mb-3"
                      >
                        <div className="mt-1 shadow-[2px_2px_0_0_#000] bg-secondary p-2 rounded-md border-2 border-black">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-black uppercase tracking-wider bg-primary text-white border-2 border-black px-2 py-0.5 shadow-[2px_2px_0_0_#000]">
                              {event.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-bold font-mono text-black border-2 border-black px-1 py-0.5 bg-muted">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <p className="text-base font-bold text-black mb-1 leading-snug">
                            {getEventLabel(event)}
                          </p>

                          {event.leadId && event.leadId !== 'system' && (
                            <div className="flex items-center gap-1.5 pt-2">
                              <div className="size-2 rounded-none bg-primary border border-black shadow-[1px_1px_0_0_#000]" />
                              <span className="text-[11px] text-black uppercase font-black tracking-widest">
                                ID: {event.leadId}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getEventIcon(type: string) {
  switch (type) {
    case 'agent_status': return <Cpu className="size-4 text-purple-400" />;
    case 'delivery_update': return <Send className="size-4 text-blue-400" />;
    case 'score_update': return <Zap className="size-4 text-emerald-400" />;
    case 'branch_decision': return <Brain className="size-4 text-orange-400" />;
    case 'pipeline_complete': return <CheckCircle2 className="size-4 text-emerald-500" />;
    case 'error': return <AlertTriangle className="size-4 text-red-400" />;
    default: return <Globe className="size-4 text-cyan-400" />;
  }
}

function getEventLabel(event: SSEEvent): string {
  const d = (event.data || {}) as Record<string, unknown>;
  const str = (v: unknown, fb = "") => (v == null ? fb : String(v));
  switch (event.type) {
    case "agent_status":
      return `Agent ${str(d.agentNumber)} (${str(d.agentName)}) is now ${str(d.status)}. ${str(d.outputSummary)}${d.error ? `, ${str(d.error)}` : ""}`;
    case "delivery_update":
      return `Touch ${str(d.touchNumber, "?")} via ${str(d.channel).replace(/_/g, " ")}: ${str(d.status)}`;
    case "pipeline_complete":
      return d.leadsProcessed != null
        ? `Discovery batch complete: ${str(d.leadsProcessed)} leads processed`
        : `Mission complete. Status: ${str(d.status)}. Outcome: ${str(d.action, "n/a").replace(/_/g, " ")}`;
    case "branch_decision":
      return `Decision made: ${str(d.action).replace(/_/g, " ")}. ${str(d.message)}`;
    case "error":
      return `Error alert: ${str(d.error, "unknown error")}`;
    case "score_update":
      if (d.compositeScore != null) return `Intent score ${str(d.compositeScore)}/100 (${str(d.tier)})`;
      if (d.persona) return `Persona classified: ${str((d.persona as Record<string, unknown>).archetypeLabel)}`;
      if (Array.isArray(d.leads)) return `Enriched ${d.leads.length} lead(s): ${d.leads.map((l) => str((l as Record<string, unknown>).company)).join(", ")}`;
      return "Score update";
    case "signal_update":
      return `${Array.isArray(d.signals) ? d.signals.length : 0} signals found, overall strength ${str(d.overallSignalStrength)}`;
    case "strategy_update":
      return `Strategy: ${str(d.primaryChannel).replace(/_/g, " ")} · ${str(d.toneFramework).replace(/_/g, " ")}`;
    case "content_update":
      return `${Array.isArray(d.touches) ? d.touches.length : 0} outreach messages generated`;
    case "rationale_update":
      return str(d.summary, "Decision rationale generated");
    case "response_update":
      return `Response classified: ${str(d.sentiment).replace(/_/g, " ")} → ${str(d.action).replace(/_/g, " ")}`;
    case "learning_update":
      return `Learning loop: ${Array.isArray(d.weightUpdates) ? d.weightUpdates.length : 0} scoring weights updated`;
    default:
      return typeof event.data === "string" ? event.data : JSON.stringify(event.data).slice(0, 200);
  }
}
