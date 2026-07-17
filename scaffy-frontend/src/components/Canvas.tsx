import React, { useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Undo2, Redo2, Sparkles, Upload, Image as ImageIcon, FileText, Loader2, LayoutTemplate,
} from 'lucide-react';
import { useDiagramStore } from '../store/useDiagramStore';
import { EntityNode } from './EntityNode';
import { toPng } from 'html-to-image';
import { useToast } from '../hooks/useToast';
import jsPDF from 'jspdf';

const nodeTypes = {
  entityNode: EntityNode,
};

interface CanvasProps {
  onOpenImport: () => void;
  onOpenTemplates: () => void;
}

const ToolbarButton: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, title, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-content transition-colors enabled:hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-subtle"
  >
    {children}
  </button>
);

export const Canvas: React.FC<CanvasProps> = ({ onOpenImport, onOpenTemplates }) => {
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const onNodesChange = useDiagramStore((state) => state.onNodesChange);
  const onEdgesChange = useDiagramStore((state) => state.onEdgesChange);
  const onConnect = useDiagramStore((state) => state.onConnect);
  const setSelectedEdgeId = useDiagramStore((state) => state.setSelectedEdgeId);

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
  const { showToast } = useToast();

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

      const viewport = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.1, 2, 0.05);

      const viewportNode = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportNode) throw new Error('Viewport not found');

      const dataUrl = await toPng(viewportNode, {
        backgroundColor: theme === 'dark' ? '#0a0a0b' : '#f6f7f9',
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
          format: [imageWidth, imageHeight],
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, imageWidth, imageHeight);
        pdf.save(`${projectName || 'diagram'}.pdf`);
      }
    } catch (e) {
      console.error('Export failed', e);
      showToast('Failed to export diagram.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleEdgeClick = (_: React.MouseEvent, edge: any) => setSelectedEdgeId(edge.id);
  const handlePaneClick = () => setSelectedEdgeId(null);

  const divider = <div className="mx-0.5 my-1 w-px bg-border" />;

  return (
    <div className="relative h-full w-full bg-canvas">
      {/* Floating Toolbar */}
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-1 rounded-xl border border-border bg-surface/90 p-1 shadow-lg backdrop-blur">
        <ToolbarButton onClick={() => undo()} disabled={past.length === 0} title="Undo (Ctrl+Z)">
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => redo()} disabled={future.length === 0} title="Redo (Ctrl+Y)">
          <Redo2 size={16} />
        </ToolbarButton>
        {divider}
        <ToolbarButton onClick={() => autoLayout()} title="Auto-arrange entity nodes">
          <Sparkles size={14} className="text-muted" />
          <span className="hidden sm:inline">Auto Layout</span>
        </ToolbarButton>
        {divider}
        <ToolbarButton onClick={onOpenImport} title="Import schema from DDL or backend folder">
          <Upload size={14} className="text-muted" />
          <span className="hidden sm:inline">Import / Scan</span>
        </ToolbarButton>
        {divider}
        <ToolbarButton onClick={() => handleExport('png')} disabled={isExporting} title="Download Diagram as PNG">
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} className="text-muted" />}
          <span className="hidden sm:inline">PNG</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => handleExport('pdf')} disabled={isExporting} title="Download Diagram as PDF">
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} className="text-muted" />}
          <span className="hidden sm:inline">PDF</span>
        </ToolbarButton>
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
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--dot-grid)" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="color-mix(in srgb, var(--c-canvas) 60%, transparent)"
          style={{ background: 'var(--c-surface)' }}
          nodeColor="var(--c-primary)"
        />

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="pointer-events-auto rounded-2xl border border-border bg-surface px-10 py-8 shadow-xl">
              <div className="mb-4 flex justify-center">
                <LayoutTemplate size={48} className="text-subtle opacity-60" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-content">
                Start from scratch or choose a template
              </h3>
              <p className="mb-5 text-sm text-muted">
                Get started quickly with pre-built entity patterns
              </p>
              <button className="btn btn-primary mx-auto px-5 py-2.5" onClick={onOpenTemplates}>
                <LayoutTemplate size={18} />
                Browse Templates
              </button>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  );
};
