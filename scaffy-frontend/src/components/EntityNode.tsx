import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useDiagramStore, Attribute } from '../store/useDiagramStore';
import { Trash2, Plus, Settings, AlertTriangle } from 'lucide-react';

export const EntityNode: React.FC<NodeProps> = ({ id, selected }) => {
  const node = useDiagramStore((state) => state.nodes.find((n) => n.id === id));
  const validationErrors = useDiagramStore((state) => state.validationErrors);
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
  const nodeErrors = validationErrors.filter((e) => e.target === name);
  const hasError = nodeErrors.length > 0;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateEntityName(id, e.target.value);
  };

  const handleTableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateEntityTableName(id, e.target.value);
  };

  const handleAttributeChange = (index: number, key: keyof Attribute, val: any) => {
    updateAttribute(id, index, { [key]: val });
  };

  const handleEnumValuesChange = (index: number, valueStr: string) => {
    const values = valueStr.split(',').map((v) => v.trim().toUpperCase()).filter((v) => v !== '');
    updateAttribute(id, index, { enumValues: values });
  };

  const flagBtn = (active: boolean, kind: 'pk' | 'flag') =>
    `rounded px-1.5 py-0.5 text-[0.7rem] font-semibold transition-all disabled:opacity-40 ${
      active
        ? kind === 'pk'
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'bg-surface-3 text-content border border-border-strong'
        : 'text-subtle hover:bg-surface-hover border border-transparent'
    }`;

  return (
    <div
      className={`relative w-80 rounded-lg border bg-surface shadow-lg transition-all duration-200 ${
        hasError ? '' : selected ? 'border-accent shadow-xl ring-2 ring-accent/30' : 'border-border hover:shadow-xl'
      }`}
      style={
        hasError
          ? {
              boxShadow: '0 0 0 2px var(--c-danger), 0 0 20px 4px color-mix(in srgb, var(--c-danger) 30%, transparent)',
              borderColor: 'var(--c-danger)',
            }
          : undefined
      }
    >
      <Handle type="target" position={Position.Top} id="t-top" />
      <Handle type="target" position={Position.Left} id="t-left" />

      {hasError && (
        <div
          className="animate-errorPulse absolute -right-2 -top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full shadow-md"
          style={{
            backgroundColor: 'var(--c-danger)',
            color: '#ffffff',
          }}
          title={nodeErrors.map((e) => e.message).join('\n')}
        >
          <AlertTriangle size={14} style={{ color: '#ffffff' }} />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border bg-surface-2 px-4 py-3 rounded-t-lg">
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            className="flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-base font-semibold text-content outline-none transition-all hover:bg-surface-hover focus:border-accent focus:bg-surface"
            value={name}
            onChange={handleNameChange}
            placeholder="EntityName"
          />
          <button
            className="rounded p-1.5 text-subtle transition-all hover:bg-danger/15 hover:text-danger"
            onClick={(e) => {
              e.stopPropagation();
              removeEntity(id);
            }}
            title="Delete Entity"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <input
          type="text"
          className="input !bg-surface-3 !px-2.5 !py-1.5 !text-xs"
          value={tableName}
          onChange={handleTableChange}
          placeholder="table_name (optional)"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`softdelete-${id}`}
            checked={!!node.data.softDelete}
            onChange={(e) => updateEntitySoftDelete(id, e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded accent-primary"
          />
          <label
            htmlFor={`softdelete-${id}`}
            className="cursor-pointer select-none text-xs text-muted"
          >
            Soft-Delete (adds deletedAt)
          </label>
        </div>
      </div>

      {/* Attributes */}
      <div className="px-4 py-3">
        <table className="mb-3 w-full border-collapse">
          <tbody>
            {attributes.map((attr, index) => (
              <React.Fragment key={index}>
                <tr className="border-b border-border last:border-b-0">
                  <td className="w-[30%] py-1.5 pr-1 align-middle">
                    <input
                      type="text"
                      className="w-full rounded border border-transparent bg-transparent p-1 text-xs text-content outline-none transition-all hover:bg-surface-hover focus:border-accent focus:bg-surface-2"
                      value={attr.name}
                      onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                      placeholder="field"
                    />
                  </td>

                  <td className="w-[28%] py-1.5 pr-1 align-middle">
                    <select
                      className="select w-full cursor-pointer !px-1.5 !py-0.5 !text-xs text-muted"
                      value={attr.type}
                      onChange={(e) => {
                        handleAttributeChange(index, 'type', e.target.value);
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

                  <td className="w-[30%] py-1.5 pr-1 align-middle">
                    <div className="flex justify-end gap-0.5">
                      <button
                        className={flagBtn(attr.primaryKey, 'pk')}
                        onClick={() => {
                          handleAttributeChange(index, 'primaryKey', !attr.primaryKey);
                          if (!attr.primaryKey) handleAttributeChange(index, 'nullable', false);
                        }}
                        title="Primary Key"
                      >
                        PK
                      </button>
                      <button
                        className={flagBtn(!attr.nullable, 'flag')}
                        disabled={attr.primaryKey}
                        onClick={() => handleAttributeChange(index, 'nullable', !attr.nullable)}
                        title="Not Null"
                      >
                        NN
                      </button>
                      <button
                        className={flagBtn(attr.unique, 'flag')}
                        onClick={() => handleAttributeChange(index, 'unique', !attr.unique)}
                        title="Unique"
                      >
                        UQ
                      </button>
                    </div>
                  </td>

                  <td className="w-[12%] py-1.5 text-right align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className={`rounded border px-1 py-0.5 transition-all ${
                          expandedIndex === index
                            ? 'border-accent/50 bg-accent/10 text-accent'
                            : 'border-transparent text-subtle hover:bg-surface-hover hover:text-content'
                        }`}
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        title="Validation Settings"
                      >
                        <Settings size={11} />
                      </button>
                      <button
                        className="text-subtle transition-all hover:text-danger"
                        onClick={() => {
                          if (expandedIndex === index) setExpandedIndex(null);
                          removeAttribute(id, index);
                        }}
                        title="Delete Attribute"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedIndex === index && (
                  <tr>
                    <td colSpan={4} className="bg-surface-2 p-2">
                      <div className="flex flex-col gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Validation</div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={!!attr.validation?.required}
                              onChange={(e) => updateAttributeValidation(id, index, { required: e.target.checked })}
                              className="h-3.5 w-3.5 rounded accent-primary"
                            />
                            <span>Required</span>
                          </label>

                          {attr.type === 'String' && (
                            <>
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                                <input
                                  type="checkbox"
                                  checked={!!attr.validation?.email}
                                  onChange={(e) => updateAttributeValidation(id, index, { email: e.target.checked })}
                                  className="h-3.5 w-3.5 rounded accent-primary"
                                />
                                <span>Email</span>
                              </label>

                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-muted">Min:</span>
                                <input
                                  type="number"
                                  className="input h-6 w-14 !px-1.5 !py-1 !text-xs"
                                  value={attr.validation?.minSize ?? ''}
                                  onChange={(e) =>
                                    updateAttributeValidation(id, index, {
                                      minSize: e.target.value ? parseInt(e.target.value) : null,
                                    })
                                  }
                                  placeholder="0"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-muted">Max:</span>
                                <input
                                  type="number"
                                  className="input h-6 w-14 !px-1.5 !py-1 !text-xs"
                                  value={attr.validation?.maxSize ?? ''}
                                  onChange={(e) =>
                                    updateAttributeValidation(id, index, {
                                      maxSize: e.target.value ? parseInt(e.target.value) : null,
                                    })
                                  }
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

        {attributes.map(
          (attr, index) =>
            attr.type === 'Enum' && (
              <div key={`enum-${index}`} className="mb-3 rounded-lg border border-border bg-surface-2 p-3">
                <div className="field-label mb-1.5">Enum values (comma separated)</div>
                <input
                  type="text"
                  className="input !py-1.5 !text-xs"
                  value={attr.enumValues?.join(', ') || ''}
                  onChange={(e) => handleEnumValuesChange(index, e.target.value)}
                  placeholder="PENDING, SHIPPED, DELIVERED"
                />
              </div>
            )
        )}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted transition-all hover:border-accent hover:bg-surface-hover hover:text-accent"
          onClick={() => addAttribute(id)}
        >
          <Plus size={14} /> Add Attribute
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} id="s-bottom" />
      <Handle type="source" position={Position.Right} id="s-right" />
    </div>
  );
};
