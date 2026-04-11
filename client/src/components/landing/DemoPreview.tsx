/**
 * DemoPreview — Showcases the live dashboard with a glowing preview card.
 */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DemoPreview() {
  return (
    <section className="py-32 relative" id="demo-preview">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.08),transparent_60%)]" />
      
      <div className="max-w-6xl mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 mb-3">Live Dashboard</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Watch AI <span className="text-gradient">Think</span> in Real Time
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            The NERVE dashboard visualizes every agent, decision, and signal as it processes 
            your pipeline live.
          </p>
        </motion.div>

        {/* Dashboard preview card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative group"
        >
          {/* Outer glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-60" />
          
          {/* Card */}
          <div className="relative glass-card overflow-hidden rounded-2xl border border-white/[0.08]">
            {/* Mock titlebar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] text-white/20 ml-4 font-mono">nerve.dashboard — agent-orchestration</span>
            </div>

            {/* Mock dashboard content */}
            <div className="p-8 min-h-[400px] flex items-center justify-center relative">
              {/* Background nodes simulation */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-24 h-12 rounded-lg border border-white/[0.06] bg-white/[0.02]"
                    style={{
                      left: `${15 + (i % 4) * 22}%`,
                      top: `${20 + Math.floor(i / 4) * 45}%`,
                    }}
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      borderColor: [
                        'rgba(255,255,255,0.06)',
                        i % 2 === 0 ? 'rgba(168,85,247,0.3)' : 'rgba(59,130,246,0.3)',
                        'rgba(255,255,255,0.06)',
                      ],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.4,
                    }}
                  />
                ))}

                {/* Connection lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <motion.line
                      key={i}
                      x1={`${25 + (i % 3) * 22}%`}
                      y1={`${35}%`}
                      x2={`${20 + ((i + 1) % 4) * 22}%`}
                      y2={`${65}%`}
                      stroke="rgba(168,85,247,0.15)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      animate={{ strokeDashoffset: [8, 0] }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  ))}
                </svg>
              </div>

              {/* Center CTA overlay */}
              <div className="relative z-10 text-center">
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 px-8 h-12 shadow-[0_0_40px_rgba(168,85,247,0.3)] hover:shadow-[0_0_60px_rgba(168,85,247,0.5)] transition-all group cursor-pointer"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Enter the Command Center
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <p className="text-xs text-white/30 mt-4">Interactive agent graph • Real-time intelligence</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
