/**
 * DeliveryLogsCard — Step-by-step delivery status with animated transitions.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Check, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNerve } from '@/store/nerve-context';

export function DeliveryLogsCard() {
  const { state } = useNerve();
  const hasStarted = state.deliveryLogs.some(d => d.status !== 'pending');

  return (
    <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-white/50 flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-blue-400" />
          Delivery Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasStarted ? (
          <p className="text-[11px] text-white/20">Waiting for Delivery Agent…</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {state.deliveryLogs.map((log, i) => {
                if (log.status === 'pending') return null;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5"
                  >
                    {log.status === 'active' ? (
                      <Loader2 className="w-3 h-3 text-purple-400 animate-spin shrink-0" />
                    ) : log.status === 'done' ? (
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-3 h-3 text-white/20 shrink-0" />
                    )}
                    <span className={`text-[11px] ${
                      log.status === 'done' ? 'text-white/50' :
                      log.status === 'active' ? 'text-purple-300' :
                      'text-white/20'
                    }`}>
                      {log.message}
                    </span>
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
