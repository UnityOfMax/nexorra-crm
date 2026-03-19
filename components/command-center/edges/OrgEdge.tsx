'use client';

import { memo } from 'react';
import { getSmoothStepPath, type EdgeProps } from 'reactflow';

function OrgEdgeComponent(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style: _style } = props;
  const isAnimated = props.animated;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const stroke = isAnimated ? '#22c55e' : '#d1d5db';
  const strokeWidth = isAnimated ? 2 : 1.5;

  return (
    <path
      d={edgePath}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={isAnimated ? '6 3' : undefined}
      className={isAnimated ? 'dark:stroke-green-500' : 'dark:stroke-gray-700'}
      style={{ transition: 'stroke 0.3s, stroke-width 0.3s' }}
    />
  );
}

export const OrgEdge = memo(OrgEdgeComponent);
