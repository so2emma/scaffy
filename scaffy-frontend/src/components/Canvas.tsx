import React, { useMemo, useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  BackgroundVariant 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Undo2, Redo2, Sparkles, Upload } from 'lucide-react';
import { useDiagramStore } from '../store/useDiagramStore';
import { EntityNode } from './EntityNode';

const nodeTypes = {
  entityNode: EntityNode,
};

interface CanvasProps {
  onOpenImport: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({ onOpenImport }) => {
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const onNodesChange = useDiagramStore((state) => state.onNodesChange);
  const onEdgesChange = useDiagramStore((state) => state.onEdgesChange);
  const onConnect = useDiagramStore((state) => state.onConnect);
  const setSelectedEdgeId = useDiagramStore((state) => state.setSelectedEdgeId);

  // History & Layout
  const past = useDiagramStore((state) => state.past);
  const future = useDiagramStore((state) => state.future);
  const undo = useDiagramStore((state) => state.undo);
  const redo = useDiagramStore((state) => state.redo);
  const autoLayout = useDiagramStore((state) => state.autoLayout);
  const takeSnapshot = useDiagramStore((state) => state.takeSnapshot);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  const handleEdgeClick = (_: React.MouseEvent, edge: any) => {
    setSelectedEdgeId(edge.id);
  };

  const handlePaneClick = () => {
    setSelectedEdgeId(null);
  };

  return (
    <div className="canvas-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Floating Toolbar */}
      <div className="canvas-toolbar">
        <div 
          style={{
            display: 'flex',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            padding: '4px',
            boxShadow: 'var(--glass-glow)',
            gap: '4px'
          }}
        >
          <button
            onClick={() => undo()}
            disabled={past.length === 0}
            style={{
              background: 'transparent',
              border: 'none',
              color: past.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: past.length === 0 ? 'not-allowed' : 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => redo()}
            disabled={future.length === 0}
            style={{
              background: 'transparent',
              border: 'none',
              color: future.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: future.length === 0 ? 'not-allowed' : 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
          <div style={{ width: '1px', background: 'var(--glass-border)', margin: '4px 2px' }} />
          <button
            onClick={() => autoLayout()}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.2s'
            }}
            title="Auto-arrange entity nodes"
          >
            <Sparkles size={14} style={{ color: 'var(--text-secondary)' }} />
            <span>Auto Layout</span>
          </button>
          <div style={{ width: '1px', background: 'var(--glass-border)', margin: '4px 2px' }} />
          <button
            onClick={onOpenImport}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.2s'
            }}
            title="Import schema from DDL or Spring Boot folder"
          >
            <Upload size={14} style={{ color: 'var(--text-secondary)' }} />
            <span>Import / Scan</span>
          </button>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onNodeDragStart={() => takeSnapshot()}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(120, 120, 120, 0.12)" />
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
