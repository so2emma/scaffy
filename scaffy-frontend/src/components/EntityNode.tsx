import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useDiagramStore, Attribute } from '../store/useDiagramStore';
import { Trash2, Plus, Settings } from 'lucide-react';

export const EntityNode: React.FC<NodeProps> = ({ id, selected }) => {
  const node = useDiagramStore((state) => state.nodes.find((n) => n.id === id));
  const updateEntityName = useDiagramStore((state) => state.updateEntityName);
  const updateEntityTableName = useDiagramStore((state) => state.updateEntityTableName);
  const updateEntitySoftDelete = useDiagramStore((state) => state.updateEntitySoftDelete);
  const removeEntity = useDiagramStore((state) => state.removeEntity);
  
  const addAttribute = useDiagramStore((state) => state.addAttribute);
  const updateAttribute = useDiagramStore((state) => state.updateAttribute);
  const removeAttribute = useDiagramStore((state) => state.removeAttribute);
  const updateAttributeValidation = useDiagramStore((state) => state.updateAttributeValidation);

  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  if (!node) return null;

  const { name, tableName, attributes } = node.data;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // PascalCase validation hint
    const val = e.target.value;
    updateEntityName(id, val);
  };

  const handleTableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateEntityTableName(id, e.target.value);
  };

  const handleAttributeChange = (index: number, key: keyof Attribute, val: any) => {
    updateAttribute(id, index, { [key]: val });
  };

  // Helper to edit enum values inline
  const handleEnumValuesChange = (index: number, valueStr: string) => {
    const values = valueStr.split(',').map(v => v.trim().toUpperCase()).filter(v => v !== '');
    updateAttribute(id, index, { enumValues: values });
  };

  return (
    <div className={`entity-node ${selected ? 'selected-node' : ''}`}>
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} id="t-top" />
      <Handle type="target" position={Position.Left} id="t-left" />

      {/* Header */}
      <div className="entity-header">
        <div className="entity-header-row">
          <input
            type="text"
            className="entity-title-input"
            value={name}
            onChange={handleNameChange}
            placeholder="EntityName"
          />
          <button 
            className="entity-delete-btn"
            onClick={(e) => { e.stopPropagation(); removeEntity(id); }}
            title="Delete Entity"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="sidebar-field">
          <input
            type="text"
            className="text-input"
            style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(120, 120, 120, 0.15)' }}
            value={tableName}
            onChange={handleTableChange}
            placeholder="table_name (optional)"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
          <input
            type="checkbox"
            id={`softdelete-${id}`}
            checked={!!node.data.softDelete}
            onChange={(e) => updateEntitySoftDelete(id, e.target.checked)}
            style={{ accentColor: 'var(--text-main)', width: '12px', height: '12px', cursor: 'pointer' }}
          />
          <label htmlFor={`softdelete-${id}`} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
            Soft-Delete (adds deletedAt)
          </label>
        </div>
      </div>

      {/* Attributes List */}
      <div className="entity-body">
        <table className="attributes-table">
          <tbody>
            {attributes.map((attr, index) => (
              <React.Fragment key={index}>
                <tr className="attr-row">
                  {/* Attr Name */}
                  <td className="attr-cell" style={{ width: '30%' }}>
                    <input
                      type="text"
                      className="attr-input-name"
                      value={attr.name}
                      onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                      placeholder="field"
                    />
                  </td>

                  {/* Attr Type */}
                  <td className="attr-cell" style={{ width: '28%' }}>
                    <select
                      className="attr-select-type"
                      value={attr.type}
                      onChange={(e) => {
                        handleAttributeChange(index, 'type', e.target.value);
                        // Reset validation if type changes to non-String
                        if (e.target.value !== 'String') {
                          updateAttributeValidation(id, index, { email: false, minSize: null, maxSize: null });
                        }
                      }}
                    >
                      <option value="String">String</option>
                      <option value="Integer">Integer</option>
                      <option value="Long">Long</option>
                      <option value="UUID">UUID</option>
                      <option value="Boolean">Boolean</option>
                      <option value="LocalDate">LocalDate</option>
                      <option value="LocalDateTime">LocalDateTime</option>
                      <option value="BigDecimal">BigDecimal</option>
                      <option value="Enum">Enum</option>
                    </select>
                  </td>

                  {/* Flags PK, NN, UQ */}
                  <td className="attr-cell" style={{ width: '30%' }}>
                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }}>
                      <button
                        className={`attr-flag-btn ${attr.primaryKey ? 'active-pk' : ''}`}
                        onClick={() => {
                          handleAttributeChange(index, 'primaryKey', !attr.primaryKey);
                          if (!attr.primaryKey) {
                            handleAttributeChange(index, 'nullable', false);
                          }
                        }}
                        title="Primary Key"
                      >
                        PK
                      </button>
                      <button
                        className={`attr-flag-btn ${!attr.nullable ? 'active' : ''}`}
                        disabled={attr.primaryKey}
                        onClick={() => handleAttributeChange(index, 'nullable', !attr.nullable)}
                        title="Not Null"
                      >
                        NN
                      </button>
                      <button
                        className={`attr-flag-btn ${attr.unique ? 'active' : ''}`}
                        onClick={() => handleAttributeChange(index, 'unique', !attr.unique)}
                        title="Unique"
                      >
                        UQ
                      </button>
                    </div>
                  </td>

                  {/* Settings & Delete */}
                  <td className="attr-cell" style={{ width: '12%', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        className={`attr-flag-btn ${expandedIndex === index ? 'active' : ''}`}
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        title="Validation Settings"
                        style={{ padding: '2px 4px', fontSize: '0.6rem' }}
                      >
                        <Settings size={10} />
                      </button>
                      <button
                        className="attr-delete-btn"
                        onClick={() => {
                          if (expandedIndex === index) setExpandedIndex(null);
                          removeAttribute(id, index);
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Custom Validation Expandable Panel */}
                {expandedIndex === index && (
                  <tr className="validation-row">
                    <td colSpan={4} className="attr-cell" style={{ background: 'rgba(120, 120, 120, 0.08)', padding: '6px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                          Validation rules:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={!!attr.validation?.required}
                              onChange={(e) => updateAttributeValidation(id, index, { required: e.target.checked })}
                              style={{ accentColor: 'var(--text-main)', width: '11px', height: '11px' }}
                            />
                            <span>Required</span>
                          </label>

                          {attr.type === 'String' && (
                            <>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={!!attr.validation?.email}
                                  onChange={(e) => updateAttributeValidation(id, index, { email: e.target.checked })}
                                  style={{ accentColor: 'var(--text-main)', width: '11px', height: '11px' }}
                                />
                                <span>Email</span>
                              </label>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem' }}>
                                <span>Min:</span>
                                <input
                                  type="number"
                                  className="text-input"
                                  style={{ width: '42px', padding: '1px 3px', fontSize: '0.65rem', height: '18px', background: 'rgba(120, 120, 120, 0.15)' }}
                                  value={attr.validation?.minSize ?? ''}
                                  onChange={(e) => updateAttributeValidation(id, index, { minSize: e.target.value ? parseInt(e.target.value) : null })}
                                  placeholder="0"
                                />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem' }}>
                                <span>Max:</span>
                                <input
                                  type="number"
                                  className="text-input"
                                  style={{ width: '42px', padding: '1px 3px', fontSize: '0.65rem', height: '18px', background: 'rgba(120, 120, 120, 0.15)' }}
                                  value={attr.validation?.maxSize ?? ''}
                                  onChange={(e) => updateAttributeValidation(id, index, { maxSize: e.target.value ? parseInt(e.target.value) : null })}
                                  placeholder="255"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Enum values editor row */}
        {attributes.map((attr, index) => attr.type === 'Enum' && (
          <div key={`enum-${index}`} className="enum-editor">
            <div className="input-label" style={{ fontSize: '0.6rem' }}>Enum values (comma separated)</div>
            <input
              type="text"
              className="text-input"
              style={{ width: '100%', fontSize: '0.7rem', padding: '2px 6px' }}
              value={attr.enumValues?.join(', ') || ''}
              onChange={(e) => handleEnumValuesChange(index, e.target.value)}
              placeholder="PENDING, SHIPPED, DELIVERED"
            />
          </div>
        ))}

        <button className="add-attr-btn" onClick={() => addAttribute(id)}>
          <Plus size={12} /> Add Attribute
        </button>
      </div>

      {/* Source Handles */}
      <Handle type="source" position={Position.Bottom} id="s-bottom" />
      <Handle type="source" position={Position.Right} id="s-right" />
    </div>
  );
};
