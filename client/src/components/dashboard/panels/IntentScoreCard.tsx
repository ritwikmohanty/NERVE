/**
 * IntentScoreCard — Animated score counter with mini gauge chart.
 */
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { useNerve } from '@/store/nerve-context';

export function IntentScoreCard() {
  const { state } = useNerve();
  const score = state.intentScore;

  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'High Intent' : score >= 40 ? 'Medium Intent' : 'Low Intent';

  const chartData = [
    { name: 'score', value: score, fill: color },
  ];

  return (
    <Card className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-white/50 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-purple-400" />
          Intent Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Score number */}
          <div className="flex-1">
            <motion.div
              key={score}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-4xl font-bold"
              style={{ color }}
            >
              {score}
            </motion.div>
            <p className="text-[11px] mt-1" style={{ color, opacity: 0.7 }}>
              {score > 0 ? label : 'Awaiting analysis…'}
            </p>
          </div>

          {/* Radial gauge */}
          <div className="w-16 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="100%"
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: 'rgba(255,255,255,0.05)' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
