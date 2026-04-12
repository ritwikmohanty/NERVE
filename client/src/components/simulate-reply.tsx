import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ThumbsUp,
  ThumbsDown,
  Clock3,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { OutreachChannel } from "@/lib/types";

interface Props {
  leadId: string;
  channel?: OutreachChannel;
  disabled?: boolean;
  onSent?: (result: { sentiment: string; action: string }) => void;
}

const REPLIES: {
  label: string;
  icon: React.ReactNode;
  body: string;
}[] = [
  {
    label: "Interested",
    icon: <ThumbsUp className="size-3.5" />,
    body: "That sounds really interesting! I'd love to learn more. Can we schedule a quick call this week?",
  },
  {
    label: "Not Interested",
    icon: <ThumbsDown className="size-3.5" />,
    body: "Thanks but we're not looking at this kind of solution right now. Please remove me from your list.",
  },
  {
    label: "No Reply",
    icon: <Clock3 className="size-3.5" />,
    body: "",
  },
];

export default function SimulateReply({ leadId, channel = "email", disabled, onSent }: Props) {
  const [sending, setSending] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sentiment: string;
    action: string;
    reasoning: string;
  } | null>(null);

  async function send(label: string, messageBody: string) {
    setSending(label);
    setResult(null);
    try {
      const res = await api.sendWebhookResponse({
        leadId,
        channel,
        messageBody: messageBody || undefined,
      });
      setResult({
        sentiment: res.sentiment,
        action: res.action,
        reasoning: res.reasoning,
      });
      onSent?.({ sentiment: res.sentiment, action: res.action });
    } catch {
      setResult({ sentiment: "error", action: "failed", reasoning: "Request failed" });
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Simulate Response</p>
        <Badge variant="outline" className="rounded-sm px-2 text-[11px]">
          {channel.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid gap-2">
        {REPLIES.map((r) => (
          <Button
            key={r.label}
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            disabled={disabled || !!sending}
            onClick={() => send(r.label, r.body)}
          >
            {sending === r.label ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              r.icon
            )}
            {r.label}
          </Button>
        ))}
      </div>

      {result ? (
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                result.sentiment === "positive"
                  ? "default"
                  : result.sentiment === "negative"
                    ? "destructive"
                    : "secondary"
              }
              className="rounded-sm px-2 text-[11px]"
            >
              {result.sentiment}
            </Badge>
            <ArrowRight className="size-3 text-muted-foreground" />
            <Badge variant="outline" className="rounded-sm px-2 text-[11px]">
              {result.action.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{result.reasoning}</p>
        </div>
      ) : null}
    </div>
  );
}
