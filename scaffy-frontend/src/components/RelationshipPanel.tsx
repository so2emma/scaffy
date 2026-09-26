import React from 'react';
import { useDiagramStore, RelationshipConfig } from '../store/useDiagramStore';
import { Trash2, X } from 'lucide-react';

export const RelationshipPanel: React.FC = () => {
  const selectedEdgeId = useDiagramStore((state) => state.selectedEdgeId);
  const setSelectedEdgeId = useDiagramStore((state) => state.setSelectedEdgeId);
  const edges = useDiagramStore((state) => state.edges);
  const nodes = useDiagramStore((state) => state.nodes);
  const updateRelationship = useDiagramStore((state) => state.updateRelationship);
  const removeRelationship = useDiagramStore((state) => state.removeRelationship);

  const edge = edges.find((e) => e.id === selectedEdgeId);
  if (!edge) return null;

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  const config = edge.data as unknown as RelationshipConfig;

  if (!sourceNode || !targetNode || !config) return null;

  const handleTypeChange = (type: any) => updateRelationship(edge.id, { type });

  const handleFieldChange = (key: 'fromField' | 'toField' | 'joinTable', value: string) => {
    updateRelationship(edge.id, { [key]: value });
  };

  const handleNullableChange = (key: 'fromNullable' | 'toNullable', checked: boolean) => {
    updateRelationship(edge.id, { [key]: checked });
  };

  const handleCascadeToggle = (cascadeOption: string) => {
    const current = config.cascade || [];
    const updated = current.includes(cascadeOption)
      ? current.filter((c) => c !== cascadeOption)
      : [...current, cascadeOption];
    updateRelationship(edge.id, { cascade: updated });
  };

  return (
    <aside className="scroll-thin absolute right-0 top-0 z-20 flex h-full w-80 flex-col gap-6 overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl transition-transform duration-300 lg:w-96">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold tracking-tight text-content">Relationship Config</h3>
        <button
          onClick={() => setSelectedEdgeId(null)}
          className="rounded-lg p-1.5 text-muted transition-all duration-200 hover:bg-surface-2 hover:text-content"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="card card-hover rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-muted shadow-sm">
        Connection: <strong className="font-semibold text-accent">{sourceNode.data.name}</strong> to{' '}
        <strong className="font-semibold text-accent">{targetNode.data.name}</strong>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="section-label text-xs font-semibold uppercase tracking-wider text-content">Relationship Type</label>
        <select className="input transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20" value={config.type} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="ONE_TO_ONE">One to One (1:1)</option>
          <option value="ONE_TO_MANY">One to Many (1:N)</option>
          <option value="MANY_TO_ONE">Many to One (N:1)</option>
          <option value="MANY_TO_MANY">Many to Many (M:N)</option>
        </select>
      </div>

      <div className="card card-hover flex flex-col gap-4 rounded-xl border border-border bg-surface-2 p-4 shadow-sm">
        <label className="section-label text-xs font-semibold uppercase tracking-wider text-content">Field Mappings</label>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted">Field name in {sourceNode.data.name} (fromField)</label>
          <input
            type="text"
            className="input transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
            value={config.fromField}
            onChange={(e) => handleFieldChange('fromField', e.target.value)}
            placeholder="e.g. author"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted">Field name in {targetNode.data.name} (toField - optional)</label>
          <input
            type="text"
            className="input transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
            value={config.toField || ''}
            onChange={(e) => handleFieldChange('toField', e.target.value)}
            placeholder="e.g. books (leave empty for unidirectional)"
          />
        </div>
      </div>

      <div className="card card-hover flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4 shadow-sm">
        <label className="section-label text-xs font-semibold uppercase tracking-wider text-content">Nullability (FK Optionality)</label>

        <label className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition-all duration-200 hover:bg-surface-3">
          <span className="text-xs font-medium text-muted">Is {sourceNode.data.name} reference nullable?</span>
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-accent transition-transform duration-200 hover:scale-110"
            checked={config.fromNullable}
            onChange={(e) => handleNullableChange('fromNullable', e.target.checked)}
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition-all duration-200 hover:bg-surface-3">
          <span className="text-xs font-medium text-muted">Is {targetNode.data.name} reference nullable?</span>
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-accent transition-transform duration-200 hover:scale-110"
            checked={config.toNullable}
            onChange={(e) => handleNullableChange('toNullable', e.target.checked)}
          />
        </label>
      </div>

      {config.type === 'MANY_TO_MANY' && (
        <div className="card card-hover flex flex-col gap-4 rounded-xl border border-border bg-surface-2 p-4 shadow-sm">
          <label className="section-label text-xs font-semibold uppercase tracking-wider text-content">Join Table Details</label>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted">Join Table Name</label>
            <input
              type="text"
              className="input transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
              value={config.joinTable || ''}
              onChange={(e) => handleFieldChange('joinTable', e.target.value)}
              placeholder="e.g. author_books"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <label className="section-label text-xs font-semibold uppercase tracking-wider text-content">JPA Cascade Policies</label>
        <div className="flex flex-wrap gap-2">
          {['PERSIST', 'MERGE', 'REMOVE'].map((option) => {
            const isSelected = config.cascade?.includes(option);
            return (
              <button
                key={option}
                className={`rounded-lg border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wide transition-all duration-200 ${
                  isSelected
                    ? 'border-accent bg-accent text-white shadow-md shadow-accent/30 scale-105'
                    : 'border-border bg-surface-2 text-muted hover:border-accent/50 hover:bg-surface-3 hover:text-content'
                }`}
                onClick={() => handleCascadeToggle(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <button
          className="btn btn-danger w-full transition-all duration-200 hover:shadow-lg"
          onClick={() => removeRelationship(edge.id)}
        >
          <Trash2 size={16} /> Delete Relationship
        </button>
      </div>
    </aside>
  );
};
