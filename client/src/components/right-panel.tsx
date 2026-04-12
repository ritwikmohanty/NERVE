import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Route,
  Brain,
  MessageSquare,
  Lightbulb,
  Clock3,
} from "lucide-react";
import type {
  SSEEvent,
  LeadDetail,
  ScoreDimension,
  TouchContent,
  RationaleItem,
  StrategyDecision,
  ResponseSentiment,
} from "@/lib/types";

interface Props {
  sseEvents: SSEEvent[];
  detail?: LeadDetail | null;
}

function tierBadgeVariant(tier: string): "default" | "secondary" | "outline" {
  if (tier === "HOT") return "default";
  if (tier === "WARM") return "secondary";
  return "outline";
}

function ScoreDimensions({ dimensions }: { dimensions: ScoreDimension[] }) {
  const sorted = [...dimensions].sort((a, b) => b.weightedScore - a.weightedScore);
  return (
    <div className="space-y-2">
      {sorted.map((d) => (
        <div key={d.name} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{d.name}</span>
            <span className="text-[11px] text-muted-foreground">{Math.round(d.rawScore)}</span>
          </div>
          <Progress value={Math.max(0, Math.min(100, d.rawScore))} className="h-1.5" />
        </div>
      ))}
    </div>
  );
}

function StrategyCard({ strategy }: {
  strategy: {
    primaryChannel?: string;
    secondaryChannel?: string;
    toneFramework?: string;
    sendTimestamp?: string;
    decisions?: StrategyDecision[];
  };
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border p-2.5">
          <p className="text-[11px] text-muted-foreground">Primary Channel</p>
          <p className="mt-1 text-sm font-medium">{strategy.primaryChannel || "-"}</p>
        </div>

        <div className="rounded-md border border-border p-2.5">
          <p className="text-[11px] text-muted-foreground">Tone Framework</p>
          <p className="mt-1 text-sm font-medium">{strategy.toneFramework?.replace(/_/g, " ") || "-"}</p>
        </div>
      </div>

      <div className="rounded-md border border-border p-2.5">
        <p className="text-[11px] text-muted-foreground">Secondary Channel</p>
        <p className="mt-1 text-sm font-medium">{strategy.secondaryChannel || "Not set"}</p>
      </div>

      {strategy.sendTimestamp ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="size-3" /> First send {new Date(strategy.sendTimestamp).toLocaleString()}
        </p>
      ) : null}

      {strategy.decisions?.length ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium">Key Decisions</p>
          {strategy.decisions.map((decision, index) => (
            <div key={index} className="rounded-md border border-border p-2.5">
              <p className="text-xs font-medium">{decision.decision}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{decision.reasoning}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ContentTabs({ touches }: { touches: TouchContent[] }) {
  if (!touches.length) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Awaiting content generation</p>;
  }

  const defaultTouch = String(touches[0]?.touchNumber || 1);

  return (
    <Tabs defaultValue={defaultTouch} className="w-full">
      <TabsList
        className="grid w-full"
        style={{ gridTemplateColumns: `repeat(${touches.length}, minmax(0, 1fr))` }}
      >
        {touches.map((touch) => (
          <TabsTrigger key={touch.touchNumber} value={String(touch.touchNumber)}>
            Touch {touch.touchNumber}
          </TabsTrigger>
        ))}
      </TabsList>

      {touches.map((touch) => (
        <TabsContent key={touch.touchNumber} value={String(touch.touchNumber)} className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-sm px-2 text-[11px]">
              {touch.channel.replace(/_/g, " ")}
            </Badge>
            {touch.subject ? <span className="truncate text-xs text-muted-foreground">{touch.subject}</span> : null}
          </div>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-relaxed">
            {touch.body}
          </pre>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function DecisionTheatre({ items }: { items: RationaleItem[] }) {
  if (!items.length) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Awaiting rationale output</p>;
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, index) => (
        <div key={index} className="space-y-1.5 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{item.agentName}</span>
            <Badge variant="outline" className="rounded-sm px-2 text-[11px]">
              {Math.round(item.confidence * 100)}%
            </Badge>
          </div>
          <p className="text-xs font-medium">{item.decision}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{item.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function ResponseCard({
  sentiment,
  action,
  reasoning,
}: {
  sentiment: ResponseSentiment;
  action: string;
  reasoning: string;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <Badge
          variant={
            sentiment === "positive"
              ? "default"
              : sentiment === "negative"
                ? "destructive"
                : "secondary"
          }
          className="rounded-sm px-2 text-[11px]"
        >
          {sentiment.replace(/_/g, " ")}
        </Badge>
        <Badge variant="outline" className="rounded-sm px-2 text-[11px]">
          {action.replace(/_/g, " ")}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{reasoning}</p>
    </div>
  );
}

export default function RightPanel({ sseEvents, detail }: Props) {
  const parsed = useMemo(() => {
    let score: { compositeScore: number; tier: string; dimensions: ScoreDimension[] } | null = null;
    let strategy: {
      primaryChannel?: string;
      secondaryChannel?: string;
      toneFramework?: string;
      sendTimestamp?: string;
      decisions?: StrategyDecision[];
    } | null = null;
    let touches: TouchContent[] = [];
    let rationale: RationaleItem[] = [];
    let response: { sentiment: ResponseSentiment; action: string; reasoning: string } | null = null;

    if (detail?.agentOutputs) {
      const outputs = detail.agentOutputs as Record<string, Record<string, unknown>>;

      if (outputs["3"]) {
        score = {
          compositeScore: (outputs["3"].compositeScore as number) || 0,
          tier: (outputs["3"].tier as string) || "COLD",
          dimensions: (outputs["3"].dimensions as ScoreDimension[]) || [],
        };
      }

      if (outputs["5"]) {
        strategy = {
          primaryChannel: outputs["5"].primaryChannel as string,
          secondaryChannel: outputs["5"].secondaryChannel as string,
          toneFramework: outputs["5"].toneFramework as string,
          sendTimestamp: outputs["5"].sendTimestamp as string,
          decisions: (outputs["5"].decisions as StrategyDecision[]) || [],
        };
      }

      if (outputs["6"]) {
        touches = (outputs["6"].touches as TouchContent[]) || [];
      }

      if (outputs["7"]) {
        rationale = (outputs["7"].explanations as RationaleItem[]) || [];
      }
    }

    for (const ev of sseEvents) {
      if (ev.type === "score_update") {
        const data = ev.data as Record<string, unknown>;
        if (typeof data.compositeScore === "number") {
          score = {
            compositeScore: data.compositeScore,
            tier: (data.tier as string) || "COLD",
            dimensions: (data.dimensions as ScoreDimension[]) || [],
          };
        }
      }

      if (ev.type === "strategy_update") {
        const data = ev.data as Record<string, unknown>;
        strategy = {
          primaryChannel: data.primaryChannel as string,
          secondaryChannel: data.secondaryChannel as string,
          toneFramework: data.toneFramework as string,
          sendTimestamp: data.sendTimestamp as string,
          decisions: (data.decisions as StrategyDecision[]) || [],
        };
      }

      if (ev.type === "content_update") {
        const data = ev.data as Record<string, unknown>;
        touches = (data.touches as TouchContent[]) || [];
      }

      if (ev.type === "rationale_update") {
        const data = ev.data as Record<string, unknown>;
        rationale = (data.explanations as RationaleItem[]) || [];
      }

      if (ev.type === "response_update") {
        const data = ev.data as Record<string, unknown>;
        response = {
          sentiment: data.sentiment as ResponseSentiment,
          action: data.action as string,
          reasoning: (data.classificationReasoning as string) || (data.reasoning as string) || "",
        };
      }
    }

    if (!response && detail?.responses?.length) {
      const latest = detail.responses[detail.responses.length - 1];
      response = {
        sentiment: latest.sentiment,
        action: latest.action,
        reasoning: latest.classificationReasoning,
      };
    }

    return { score, strategy, touches, rationale, response };
  }, [sseEvents, detail]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4" /> Intent Score
            </CardTitle>
            <CardDescription>Agent 3 output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsed.score ? (
              <>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-semibold">{parsed.score.compositeScore}</p>
                  <Badge variant={tierBadgeVariant(parsed.score.tier)} className="rounded-sm px-2 text-[11px]">
                    {parsed.score.tier}
                  </Badge>
                </div>
                <ScoreDimensions dimensions={parsed.score.dimensions} />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Awaiting intent score</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Route className="size-4" /> Strategy
            </CardTitle>
            <CardDescription>Agent 5 output</CardDescription>
          </CardHeader>
          <CardContent>
            {parsed.strategy ? (
              <StrategyCard strategy={parsed.strategy} />
            ) : (
              <p className="text-xs text-muted-foreground">Awaiting strategy</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="size-4" /> Generated Content
            </CardTitle>
            <CardDescription>Agent 6 output</CardDescription>
          </CardHeader>
          <CardContent>
            <ContentTabs touches={parsed.touches} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="size-4" /> Decision Rationale
            </CardTitle>
            <CardDescription>Agent 7 output</CardDescription>
          </CardHeader>
          <CardContent>
            <DecisionTheatre items={parsed.rationale} />
          </CardContent>
        </Card>

        {parsed.response ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Brain className="size-4" /> Response Classification
              </CardTitle>
              <CardDescription>Agent 9 output</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponseCard {...parsed.response} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </ScrollArea>
  );
}
