/**
 * LearningLoopCard — Weight updates with visual ripple/pulse effect.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNerve } from '@/store/nerve-context';

export function LearningLoopCard() {
  const { state } = useNerve();

  return (
    <Card className={`border-white/[0.06] bg-white/[0.02] backdrop-blur-sm relative overflow-hidden transition-all duration-500 ${
      state.learningPulse ? 'border-purple-500/30' : ''
    }`}>
      {/* Ripple effect when learning */}
      {state.learningPulse && (
        <motion.div
          className="absolute inset-0 bg-purple-500/5"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-xs font-medium text-white/50 flex items-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${state.learningPulse ? 'animate-spin' : ''}`} />
          Learning Loop
          {state.learningPulse && (
            <span className="ml-auto text-[9px] text-purple-400 animate-pulse">
              Updating weights…
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        {state.weightUpdates.length === 0 ? (
          <p className="text-[11px] text-white/20">Waiting for Learning Loop…</p>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {state.weightUpdates.map((update, i) => {
                const increased = update.to > update.from;
                return (
                  <motion.div
                    key={`${update.signal}-${i}`}
                    initial={{ opacity: 0, scale: 0.95, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {increased ? (
                        <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
                      )}
                      <span className="text-[11px] text-white/50 truncate">{update.signal}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                      <span className="text-white/30">{update.from}</span>
                      <span className="text-white/20">→</span>
                      <span className={increased ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                        {update.to}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
