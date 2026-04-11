/**
 * AgentNode — Custom React Flow node for each NERVE agent.
 * Premium card design with icon, title, status, and activity animation.
 */
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import {
  Database, Radar, Target, Brain, Cpu, Pen,
  FileText, Send, Activity, RefreshCw
} from 'lucide-react';
import type { NodeStatus } from '@/store/nerve-store';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Database, Radar, Target, Brain, Cpu, Pen,
  FileText, Send, Activity, RefreshCw,
};

const statusColors: Record<NodeStatus, { border: string; bg: string; glow: string; text: string }> = {
  idle: {
    border: 'border-white/[0.08]',
    bg: 'bg-white/[0.02]',
    glow: '',
    text: 'text-white/30',
  },
  processing: {
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/[0.08]',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.25)]',
    text: 'text-purple-300',
  },
  completed: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/[0.06]',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    text: 'text-emerald-400',
  },
  error: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/[0.06]',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
    text: 'text-red-400',
  },
};

const statusLabels: Record<NodeStatus, string> = {
  idle: 'Standby',
  processing: 'Processing…',
  completed: 'Complete',
  error: 'Error',
};

interface AgentNodeData {
  label: string;
  icon: string;
  status: NodeStatus;
  description: string;
  [key: string]: unknown;
}

function AgentNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const { label, icon, status, description } = nodeData;
  const Icon = iconMap[icon] || Database;
  const colors = statusColors[status];

  return (
    <div className="relative">
      {/* Outer pulse for processing state */}
      {status === 'processing' && (
        <motion.div
          className="absolute -inset-2 rounded-2xl bg-purple-500/10"
          animate={{
            opacity: [0, 0.5, 0],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div
        className={`relative w-[200px] rounded-xl border backdrop-blur-sm transition-all duration-500 ${colors.border} ${colors.bg} ${colors.glow}`}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !bg-white/20 !border-0 !-left-1"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2 !h-2 !bg-white/20 !border-0 !-right-1"
        />

        <div className="p-3.5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
              status === 'processing' 
                ? 'bg-purple-500/20' 
                : status === 'completed' 
                  ? 'bg-emerald-500/15' 
                  : 'bg-white/[0.05]'
            }`}>
              {status === 'processing' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </motion.div>
              ) : (
                <Icon className={`w-4 h-4 ${colors.text}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-white/80 truncate">{label}</h3>
              <p className={`text-[10px] ${colors.text} font-medium`}>{statusLabels[status]}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-[10px] text-white/25 leading-relaxed">{description}</p>

          {/* Activity bar */}
          {status === 'processing' && (
            <div className="mt-2.5 h-1 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />
            </div>
          )}

          {status === 'completed' && (
            <div className="mt-2.5 h-1 rounded-full bg-emerald-500/20 overflow-hidden">
              <div className="h-full w-full rounded-full bg-emerald-500/50" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
