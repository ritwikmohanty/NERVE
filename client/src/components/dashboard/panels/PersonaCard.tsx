/**
 * PersonaCard — Shows analyzed persona archetype and tone recommendation.
 */
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNerve } from '@/store/nerve-context';

export function PersonaCard() {
  const { state } = useNerve();

  return (
    <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-white/50 flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-pink-400" />
          Persona Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!state.personaArchetype ? (
          <p className="text-[11px] text-white/20">Waiting for Persona Analyst…</p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div>
              <p className="text-[10px] text-white/30 mb-1">Archetype</p>
              <p className="text-sm font-semibold text-white/80">{state.personaArchetype}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 mb-1">Recommended Tone</p>
              <Badge
                variant="outline"
                className="text-[10px] border-purple-500/20 bg-purple-500/10 text-purple-300"
              >
                {state.toneRecommendation}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] text-white/30 mb-1.5">Traits</p>
              <div className="flex flex-wrap gap-1.5">
                {['Data-driven', 'Risk-aware', 'ROI-focused', 'Results-oriented'].map((trait) => (
                  <Badge
                    key={trait}
                    variant="outline"
                    className="text-[9px] border-white/[0.08] bg-white/[0.03] text-white/40"
                  >
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
