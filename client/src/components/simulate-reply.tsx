import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Clock, Loader2, Send, ArrowRight, MapPin, PauseCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { OutreachChannel, Visit } from "@/lib/types";

interface Props {
  leadId: string;
  channel?: OutreachChannel;
  disabled?: boolean;
  onSent?: (result: { sentiment: string; action: string }) => void;
}

const REPLIES: Array<{ label: string; icon: React.ReactNode; body: string; bg: string; textColor: string }> = [
  { label: "Wants a visit", icon: <MapPin className="size-4" />, body: "Lovely! Can my team come by your experience centre next week to see the samples in person?", bg: "bg-[#0A66C2]", textColor: "text-white" },
  { label: "Interested", icon: <ThumbsUp className="size-4" />, body: "Sounds great. Please send pricing and lead times, and let's schedule a quick call this week.", bg: "bg-[#599D77]", textColor: "text-white" },
  { label: "Later", icon: <PauseCircle className="size-4" />, body: "Thanks, but we're swamped this month. Can you follow up in a few weeks?", bg: "bg-white", textColor: "text-black" },
  { label: "Not interested", icon: <ThumbsDown className="size-4" />, body: "Not interested, thanks. Please remove me from your list.", bg: "bg-[#EA435F]", textColor: "text-white" },
  { label: "No reply", icon: <Clock className="size-4" />, body: "", bg: "bg-secondary", textColor: "text-black" },
];

const SENTIMENT_BG: Record<string, string> = {
  positive: "bg-[#599D77] text-white",
  negative: "bg-[#EA435F] text-white",
  neutral: "bg-secondary text-black",
  no_reply: "bg-muted text-black",
  error: "bg-destructive text-white",
};

export default function SimulateReply({ leadId, channel = "email", disabled, onSent }: Props) {
  const [sending, setSending] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [result, setResult] = useState<{ sentiment: string; action: string; reasoning: string; visit: Visit | null } | null>(null);

  async function send(label: string, messageBody: string) {
    setSending(label);
    setResult(null);
    try {
      const res = await api.sendReply(leadId, { channel, messageBody: messageBody || undefined });
      setResult(res);
      onSent?.(res);
    } catch (err) {
      setResult({ sentiment: "error", action: "failed", reasoning: err instanceof Error ? err.message : "Request failed", visit: null });
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-4 border-2 border-black bg-white rounded-md p-4 shadow-[4px_4px_0_0_#000]" data-tour="simulate">
      <div className="flex items-center gap-2 border-b-2 border-black pb-3">
        <Send className="size-4 text-black" />
        <p className="text-sm font-black uppercase tracking-wider">Simulate a reply</p>
        <span className="ml-auto text-[10px] font-black uppercase border-2 border-black px-2 py-0.5 bg-secondary shadow-[2px_2px_0_0_#000]">via {channel.replace(/_/g, " ")}</span>
      </div>

      <p className="text-[11px] font-semibold text-muted-foreground -mt-1">
        In production, replies arrive automatically from WhatsApp, email and LinkedIn webhooks once those accounts are connected. Here you can play the prospect.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {REPLIES.map((r) => (
          <Button
            key={r.label}
            title={r.body || "No response within the monitoring window"}
            className={`gap-1.5 text-[11px] h-10 font-black uppercase border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all rounded-md ${r.bg} ${r.textColor}`}
            disabled={disabled || !!sending}
            onClick={() => send(r.label, r.body)}
          >
            {sending === r.label ? <Loader2 className="size-4 animate-spin" /> : r.icon}
            {r.label}
          </Button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) void send("custom", custom.trim());
        }}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="…or type any reply, e.g. “Can you share the Metalia louver options?”"
          className="flex-1 h-10 border-2 border-black px-3 text-sm font-semibold rounded-md"
        />
        <Button type="submit" disabled={disabled || !!sending || !custom.trim()} className="h-10 border-2 border-black bg-black text-white font-black uppercase text-xs rounded-md">
          {sending === "custom" ? <Loader2 className="size-4 animate-spin" /> : "Send"}
        </Button>
      </form>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-2 border-black bg-white rounded-md p-4 space-y-3 shadow-[2px_2px_0_0_#000]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-black uppercase border-2 border-black px-2 py-1 shadow-[2px_2px_0_0_#000] rounded-sm ${SENTIMENT_BG[result.sentiment] || "bg-muted text-black"}`}>
                {result.sentiment.replace(/_/g, " ")}
              </span>
              <ArrowRight className="size-4 text-black" strokeWidth={3} />
              <span className="text-xs font-black uppercase border-2 border-black px-2 py-1 shadow-[2px_2px_0_0_#000] bg-secondary text-black rounded-sm">{result.action.replace(/_/g, " ")}</span>
            </div>
            <p className="text-xs text-black font-mono leading-relaxed border-2 border-black p-3 bg-muted/20">{result.reasoning}</p>
            {result.visit && (
              <p className="text-xs font-black border-2 border-black bg-[#CEEBFC] px-3 py-2 flex items-center gap-2">
                <MapPin className="size-4" /> Visit booked: {result.visit.brandName}, {result.visit.centreCity} ·{" "}
                {new Date(result.visit.scheduledAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST
              </p>
            )}
            <p className="text-[10px] font-bold text-muted-foreground">Agent 10 has updated this workspace's scoring weights. See Analytics.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
