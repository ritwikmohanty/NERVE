import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { STAGE_LABEL, type Lead } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FadeIn, AnimatedCounter, StatusDot } from "@/components/ui/motion";
import { SendingBanner } from "@/components/sending-notice";
import { IconBundle, IconContent, IconEnrich, IconIntent, IconLearn, IconSend, IconSignals, IconVisit } from "@/components/brand/pipeline-icons";
import {
  Building2,
  User,
  ArrowRight,
  Plus,
  Activity,
  Zap,
  Server,
  RefreshCw,
  Cpu,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  Send,
  Brain,
} from "lucide-react";

// Lead statuses set by the server pipeline
const STATUS_BADGE: Record<string, { color: string; label: string }> = {
  processing: { color: "emerald", label: "Running" },
  completed: { color: "emerald", label: "Complete" },
  active: { color: "cyan", label: "Escalated to sales" },
  visit_booked: { color: "cyan", label: "Visit booked" },
  awaiting_reply: { color: "cyan", label: "Drafted · awaiting reply" },
  do_not_contact: { color: "red", label: "Do Not Contact" },
  error: { color: "red", label: "Error" },
};
const FINISHED_STATUSES = ["completed", "awaiting_reply", "active", "visit_booked", "do_not_contact"];
const SEGMENT_LABEL: Record<string, string> = { architect: "Architect", id_firm: "Interior Design", developer: "Developer", contractor: "Contractor", homeowner: "Homeowner" };

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    setLoading(true);
    try {
      const leadsRes = await api.getLeads();
      setLeads(leadsRes.leads || []);
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

  const running = leads.filter((l) => l.status === "processing").length;
  const completed = leads.filter((l) => FINISHED_STATUSES.includes(l.status)).length;
  const visitsBooked = leads.filter((l) => l.status === "visit_booked").length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">Command Center</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase border-2 border-black bg-secondary text-black shadow-[2px_2px_0_0_#000]">
                  <Cpu className="size-3.5" />
                  10 Agents Online
                </span>
              </div>
              <p className="font-bold text-muted-foreground text-sm uppercase tracking-wider">
                AllHome specifier outreach · 7 brands · {leads.length} missions
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={fetchAll}
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Link to="/dashboard/new">
                <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary-hover text-white border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-bold">
                  <Plus className="size-3.5" /> Launch Pipeline
                </Button>
              </Link>
            </div>
          </div>
        </FadeIn>

        {/* Stats Grid */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-tour="stats">
            {/* Total Leads */}
            <Card className="border-2 border-black shadow-[4px_4px_0_0_#000] bg-white rounded-md transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="size-10 rounded-md bg-secondary border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                    <Activity className="size-4 text-black" />
                  </div>
                  <TrendingUp className="size-4 text-black" />
                </div>
                <p className="text-3xl font-black tracking-tight mt-1">
                  <AnimatedCounter value={leads.length} />
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Total Leads</p>
              </CardContent>
            </Card>

            {/* Running */}
            <Card className="border-2 border-black shadow-[4px_4px_0_0_#000] bg-white rounded-md transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="size-10 rounded-md bg-[#CEEBFC] border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                    <Brain className="size-4 text-black" />
                  </div>
                  {running > 0 && <StatusDot status="running" />}
                </div>
                <p className="text-3xl font-black tracking-tight mt-1">
                  <AnimatedCounter value={running} />
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Active</p>
              </CardContent>
            </Card>

            {/* Completed */}
            <Card className="border-2 border-black shadow-[4px_4px_0_0_#000] bg-white rounded-md transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="size-10 rounded-md bg-[#599D77] border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                    <CheckCircle2 className="size-4 text-white" />
                  </div>
                  <Zap className="size-4 text-black" />
                </div>
                <p className="text-3xl font-black tracking-tight mt-1">
                  <AnimatedCounter value={completed} />
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Completed</p>
              </CardContent>
            </Card>

            {/* Errors */}
            <Card className="border-2 border-black shadow-[4px_4px_0_0_#000] bg-white rounded-md transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="size-10 rounded-md bg-[#EA435F] border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                    <MapPin className="size-4 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-black tracking-tight mt-1">
                  <AnimatedCounter value={visitsBooked} />
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Visits Booked</p>
              </CardContent>
            </Card>

            {/* SSE Streams */}
            <Card className="border-2 border-black shadow-[4px_4px_0_0_#000] bg-white rounded-md transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="size-10 rounded-md bg-[#FFDA5C] border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                    <Server className="size-4 text-black" />
                  </div>
                </div>
                <p className="text-3xl font-black tracking-tight mt-1">
                  <AnimatedCounter value={leads.filter((l) => ["active", "visit_booked"].includes(l.status)).length} />
                </p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Warm → Sales</p>
              </CardContent>
            </Card>
          </div>
        </FadeIn>

        <FadeIn delay={0.12}>
          <SendingBanner compact context="messages" />
        </FadeIn>

        {/* Agent Pipeline Mini Visual */}
        <FadeIn delay={0.15}>
          <Card className="border-2 border-black bg-secondary shadow-[4px_4px_0_0_#000] overflow-hidden rounded-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="size-5 text-black" />
                <span className="text-base font-bold text-black uppercase tracking-wide">Agent Pipeline Architecture</span>
                <Badge variant="outline" className="border-2 border-black bg-white shadow-[2px_2px_0_0_#000] ml-2 text-xs font-bold text-black">
                  10-agent DAG
                </Badge>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {[
                  { n: 1, name: "Enrich firm + project", Icon: IconEnrich, c: "bg-white" },
                  { n: 2, name: "Project signals", Icon: IconSignals, c: "bg-white" },
                  { n: "3+4", name: "Intent + Persona", Icon: IconIntent, parallel: true, c: "bg-[#CEEBFC]" },
                  { n: 5, name: "Bundle + Timing", Icon: IconBundle, c: "bg-white" },
                  { n: "6+7", name: "Content + Explain", Icon: IconContent, parallel: true, c: "bg-[#CEEBFC]" },
                  { n: 8, name: "WhatsApp / Email", Icon: IconSend, c: "bg-white" },
                  { n: 9, name: "Reply → Visit", Icon: IconVisit, c: "bg-white" },
                  { n: 10, name: "Learning", Icon: IconLearn, c: "bg-white" },
                ].map((agent, i, arr) => (
                  <div key={i} className="flex items-center gap-3 shrink-0">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md border-2 border-black shadow-[2px_2px_0_0_#000] transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] ${agent.c}`}
                    >
                      <span className="size-9 shrink-0 grid place-items-center rounded-[4px] border-2 border-black bg-[#F9F5F2]"><agent.Icon /></span>
                      <div>
                        <p className="text-[10px] font-black uppercase text-black">#{agent.n}</p>
                        <p className="text-xs font-bold uppercase whitespace-nowrap text-black">{agent.name}</p>
                      </div>
                    </motion.div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="size-4 text-black shrink-0" strokeWidth={3} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Lead List */}
        <FadeIn delay={0.2}>
          <div className="space-y-3" data-tour="lead-list">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase text-foreground">Recent Missions</h2>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {leads.length}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="size-3" /> Auto-refreshing every 15s
              </div>
            </div>

            {loading && !leads.length && (
              <Card className="border-border/50 bg-card/30">
                <CardContent className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center">
                      <RefreshCw className="size-5 text-muted-foreground animate-spin" />
                    </div>
                    <p className="text-sm text-muted-foreground">Loading missions…</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && !leads.length && (
              <Card className="border-border/50 bg-card/30 border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Send className="size-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">No missions yet</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Launch your first autonomous outreach pipeline
                      </p>
                      <Link to="/dashboard/new">
                        <Button size="sm" className="gap-1.5 bg-linear-to-r from-green-deep to-green-mid text-white border-0">
                          <Plus className="size-3.5" /> Launch Pipeline
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <ScrollArea className="max-h-105">
              <div className="space-y-3 pb-4">
                {leads.map((lead, i) => {
                  const statusInfo = STATUS_BADGE[lead.status] || { color: "purple", label: lead.status };
                  return (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link to={`/dashboard/pipeline/${lead.id}`} className="block group">
                        <Card className="border-2 border-black bg-white shadow-[4px_4px_0_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[0px_0px_0_0_#000] rounded-md">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="size-12 rounded-md bg-transparent border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0">
                              <Building2 className="size-6 text-black" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-base truncate uppercase tracking-tight">{lead.companyName}</p>
                                <Badge className="rounded-none border-2 border-black bg-muted text-black shadow-[2px_2px_0_0_#000] uppercase font-bold text-[10px]">
                                  {lead.status === "processing" && <StatusDot status="running" />}
                                  {statusInfo.label}
                                </Badge>
                                <Badge className={`rounded-none border-2 border-black uppercase font-bold text-[10px] ${lead.dataSource === "live" ? "bg-[#1A1A18] text-[#CEEBFC]" : "bg-white text-black"}`} title={lead.dataSource === "live" ? "Researched with live data (Tavily + Groq)" : "Fictional sample data"}>
                                  {lead.dataSource === "live" ? "Live data" : "Sample"}
                                </Badge>
                                {lead.segment && (
                                  <Badge className={`rounded-none border-2 border-black shadow-[2px_2px_0_0_#000] uppercase font-bold text-[10px] ${lead.segment === "homeowner" ? "bg-secondary text-black" : "bg-[#CEEBFC] text-black"}`}>
                                    {lead.segment === "homeowner" ? "B2C" : "B2B"} · {SEGMENT_LABEL[lead.segment]}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                                {lead.contactName && (
                                  <span className="flex items-center gap-1 uppercase">
                                    <User className="size-3" /> {lead.contactName}
                                  </span>
                                )}
                                {lead.contactTitle && <span className="uppercase hidden sm:inline">{lead.contactTitle}</span>}
                                {lead.projectName && <span className="uppercase truncate">· {lead.projectName}</span>}
                                {lead.projectStage && <span className="uppercase hidden sm:inline">· {STAGE_LABEL[lead.projectStage] || lead.projectStage} stage</span>}
                                {lead.createdAt && (
                                  <span className="ml-auto text-xs font-black uppercase text-black">
                                    {new Date(lead.createdAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="size-5 text-black group-hover:translate-x-1 transition-all shrink-0" strokeWidth={3} />
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
