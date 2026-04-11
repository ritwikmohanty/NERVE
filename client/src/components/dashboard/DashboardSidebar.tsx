/**
 * DashboardSidebar — Left sidebar with navigation and agent status overview.
 */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain, LayoutDashboard, Activity, Settings,
  Database, Radar, Target, Cpu, Pen,
  FileText, Send, RefreshCw, Home
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNerve } from '@/store/nerve-context';
import type { NodeStatus } from '@/store/nerve-store';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Database, Radar, Target, Brain, Cpu, Pen,
  FileText, Send, Activity, RefreshCw,
};

const statusDot: Record<NodeStatus, string> = {
  idle: 'bg-white/20',
  processing: 'bg-purple-400 animate-pulse',
  completed: 'bg-emerald-400',
  error: 'bg-red-400',
};

export function DashboardSidebar() {
  const { state } = useNerve();

  return (
    <div className="w-16 h-full flex flex-col items-center py-4 border-r border-white/[0.06] bg-black/40 backdrop-blur-xl">
      {/* Logo */}
      <Link to="/" className="mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-shadow">
          <Brain className="w-4.5 h-4.5 text-white" />
        </div>
      </Link>

      <Separator className="w-8 bg-white/[0.06] mb-4" />

      {/* Nav icons */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors cursor-pointer">
                <Home className="w-4 h-4 text-white/40 hover:text-white/70" />
              </div>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black/80 border-white/[0.1] text-white">
            Home
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.06] cursor-pointer">
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black/80 border-white/[0.1] text-white">
            Dashboard
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors cursor-pointer">
              <Activity className="w-4 h-4 text-white/40" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black/80 border-white/[0.1] text-white">
            Analytics
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors cursor-pointer">
              <Settings className="w-4 h-4 text-white/40" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-black/80 border-white/[0.1] text-white">
            Settings
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator className="w-8 bg-white/[0.06] mb-4" />

      {/* Agent status indicators */}
      <div className="flex-1 flex flex-col items-center gap-1.5 overflow-y-auto">
        {state.nodes.map((node) => {
          const Icon = iconMap[node.icon] || Database;
          return (
            <Tooltip key={node.id}>
              <TooltipTrigger asChild>
                <motion.div className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-colors cursor-pointer">
                  <Icon className={`w-3.5 h-3.5 ${
                    node.status === 'processing' ? 'text-purple-400' :
                    node.status === 'completed' ? 'text-emerald-400/60' :
                    'text-white/20'
                  }`} />
                  <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${statusDot[node.status]}`} />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-black/80 border-white/[0.1] text-white">
                <div>
                  <p className="font-medium text-xs">{node.label}</p>
                  <p className="text-[10px] text-white/50 capitalize">{node.status}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
