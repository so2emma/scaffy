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

  const handleTypeChange = (type: any) => {
    updateRelationship(edge.id, { type });
  };

  const handleFieldChange = (key: 'fromField' | 'toField' | 'joinTable', value: string) => {
    updateRelationship(edge.id, { [key]: value });
  };

  const handleNullableChange = (key: 'fromNullable' | 'toNullable', checked: boolean) => {
    updateRelationship(edge.id, { [key]: checked });
  };

  const handleCascadeToggle = (cascadeOption: string) => {
    const current = config.cascade || [];
    let updated;
    if (current.includes(cascadeOption)) {
      updated = current.filter((c) => c !== cascadeOption);
    } else {
      updated = [...current, cascadeOption];
    }
    updateRelationship(edge.id, { cascade: updated });
  };

  return (
    <div className="sidebar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="sidebar-title" style={{ border: 'none', padding: '0' }}>Relationship Config</h3>
        <button 
          onClick={() => setSelectedEdgeId(null)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      <div className="sidebar-section" style={{ fontSize: '0.85rem' }}>
        <div style={{ color: 'var(--text-muted)' }}>
          Connection: <strong style={{ color: 'var(--text-primary)' }}>{sourceNode.data.name}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{targetNode.data.name}</strong>
        </div>
      </div>

      <div className="sidebar-section">
        <label className="section-label">Relationship Type</label>
        <select
          className="text-input"
          value={config.type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          <option value="ONE_TO_ONE">One to One (1:1)</option>
          <option value="ONE_TO_MANY">One to Many (1:N)</option>
          <option value="MANY_TO_ONE">Many to One (N:1)</option>
          <option value="MANY_TO_MANY">Many to Many (M:N)</option>
        </select>
      </div>

      <div className="sidebar-section">
        <label className="section-label">Field Mappings</label>
        
        <div className="sidebar-field">
          <label className="field-label">Field name in {sourceNode.data.name} (fromField)</label>
          <input
            type="text"
            className="text-input"
            value={config.fromField}
            onChange={(e) => handleFieldChange('fromField', e.target.value)}
            placeholder="e.g. author"
          />
        </div>

        <div className="sidebar-field">
          <label className="field-label">Field name in {targetNode.data.name} (toField - optional)</label>
          <input
            type="text"
            className="text-input"
            value={config.toField || ''}
            onChange={(e) => handleFieldChange('toField', e.target.value)}
            placeholder="e.g. books (leave empty for unidirectional)"
          />
        </div>
      </div>

      <div className="sidebar-section">
        <label className="section-label">Nullability (FK Optionality)</label>
        
        <div className="sidebar-field-row">
          <label className="field-label">Is {sourceNode.data.name} reference nullable?</label>
          <input
            type="checkbox"
            className="checkbox-input"
            checked={config.fromNullable}
            onChange={(e) => handleNullableChange('fromNullable', e.target.checked)}
          />
        </div>

        <div className="sidebar-field-row">
          <label className="field-label">Is {targetNode.data.name} reference nullable?</label>
          <input
            type="checkbox"
            className="checkbox-input"
            checked={config.toNullable}
            onChange={(e) => handleNullableChange('toNullable', e.target.checked)}
          />
        </div>
      </div>

      {config.type === 'MANY_TO_MANY' && (
        <div className="sidebar-section">
          <label className="section-label">Join Table Details</label>
          <div className="sidebar-field">
            <label className="field-label">Join Table Name</label>
            <input
              type="text"
              className="text-input"
              value={config.joinTable || ''}
              onChange={(e) => handleFieldChange('joinTable', e.target.value)}
              placeholder="e.g. author_books"
            />
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <label className="section-label">JPA Cascade Policies</label>
        <div className="cascade-chip-group">
          {['PERSIST', 'MERGE', 'REMOVE'].map((option) => {
            const isSelected = config.cascade?.includes(option);
            return (
              <button
                key={option}
                className={`cascade-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => handleCascadeToggle(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button
          className="btn btn-danger"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => removeRelationship(edge.id)}
        >
          <Trash2 size={16} /> Delete Relationship
        </button>
      </div>
    </div>
  );
};
