import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AgentStatus } from "@/lib/types";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Gauge,
  Loader2,
  MessageSquareReply,
  PenSquare,
  Route,
  Search,
  Send,
  UserRound,
} from "lucide-react";

export interface AgentNodePayload {
  agentNumber: number;
  label: string;
  shortLabel: string;
  status: AgentStatus;
  outputSummary?: string;
}

const AGENT_ICONS: Record<number, React.ReactNode> = {
  1: <FileText className="size-3.5" />,
  2: <Search className="size-3.5" />,
  3: <Gauge className="size-3.5" />,
  4: <UserRound className="size-3.5" />,
  5: <Route className="size-3.5" />,
  6: <PenSquare className="size-3.5" />,
  7: <FileText className="size-3.5" />,
  8: <Send className="size-3.5" />,
  9: <MessageSquareReply className="size-3.5" />,
  10: <BrainCircuit className="size-3.5" />,
};

const STATUS_STYLES: Record<AgentStatus, string> = {
  idle: "border-border bg-card text-foreground",
  running: "border-primary/40 bg-primary/5 text-foreground",
  complete: "border-emerald-600/35 bg-emerald-600/5 text-foreground",
  error: "border-destructive/40 bg-destructive/5 text-foreground",
};

const STATUS_ICON: Record<AgentStatus, React.ReactNode> = {
  idle: <span className="size-2 rounded-full bg-muted-foreground/35" />,
  running: <Loader2 className="size-3.5 animate-spin text-primary" />,
  complete: <CheckCircle2 className="size-3.5 text-emerald-600" />,
  error: <AlertCircle className="size-3.5 text-destructive" />,
};

function AgentNodeComponent({ data }: NodeProps & { data: AgentNodePayload }) {
  const d = data as AgentNodePayload;

  return (
    <div className={`min-w-40 rounded-md border px-3 py-2.5 shadow-sm transition-colors ${STATUS_STYLES[d.status]}`}>
      <Handle type="target" position={Position.Left} className="!size-2 !bg-card !border !border-border" />

      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-muted-foreground">{AGENT_ICONS[d.agentNumber]}</span>
        <span className="text-[10px] font-medium text-muted-foreground">Agent {d.agentNumber}</span>
        <span className="ml-auto inline-flex items-center">{STATUS_ICON[d.status]}</span>
      </div>

      <p className="text-[11px] font-semibold leading-tight">{d.shortLabel}</p>

      {d.outputSummary ? (
        <p className="mt-1.5 line-clamp-2 max-w-40 text-[10px] leading-snug text-muted-foreground">
          {d.outputSummary}
        </p>
      ) : null}

      <Handle type="source" position={Position.Right} className="!size-2 !bg-card !border !border-border" />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
