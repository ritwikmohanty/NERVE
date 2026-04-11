/**
 * FeaturesSection — Premium feature grid with icon cards and staggered animations.
 */
import { motion } from 'framer-motion';
import { 
  Eye, Zap, Radar, RefreshCw, Layers, Brain,
  Shield, Target, Sparkles
} from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Transparent Reasoning',
    description: 'Every decision is explainable. See exactly why NERVE chose a specific channel, timing, and tone.',
    color: 'from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-400',
    borderColor: 'hover:border-purple-500/20',
  },
  {
    icon: Zap,
    title: 'Autonomous Execution',
    description: 'From insight to outreach in seconds. NERVE crafts, schedules, and delivers without manual work.',
    color: 'from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-400',
    borderColor: 'hover:border-blue-500/20',
  },
  {
    icon: Radar,
    title: 'Real-Time Signal Intelligence',
    description: 'Funding rounds, job postings, social activity — NERVE monitors signals that predict purchase intent.',
    color: 'from-cyan-500/20 to-cyan-500/5',
    iconColor: 'text-cyan-400',
    borderColor: 'hover:border-cyan-500/20',
  },
  {
    icon: RefreshCw,
    title: 'Learning Loop Optimization',
    description: 'Every response refines the model. NERVE continuously adjusts weights and strategies based on outcomes.',
    color: 'from-green-500/20 to-green-500/5',
    iconColor: 'text-green-400',
    borderColor: 'hover:border-green-500/20',
  },
  {
    icon: Layers,
    title: 'Multi-Channel Orchestration',
    description: 'LinkedIn, Email, Twitter, Phone — NERVE selects the optimal channel based on recipient behavior.',
    color: 'from-pink-500/20 to-pink-500/5',
    iconColor: 'text-pink-400',
    borderColor: 'hover:border-pink-500/20',
  },
  {
    icon: Brain,
    title: 'Persona-Aware Content',
    description: 'Messages are tailored to decision-maker archetypes — executive, technical, operational, and more.',
    color: 'from-amber-500/20 to-amber-500/5',
    iconColor: 'text-amber-400',
    borderColor: 'hover:border-amber-500/20',
  },
];

const whyNerve = [
  {
    icon: Shield,
    title: 'Enterprise-Grade Security',
    stat: 'SOC 2 Type II',
    description: 'Your data never leaves your instance. Full audit logs and encryption at rest.',
  },
  {
    icon: Target,
    title: 'Precision at Scale',
    stat: '3.2x more replies',
    description: 'AI-optimized outreach outperforms templated campaigns with measurably higher engagement.',
  },
  {
    icon: Sparkles,
    title: 'Zero Manual Work',
    stat: '94% time saved',
    description: 'From lead to sent message — fully autonomous. Your reps focus on closing, not prospecting.',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function FeaturesSection() {
  return (
    <>
      {/* Why NERVE section */}
      <section className="py-24 relative" id="how-it-works">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why <span className="text-gradient">NERVE</span> Wins
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              The result of rethinking revenue execution from first principles.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {whyNerve.map((item2) => (
              <motion.div
                key={item2.title}
                variants={item}
                className="glass-card p-8 text-center group hover:bg-white/[0.06] transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                  <item2.icon className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-gradient mb-2">{item2.stat}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item2.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{item2.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-24 relative" id="features">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.05),transparent_70%)]" />
        <div className="max-w-6xl mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-purple-400 mb-3">Capabilities</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for the <span className="text-gradient">AI-First</span> Revenue Team
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Every feature designed to replace manual work with intelligent automation.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={item}
                className={`glass-card p-6 group cursor-default transition-all duration-500 border border-transparent ${feature.borderColor}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
}
