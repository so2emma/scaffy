import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  BackgroundVariant 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDiagramStore } from '../store/useDiagramStore';
import { EntityNode } from './EntityNode';

// Define custom node types outside component to prevent re-renders
const nodeTypes = {
  entityNode: EntityNode,
};

export const Canvas: React.FC = () => {
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const onNodesChange = useDiagramStore((state) => state.onNodesChange);
  const onEdgesChange = useDiagramStore((state) => state.onEdgesChange);
  const onConnect = useDiagramStore((state) => state.onConnect);
  const setSelectedEdgeId = useDiagramStore((state) => state.setSelectedEdgeId);

  const handleEdgeClick = (_: React.MouseEvent, edge: any) => {
    setSelectedEdgeId(edge.id);
  };

  const handlePaneClick = () => {
    setSelectedEdgeId(null);
  };

  return (
    <div className="canvas-wrapper">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.07)" />
        <Controls 
          showInteractive={false} 
          style={{ 
            background: 'var(--glass-bg)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '8px',
            color: 'var(--text-primary)'
          }} 
        />
      </ReactFlow>
    </div>
  );
};
