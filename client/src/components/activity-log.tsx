import { useMemo, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  CheckCircle,
  AlertCircle,
  Send,
  MessageSquare,
  Brain,
  Gauge,
  GitBranch,
  Loader2,
  Route,
} from "lucide-react";
import type { SSEEvent } from "@/lib/types";

interface Props {
  events: SSEEvent[];
}

const EVENT_META: Record<
  string,
  { icon: React.ReactNode; label: string }
> = {
  agent_status: {
    icon: <Activity className="size-3.5" />,
    label: "Agent",
  },
  score_update: {
    icon: <Gauge className="size-3.5" />,
    label: "Score",
  },
  strategy_update: {
    icon: <Route className="size-3.5" />,
    label: "Strategy",
  },
  content_update: {
    icon: <MessageSquare className="size-3.5" />,
    label: "Content",
  },
  rationale_update: {
    icon: <Brain className="size-3.5" />,
    label: "Rationale",
  },
  delivery_update: {
    icon: <Send className="size-3.5" />,
    label: "Delivery",
  },
  response_update: {
    icon: <MessageSquare className="size-3.5" />,
    label: "Response",
  },
  learning_update: {
    icon: <Brain className="size-3.5" />,
    label: "Learning",
  },
  branch_decision: {
    icon: <GitBranch className="size-3.5" />,
    label: "Branch",
  },
  pipeline_complete: {
    icon: <CheckCircle className="size-3.5" />,
    label: "Complete",
  },
  error: {
    icon: <AlertCircle className="size-3.5" />,
    label: "Error",
  },
};

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

function summarizeEvent(ev: SSEEvent): string {
  const d = ev.data as Record<string, unknown>;
  switch (ev.type) {
    case "agent_status": {
      const status = d.status as string;
      const num = d.agentNumber as number;
      const name = d.agentName as string;
      if (status === "running") return `Agent ${num} (${name}) initializing…`;
      if (status === "complete") return `Agent ${num} (${name}) ✓ completed`;
      if (status === "error") return `Agent ${num} failed: ${d.error || "unknown"}`;
      return `Agent ${num} → ${status}`;
    }
    case "score_update":
      return `Composite: ${d.compositeScore}/100 — Tier: ${d.tier}`;
    case "strategy_update":
      return `Channel: ${d.primaryChannel} | Tone: ${(d.toneFramework as string)?.replace(/_/g, " ")}`;
    case "content_update":
      return `${(d.touches as unknown[])?.length || 0} touch messages generated`;
    case "rationale_update":
      return `${(d.explanations as unknown[])?.length || 0} decision rationales`;
    case "delivery_update":
      return `Touch ${d.touchNumber || "?"} via ${d.channel || "channel"} (${d.status || "unknown"})`;
    case "response_update":
      return `Sentiment: ${d.sentiment} → ${d.action}`;
    case "learning_update":
      return `${(d.weightUpdates as unknown[])?.length || 0} weight updates applied`;
    case "branch_decision":
      return `Decision: ${d.decision} — ${d.reason || ""}`;
    case "pipeline_complete":
      return `Pipeline finished${d.totalDurationMs ? ` in ${((d.totalDurationMs as number) / 1000).toFixed(1)}s` : ""}`;
    case "error":
      return `${d.message || d.error || "Unknown error"}`;
    default:
      return ev.type;
  }
}

export default function ActivityLog({ events }: Props) {
  const filtered = useMemo(
    () => events.filter((e) => e.type !== "connected"),
    [events]
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length]);

  if (!filtered.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <p className="text-xs">Waiting for realtime events</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="space-y-1.5 p-3">
        {filtered.map((ev, i) => {
          const meta = EVENT_META[ev.type] || {
            icon: <Activity className="size-3.5" />,
            label: ev.type,
          };

          return (
            <div key={i} className="rounded-md border border-border px-3 py-2">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-muted-foreground">{meta.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium">{meta.label}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(ev.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{summarizeEvent(ev)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
