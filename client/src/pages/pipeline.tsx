import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useSSE } from "@/hooks/use-sse";
import { api } from "@/lib/api";
import type { LeadDetail } from "@/lib/types";
import AgentGraph from "@/components/agent-graph";
import RightPanel from "@/components/right-panel";
import ActivityLog from "@/components/activity-log";
import SimulateReply from "@/components/simulate-reply";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  RefreshCw,
  Building2,
  User,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  Loader2,
  Clock3,
} from "lucide-react";

export default function PipelinePage() {
  const { id } = useParams<{ id: string }>();
  const { events, connected, clear } = useSSE(id);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [simMode, setSimMode] = useState(true);

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

  const realEvents = events.filter((e) => e.type !== "connected");
  useEffect(() => {
    const hasComplete = events.some((e) => e.type === "pipeline_complete");
    if (hasComplete) {
      const timer = setTimeout(fetchDetail, 500);
      return () => clearTimeout(timer);
    }
    if (realEvents.length > 0 || detail) {
      const interval = setInterval(fetchDetail, 3000);
      return () => clearInterval(interval);
    }
  }, [events, realEvents.length, detail, fetchDetail]);

  async function toggleSimulation() {
    try {
      const res = await api.setSimulation(!simMode);
      setSimMode(res.simulationMode);
    } catch {
      /* ignore */
    }
  }

  const lead = detail?.lead;
  const pipelineComplete = events.some((e) => e.type === "pipeline_complete");
  const isRunning = realEvents.length > 0 && !pipelineComplete;
  const completedAgents = detail?.agentRuns?.filter((r) => r.status === "complete").length || 0;

  const statusBadge = pipelineComplete
    ? { label: "Complete", variant: "default" as const }
    : isRunning
      ? { label: `Running (${completedAgents}/10)`, variant: "secondary" as const }
      : { label: "Idle", variant: "outline" as const };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Link to="/">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" /> Back
          </Button>
        </Link>

        <div className="min-w-0">
          {lead ? (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <p className="truncate text-sm font-medium">{lead.companyName}</p>
              </div>
              {lead.contactName ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="size-3" /> {lead.contactName}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-4 animate-spin" /> Loading pipeline
                </span>
              ) : (
                "Pipeline"
              )}
            </p>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Badge variant={statusBadge.variant} className="rounded-sm px-2">
            {pipelineComplete ? <CheckCircle2 className="size-3" /> : null}
            {statusBadge.label}
          </Badge>

          <Badge variant="outline" className="rounded-sm px-2">
            {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {connected ? "SSE connected" : "SSE offline"}
          </Badge>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleSimulation}>
            {simMode ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
            Simulation {simMode ? "On" : "Off"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              clear();
              fetchDetail();
            }}
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-h-0 space-y-4">
            <Card className="h-[56%] min-h-[320px] overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Agent Graph</CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-3rem)] p-0">
                <AgentGraph sseEvents={events} agentRuns={detail?.agentRuns} />
              </CardContent>
            </Card>

            <div className="grid h-[40%] min-h-[260px] gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <Card className="min-h-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Activity Log</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-3rem)] p-0">
                  <ActivityLog events={events} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Response Simulation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" /> Use this to trigger Agent 9 and Agent 10 paths.
                  </p>
                  <SimulateReply
                    leadId={id || ""}
                    channel={
                      detail?.agentOutputs
                        ? ((detail.agentOutputs as Record<string, Record<string, unknown>>)["5"]
                            ?.primaryChannel as "email" | "linkedin_dm" | "whatsapp") || "email"
                        : "email"
                    }
                    disabled={!pipelineComplete && !detail?.agentRuns?.some((r) => r.agentNumber === 8 && r.status === "complete")}
                    onSent={() => {
                      setTimeout(fetchDetail, 1000);
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="min-h-0 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Execution Details</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)] overflow-hidden p-0">
              <RightPanel sseEvents={events} detail={detail} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
