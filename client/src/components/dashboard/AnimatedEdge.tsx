/**
 * AnimatedEdge — Custom React Flow edge with animated particle flow.
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const edgeData = data as Record<string, unknown> | undefined;
  const isActive = edgeData?.active === true;
  const isCompleted = edgeData?.completed === true;

  let strokeColor = 'rgba(255,255,255,0.06)';
  let strokeWidth = 1;
  let dashArray = undefined;
  let className = '';

  if (isActive) {
    strokeColor = 'rgba(168,85,247,0.5)';
    strokeWidth = 2;
    dashArray = '5 5';
    className = 'animated-edge';
  } else if (isCompleted) {
    strokeColor = 'rgba(16,185,129,0.3)';
    strokeWidth = 1.5;
  }

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        ...style,
        stroke: strokeColor,
        strokeWidth,
        strokeDasharray: dashArray,
        filter: isActive ? 'drop-shadow(0 0 3px rgba(168,85,247,0.4))' : undefined,
      }}
      className={className}
    />
  );
}
