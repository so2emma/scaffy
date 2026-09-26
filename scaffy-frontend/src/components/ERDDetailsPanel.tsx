import React, { useState } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { Database, Link, FileCheck, ChevronLeft, ChevronRight, AlertCircle, Check, X } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface ERDDetailsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ERDDetailsPanel: React.FC<ERDDetailsPanelProps> = ({ isOpen, onToggle }) => {
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const validationErrors = useDiagramStore((state) => state.validationErrors);
  
  const { setCenter, getNode } = useReactFlow();

  // Calculate statistics
  const entityCount = nodes.length;
  const relationshipCount = edges.length;
  const attributeCount = nodes.reduce((total, node) => total + node.data.attributes.length, 0);
  
  // Group relationships by type
  const relationshipsByType = edges.reduce((acc, edge) => {
    const type = (edge.data as any)?.type || 'UNKNOWN';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleEntityClick = (nodeId: string) => {
    const node = getNode(nodeId);
    if (node) {
      setCenter(node.position.x + 180, node.position.y + 100, { zoom: 1, duration: 800 });
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-border bg-surface/95 px-3 py-2 text-sm font-medium text-content shadow-lg backdrop-blur-sm transition-all hover:bg-surface-hover hover:text-accent"
        title="Open Details Panel"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Details</span>
      </button>
    );
  }

  return (
    <aside className="absolute right-0 top-0 z-10 flex h-full w-80 flex-col gap-4 overflow-y-auto border-l border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-sm scroll-thin">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={20} className="text-accent" />
          <h3 className="text-lg font-semibold text-content">Schema Details</h3>
        </div>
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-muted transition-all hover:bg-surface-hover hover:text-accent"
          title="Close Details Panel"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Schema Statistics */}
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-content">
          <FileCheck size={16} className="text-accent" />
          Schema Statistics
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-md bg-surface p-3">
            <div className="text-2xl font-bold text-accent">{entityCount}</div>
            <div className="text-xs text-muted">Entities</div>
          </div>
          <div className="flex flex-col items-center rounded-md bg-surface p-3">
            <div className="text-2xl font-bold text-accent">{relationshipCount}</div>
            <div className="text-xs text-muted">Relations</div>
          </div>
          <div className="flex flex-col items-center rounded-md bg-surface p-3">
            <div className="text-2xl font-bold text-accent">{attributeCount}</div>
            <div className="text-xs text-muted">Attributes</div>
          </div>
        </div>
      </section>

      {/* Validation Status */}
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-content">
          <AlertCircle size={16} className="text-accent" />
          Validation Status
        </h4>
        {validationErrors.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-surface p-3 text-sm">
            <Check size={14} className="text-success" />
            <span className="text-content">No validation errors</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-md bg-surface p-3">
              <X size={14} className="text-error" />
              <span className="text-sm font-medium text-error">
                {validationErrors.length} issue{validationErrors.length > 1 ? 's' : ''} found
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto scroll-thin">
              {validationErrors.slice(0, 5).map((error, idx) => (
                <div key={idx} className="mb-2 rounded-md bg-surface p-2 text-xs text-muted">
                  <div className="font-semibold text-content">{error.target}</div>
                  <div>{error.message}</div>
                </div>
              ))}
              {validationErrors.length > 5 && (
                <div className="text-xs text-subtle">
                  +{validationErrors.length - 5} more...
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Relationship Summary */}
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-content">
          <Link size={16} className="text-accent" />
          Relationship Summary
        </h4>
        {relationshipCount === 0 ? (
          <div className="rounded-md bg-surface p-3 text-center text-sm text-muted">
            No relationships defined
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(relationshipsByType).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between rounded-md bg-surface px-3 py-2"
              >
                <span className="text-sm text-content">{type.replace(/_/g, ' ')}</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-accent">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Entity List */}
      <section className="flex flex-1 flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-content">
            <Database size={16} className="text-accent" />
            Entity List
          </h4>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
            {entityCount}
          </span>
        </div>
        
        {nodes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface p-4 text-center text-sm text-muted">
            No entities yet. Add one to start building.
          </div>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto scroll-thin">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => handleEntityClick(node.id)}
                className="group flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5 text-left transition-all hover:border-accent hover:bg-surface-hover hover:shadow-sm"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-sm font-semibold text-content group-hover:text-accent">
                    {node.data.name}
                  </span>
                  {node.data.tableName && (
                    <span className="truncate text-xs text-muted">
                      Table: {node.data.tableName}
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-subtle">
                    <span>{node.data.attributes.length} attribute{node.data.attributes.length !== 1 ? 's' : ''}</span>
                    {node.data.softDelete && (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.625rem] font-medium text-accent">
                        SOFT DELETE
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-muted group-hover:text-accent" />
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
};