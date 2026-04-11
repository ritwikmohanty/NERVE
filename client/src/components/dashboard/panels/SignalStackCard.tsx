/**
 * SignalStackCard — Displays detected signals with animated badges.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Radar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNerve } from '@/store/nerve-context';

const levelColors: Record<string, string> = {
  High: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  Low: 'bg-white/[0.05] text-white/40 border-white/[0.08]',
};

export function SignalStackCard() {
  const { state } = useNerve();
  const activeSignals = state.signals.filter(s => s.active);
  const hasData = state.nodes.find(n => n.id === 'signal-scout')?.status !== 'idle';

  return (
    <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-white/50 flex items-center gap-2">
          <Radar className="w-3.5 h-3.5 text-cyan-400" />
          Signal Stack
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-[11px] text-white/20">Waiting for Signal Scout…</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {activeSignals.map((signal, i) => (
                <motion.div
                  key={signal.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-[11px] text-white/60 truncate flex-1">{signal.label}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-2 py-0 h-5 border ${levelColors[signal.level]}`}
                  >
                    {signal.level}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
