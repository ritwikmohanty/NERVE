import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Lead, HealthCheck } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  User,
  ArrowRight,
  Plus,
  Activity,
  Server,
  RefreshCw,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  processing: { label: "Processing", variant: "secondary" },
  pipeline_running: { label: "Running", variant: "secondary" },
  pipeline_complete: { label: "Complete", variant: "default" },
  completed: { label: "Complete", variant: "default" },
  active: { label: "Active", variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
  do_not_contact: { label: "Do not contact", variant: "destructive" },
  error: { label: "Error", variant: "destructive" },
  new: { label: "New", variant: "outline" },
};

function isRunning(status: string): boolean {
  return status === "processing" || status === "pipeline_running" || status === "running";
}

function isCompleted(status: string): boolean {
  return (
    status === "pipeline_complete" ||
    status === "completed" ||
    status === "active" ||
    status === "cancelled" ||
    status === "do_not_contact"
  );
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    setLoading(true);
    try {
      const [leadsRes, healthRes] = await Promise.all([
        api.getLeads(),
        api.health(),
      ]);
      setLeads(leadsRes.leads || []);
      setHealth(healthRes as unknown as HealthCheck);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const running = leads.filter((l) => isRunning(l.status)).length;
  const completed = leads.filter((l) => isCompleted(l.status)).length;
  const errored = leads.filter((l) => l.status === "error").length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pipeline Overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor active leads, system connectivity, and orchestration outcomes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchAll}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link to="/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> New Lead
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Leads</p>
                <p className="mt-1 text-2xl font-semibold">{leads.length}</p>
              </div>
              <Activity className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Active Pipelines</p>
                <p className="mt-1 text-2xl font-semibold">{running}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="mt-1 text-2xl font-semibold">{completed}</p>
              </div>
              <CheckCircle2 className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="mt-1 text-2xl font-semibold">{errored}</p>
              </div>
              <AlertTriangle className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Execution Topology</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            <p>
              Agent 1 → Agent 2 → parallel (3, 4) → Agent 5 → parallel (6, 7) → Agent 8 → Agent 9 → Agent 10.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Leads</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-sm px-2 text-[11px]">
                  <Server className="size-3" /> {health?.connectedClients ?? 0} streams
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3" /> every 15s
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading && !leads.length ? (
              <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" /> Loading leads
              </div>
            ) : null}

            {!loading && leads.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm font-medium">No leads yet</p>
                <p className="text-xs text-muted-foreground">Start a new run to populate the pipeline workspace.</p>
                <Link to="/new">
                  <Button size="sm" className="gap-1.5">
                    <Plus className="size-4" /> Create Lead
                  </Button>
                </Link>
              </div>
            ) : null}

            {leads.length > 0 ? (
              <ScrollArea className="h-[24rem] pr-3">
                <div className="space-y-2">
                  {leads.map((lead) => {
                    const status = STATUS_BADGE[lead.status] || {
                      label: lead.status,
                      variant: "outline" as const,
                    };

                    return (
                      <Link
                        key={lead.id}
                        to={`/pipeline/${lead.id}`}
                        className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/45"
                      >
                        <div className="rounded-md border border-border bg-card p-2">
                          <Building2 className="size-4 text-muted-foreground" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">{lead.companyName}</p>
                            <Badge variant={status.variant} className="rounded-sm px-2 text-[11px]">
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className="rounded-sm px-2 text-[11px]">
                              {lead.source}
                            </Badge>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {lead.contactName ? (
                              <span className="inline-flex items-center gap-1">
                                <User className="size-3" /> {lead.contactName}
                              </span>
                            ) : null}
                            {lead.contactTitle ? <span>{lead.contactTitle}</span> : null}
                            {lead.industry ? <span>{lead.industry}</span> : null}
                          </div>
                        </div>

                        <ArrowRight className="size-4 text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
