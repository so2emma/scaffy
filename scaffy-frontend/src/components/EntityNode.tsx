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
    `rounded border px-1.5 py-0.5 text-[0.7rem] font-bold transition-colors disabled:opacity-40 ${
      active
        ? kind === 'pk'
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border-strong bg-surface-3 text-content'
        : 'border-transparent text-subtle hover:bg-surface-2'
    }`;

  return (
    <div
      className={`w-80 overflow-hidden rounded-xl border bg-surface shadow-lg transition-all ${
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      }`}
    >
      <Handle type="target" position={Position.Top} id="t-top" />
      <Handle type="target" position={Position.Left} id="t-left" />

      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center justify-between">
          <input
            type="text"
            className="w-[70%] rounded border border-transparent bg-transparent px-1 py-0.5 font-display text-base font-semibold text-content outline-none hover:bg-surface-3 focus:border-primary focus:bg-surface"
            value={name}
            onChange={handleNameChange}
            placeholder="EntityName"
          />
          <button
            className="rounded p-1 text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
            onClick={(e) => {
              e.stopPropagation();
              removeEntity(id);
            }}
            title="Delete Entity"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <input
          type="text"
          className="input !bg-surface-3 !px-2 !py-1 !text-xs"
          value={tableName}
          onChange={handleTableChange}
          placeholder="table_name (optional)"
        />
        <div className="mt-1 flex items-center gap-1.5">
          <input
            type="checkbox"
            id={`softdelete-${id}`}
            checked={!!node.data.softDelete}
            onChange={(e) => updateEntitySoftDelete(id, e.target.checked)}
            className="h-3 w-3 cursor-pointer accent-primary"
          />
          <label
            htmlFor={`softdelete-${id}`}
            className="cursor-pointer select-none text-[0.65rem] text-muted"
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
                      className="w-full rounded border border-transparent bg-transparent p-0.5 text-[0.775rem] text-content outline-none focus:border-primary focus:bg-surface-2"
                      value={attr.name}
                      onChange={(e) => handleAttributeChange(index, 'name', e.target.value)}
                      placeholder="field"
                    />
                  </td>

                  <td className="w-[28%] py-1.5 pr-1 align-middle">
                    <select
                      className="w-full cursor-pointer rounded border border-border bg-surface-2 px-1 py-0.5 text-[0.725rem] text-muted outline-none focus:border-primary"
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
                        className={`rounded border px-1 py-0.5 transition-colors ${
                          expandedIndex === index
                            ? 'border-border-strong bg-surface-3 text-content'
                            : 'border-transparent text-subtle hover:bg-surface-2'
                        }`}
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        title="Validation Settings"
                      >
                        <Settings size={10} />
                      </button>
                      <button
                        className="text-subtle transition-colors hover:text-danger"
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

                {expandedIndex === index && (
                  <tr>
                    <td colSpan={4} className="bg-surface-2 p-1.5">
                      <div className="flex flex-col gap-1.5">
                        <div className="text-[0.65rem] font-bold text-muted">Validation rules:</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex cursor-pointer items-center gap-1 text-[0.65rem]">
                            <input
                              type="checkbox"
                              checked={!!attr.validation?.required}
                              onChange={(e) => updateAttributeValidation(id, index, { required: e.target.checked })}
                              className="h-3 w-3 accent-primary"
                            />
                            <span>Required</span>
                          </label>

                          {attr.type === 'String' && (
                            <>
                              <label className="flex cursor-pointer items-center gap-1 text-[0.65rem]">
                                <input
                                  type="checkbox"
                                  checked={!!attr.validation?.email}
                                  onChange={(e) => updateAttributeValidation(id, index, { email: e.target.checked })}
                                  className="h-3 w-3 accent-primary"
                                />
                                <span>Email</span>
                              </label>

                              <div className="flex items-center gap-1 text-[0.65rem]">
                                <span>Min:</span>
                                <input
                                  type="number"
                                  className="input h-[18px] w-11 !bg-surface-3 !p-0.5 !text-[0.65rem]"
                                  value={attr.validation?.minSize ?? ''}
                                  onChange={(e) =>
                                    updateAttributeValidation(id, index, {
                                      minSize: e.target.value ? parseInt(e.target.value) : null,
                                    })
                                  }
                                  placeholder="0"
                                />
                              </div>

                              <div className="flex items-center gap-1 text-[0.65rem]">
                                <span>Max:</span>
                                <input
                                  type="number"
                                  className="input h-[18px] w-11 !bg-surface-3 !p-0.5 !text-[0.65rem]"
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
              <div key={`enum-${index}`} className="mb-2 rounded-lg border border-border bg-surface-2 p-2.5">
                <div className="field-label mb-1 !text-[0.6rem]">Enum values (comma separated)</div>
                <input
                  type="text"
                  className="input !py-0.5 !text-xs"
                  value={attr.enumValues?.join(', ') || ''}
                  onChange={(e) => handleEnumValuesChange(index, e.target.value)}
                  placeholder="PENDING, SHIPPED, DELIVERED"
                />
              </div>
            )
        )}

        <button
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-xs text-muted transition-colors hover:border-primary hover:text-content"
          onClick={() => addAttribute(id)}
        >
          <Plus size={12} /> Add Attribute
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} id="s-bottom" />
      <Handle type="source" position={Position.Right} id="s-right" />
    </div>
  );
};
