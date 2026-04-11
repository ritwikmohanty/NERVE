/**
 * AgentGraph — Live React Flow graph showing NERVE agent pipeline.
 * The visual centerpiece of the dashboard.
 */
import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNerve } from '@/store/nerve-context';
import { AgentNode } from './AgentNode';
import { AnimatedEdge } from './AnimatedEdge';

const nodeTypes = { agent: AgentNode };
const edgeTypes = { animated: AnimatedEdge };

// Layout positions for the agent pipeline graph
const nodePositions: Record<string, { x: number; y: number }> = {
  'lead-ingestion':     { x: 50,  y: 200 },
  'signal-scout':       { x: 320, y: 60 },
  'intent-scorer':      { x: 320, y: 200 },
  'persona-analyst':    { x: 320, y: 340 },
  'strategy-commander': { x: 600, y: 200 },
  'content-forge':      { x: 870, y: 120 },
  'explainer-agent':    { x: 870, y: 300 },
  'delivery-agent':     { x: 1130, y: 200 },
  'response-monitor':   { x: 1390, y: 140 },
  'learning-loop':      { x: 1390, y: 300 },
};

const edgeDefinitions = [
  { source: 'lead-ingestion', target: 'signal-scout' },
  { source: 'lead-ingestion', target: 'intent-scorer' },
  { source: 'lead-ingestion', target: 'persona-analyst' },
  { source: 'signal-scout', target: 'strategy-commander' },
  { source: 'intent-scorer', target: 'strategy-commander' },
  { source: 'persona-analyst', target: 'strategy-commander' },
  { source: 'strategy-commander', target: 'content-forge' },
  { source: 'strategy-commander', target: 'explainer-agent' },
  { source: 'content-forge', target: 'delivery-agent' },
  { source: 'explainer-agent', target: 'delivery-agent' },
  { source: 'delivery-agent', target: 'response-monitor' },
  { source: 'delivery-agent', target: 'learning-loop' },
  { source: 'response-monitor', target: 'learning-loop' },
];

export function AgentGraph() {
  const { state } = useNerve();

  const nodes: Node[] = useMemo(() => {
    return state.nodes.map((n) => ({
      id: n.id,
      type: 'agent',
      position: nodePositions[n.id] || { x: 0, y: 0 },
      data: {
        label: n.label,
        icon: n.icon,
        status: n.status,
        description: n.description,
      },
      draggable: true,
    }));
  }, [state.nodes]);

  const edges: Edge[] = useMemo(() => {
    return edgeDefinitions.map((e) => {
      const sourceNode = state.nodes.find(n => n.id === e.source);
      const targetNode = state.nodes.find(n => n.id === e.target);
      const isActive = sourceNode?.status === 'completed' && targetNode?.status === 'processing';
      const isCompleted = sourceNode?.status === 'completed' && targetNode?.status === 'completed';

      return {
        id: `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        type: 'animated',
        data: { active: isActive, completed: isCompleted },
      };
    });
  }, [state.nodes]);

  return (
    <div className="w-full h-full relative">
      {/* Gradient background overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.03),transparent_70%)] pointer-events-none z-10" />
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
        className="bg-transparent"
      >
        <Background 
          color="rgba(255,255,255,0.03)" 
          gap={30} 
          size={1} 
        />
      </ReactFlow>
    </div>
  );
}
