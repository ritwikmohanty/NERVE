/**
 * CommandBar — Top bar with search, lead selector, and demo controls.
 */
import { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Play, RotateCcw, ThumbsUp, ThumbsDown,
  ToggleLeft, ToggleRight, Search, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNerve } from '@/store/nerve-context';
import { runDemoSequence, simulatePositiveReply, simulateNegativeReply } from '@/engine/orchestrator';

export function CommandBar() {
  const { state, dispatch } = useNerve();
  const stateRef = useRef(state);
  stateRef.current = state;

  const handleRunDemo = () => {
    if (state.isRunning) return;
    runDemoSequence(stateRef.current, dispatch);
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_DEMO' });
  };

  const allCompleted = state.nodes.every(n => n.status === 'completed');

  return (
    <div className="h-14 border-b border-white/[0.06] bg-black/30 backdrop-blur-xl flex items-center px-4 gap-3">
      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
        <Input
          placeholder="Search agents, signals…"
          className="h-8 pl-8 text-xs bg-white/[0.03] border-white/[0.06] text-white/60 placeholder:text-white/20 focus-visible:ring-purple-500/30"
        />
      </div>

      {/* Lead selector */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <User className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs text-white/60">Sarah Chen</span>
        <Badge variant="outline" className="text-[9px] border-purple-500/20 bg-purple-500/10 text-purple-300 h-4">
          VP Sales • Acme Corp
        </Badge>
      </div>

      <div className="flex-1" />

      {/* Funding toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_FUNDING_SIGNAL' })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            {state.fundingSignalEnabled ? (
              <ToggleRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-white/30" />
            )}
            <span className="text-[10px] text-white/40">Funding Signal</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-black/80 border-white/[0.1] text-white">
          Toggle Series B funding signal on/off
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />

      {/* Demo controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleRunDemo}
          disabled={state.isRunning}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 text-[11px] h-8 px-4 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-3 h-3 mr-1.5" />
          {state.isRunning ? 'Running…' : 'Run Demo'}
        </Button>

        {allCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => simulatePositiveReply(dispatch)}
                  className="h-8 px-3 text-[11px] border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  Positive
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black/80 border-white/[0.1] text-white">
                Simulate positive reply
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => simulateNegativeReply(dispatch)}
                  className="h-8 px-3 text-[11px] border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 cursor-pointer"
                >
                  <ThumbsDown className="w-3 h-3 mr-1" />
                  Negative
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black/80 border-white/[0.1] text-white">
                Simulate negative reply
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              className="h-8 px-2 text-white/30 hover:text-white/60 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-black/80 border-white/[0.1] text-white">
            Reset scenario
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
