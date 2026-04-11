/**
 * DecisionTheatreCard — Human-readable reasoning logs from the AI.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Lightbulb, Clock, MessageSquare, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNerve } from '@/store/nerve-context';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  channel: MessageSquare,
  timing: Clock,
  tone: Lightbulb,
  strategy: Cpu,
};

const typeColors: Record<string, string> = {
  channel: 'text-blue-400',
  timing: 'text-amber-400',
  tone: 'text-purple-400',
  strategy: 'text-cyan-400',
};

export function DecisionTheatreCard() {
  const { state } = useNerve();

  return (
    <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-white/50 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          Decision Theatre
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state.decisions.length === 0 ? (
          <p className="text-[11px] text-white/20">Awaiting strategy decisions…</p>
        ) : (
          <ScrollArea className="h-[160px] pr-3">
            <div className="space-y-2.5">
              <AnimatePresence>
                {state.decisions.map((d, i) => {
                  const Icon = typeIcons[d.type] || Cpu;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 }}
                      className="flex gap-2.5 items-start"
                    >
                      <div className="mt-0.5 shrink-0">
                        <Icon className={`w-3 h-3 ${typeColors[d.type]}`} />
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed">{d.message}</p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
