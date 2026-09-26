import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';

// Relationship type definition
type RelationshipType = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY';

// Color mapping for different relationship types
const EDGE_COLORS: Record<RelationshipType, string> = {
  ONE_TO_ONE: '#4ec9b0',     // Teal
  ONE_TO_MANY: '#007acc',    // Blue (accent)
  MANY_TO_ONE: '#ce9178',    // Orange
  MANY_TO_MANY: '#c586c0',   // Purple
};

const EDGE_LABELS: Record<RelationshipType, string> = {
  ONE_TO_ONE: '1:1',
  ONE_TO_MANY: '1:N',
  MANY_TO_ONE: 'N:1',
  MANY_TO_MANY: 'N:M',
};

export const RelationshipEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const relationshipType = (data?.type || 'ONE_TO_MANY') as RelationshipType;
  const edgeColor = EDGE_COLORS[relationshipType];
  const edgeLabel = EDGE_LABELS[relationshipType];
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25, // Smoother curves
  });

  // Enhanced styling for selected edges
  const edgeStyle = {
    ...style,
    stroke: selected ? edgeColor : edgeColor + 'aa', // More opaque when selected
    strokeWidth: selected ? 3 : 2,
    strokeDasharray: data?.fromNullable === false && data?.toNullable === false ? '0' : '5,5', // Dashed if nullable
    filter: selected ? `drop-shadow(0 0 4px ${edgeColor})` : 'none',
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 11,
            fontWeight: 600,
            pointerEvents: 'all',
            zIndex: selected ? 1000 : 10,
          }}
          className="nodrag nopan"
        >
          <div
            style={{
              background: selected ? edgeColor : 'var(--c-surface)',
              color: selected ? '#ffffff' : edgeColor,
              padding: '3px 8px',
              borderRadius: '6px',
              border: `1.5px solid ${edgeColor}`,
              boxShadow: selected ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--f-mono)',
            }}
            className="hover:scale-110"
          >
            {edgeLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export const SmoothStepEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const relationshipType = (data?.type || 'ONE_TO_MANY') as RelationshipType;
  const edgeColor = EDGE_COLORS[relationshipType];
  const edgeLabel = EDGE_LABELS[relationshipType];

  // Calculate smooth step path
  const offset = 20;
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  let path = '';
  if (Math.abs(sourceX - targetX) > Math.abs(sourceY - targetY)) {
    // Horizontal primary direction
    path = `M ${sourceX} ${sourceY} L ${centerX - offset} ${sourceY} Q ${centerX} ${sourceY} ${centerX} ${centerY} Q ${centerX} ${targetY} ${centerX + offset} ${targetY} L ${targetX} ${targetY}`;
  } else {
    // Vertical primary direction
    path = `M ${sourceX} ${sourceY} L ${sourceX} ${centerY - offset} Q ${sourceX} ${centerY} ${centerX} ${centerY} Q ${targetX} ${centerY} ${targetX} ${centerY + offset} L ${targetX} ${targetY}`;
  }

  const edgeStyle = {
    ...style,
    stroke: selected ? edgeColor : edgeColor + 'aa',
    strokeWidth: selected ? 3 : 2,
    strokeDasharray: data?.fromNullable === false && data?.toNullable === false ? '0' : '5,5',
    filter: selected ? `drop-shadow(0 0 4px ${edgeColor})` : 'none',
  };

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${centerX}px,${centerY}px)`,
            fontSize: 11,
            fontWeight: 600,
            pointerEvents: 'all',
            zIndex: selected ? 1000 : 10,
          }}
          className="nodrag nopan"
        >
          <div
            style={{
              background: selected ? edgeColor : 'var(--c-surface)',
              color: selected ? '#ffffff' : edgeColor,
              padding: '3px 8px',
              borderRadius: '6px',
              border: `1.5px solid ${edgeColor}`,
              boxShadow: selected ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--f-mono)',
            }}
            className="hover:scale-110"
          >
            {edgeLabel}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
