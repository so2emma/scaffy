import React, { useMemo, useEffect, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  BackgroundVariant,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Undo2, Redo2, Sparkles, Upload, Download, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { useDiagramStore } from '../store/useDiagramStore';
import { EntityNode } from './EntityNode';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

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
  const theme = useDiagramStore((state) => state.theme);
  const projectName = useDiagramStore((state) => state.projectName);

  const { getNodes } = useReactFlow();
  const [isExporting, setIsExporting] = useState(false);

  const downloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.setAttribute('download', filename);
    a.setAttribute('href', dataUrl);
    a.click();
  };

  const handleExport = async (format: 'png' | 'pdf') => {
    const currentNodes = getNodes();
    if (currentNodes.length === 0) return;
    
    setIsExporting(true);
    try {
      const nodesBounds = getNodesBounds(currentNodes);
      const imageWidth = Math.max(800, nodesBounds.width + 100);
      const imageHeight = Math.max(600, nodesBounds.height + 100);
      
      const viewport = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.1,
        2,
        0.05
      );
      
      const viewportNode = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportNode) throw new Error('Viewport not found');
      
      const dataUrl = await toPng(viewportNode, {
        backgroundColor: theme === 'dark' ? '#0A0A0A' : '#F9FAFB',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
      
      if (format === 'png') {
        downloadImage(dataUrl, `${projectName || 'diagram'}.png`);
      } else {
        const pdf = new jsPDF({
          orientation: imageWidth > imageHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [imageWidth, imageHeight]
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, imageWidth, imageHeight);
        pdf.save(`${projectName || 'diagram'}.pdf`);
      }
    } catch (e) {
      console.error('Export failed', e);
      alert('Failed to export diagram.');
    } finally {
      setIsExporting(false);
    }
  };

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
          
          <div style={{ width: '1px', background: 'var(--glass-border)', margin: '4px 2px' }} />

          <button
            onClick={() => handleExport('png')}
            disabled={isExporting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: isExporting ? 'wait' : 'pointer',
              padding: '6px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.2s',
              opacity: isExporting ? 0.7 : 1
            }}
            title="Download Diagram as PNG"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} style={{ color: 'var(--text-secondary)' }} />}
            <span>PNG</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: isExporting ? 'wait' : 'pointer',
              padding: '6px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.2s',
              opacity: isExporting ? 0.7 : 1
            }}
            title="Download Diagram as PDF"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} style={{ color: 'var(--text-secondary)' }} />}
            <span>PDF</span>
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
