import React from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { Plus, Download, Save, FolderOpen, Database } from 'lucide-react';

interface SidebarProps {
  onGenerate: () => void;
  isGenerating: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onGenerate, isGenerating }) => {
  const projectName = useDiagramStore((state) => state.projectName);
  const setProjectName = useDiagramStore((state) => state.setProjectName);
  
  const basePackage = useDiagramStore((state) => state.basePackage);
  const setBasePackage = useDiagramStore((state) => state.setBasePackage);

  const addEntity = useDiagramStore((state) => state.addEntity);
  const nodes = useDiagramStore((state) => state.nodes);

  // LocalStorage Save & Load
  const handleSaveDiagram = () => {
    const storeState = useDiagramStore.getState();
    const dataToSave = {
      projectName: storeState.projectName,
      basePackage: storeState.basePackage,
      nodes: storeState.nodes,
      edges: storeState.edges
    };
    localStorage.setItem('scaffy_diagram_save', JSON.stringify(dataToSave));
    alert('Diagram saved successfully to local storage!');
  };

  const handleLoadDiagram = () => {
    const saved = localStorage.getItem('scaffy_diagram_save');
    if (!saved) {
      alert('No saved diagram found!');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      useDiagramStore.setState({
        projectName: parsed.projectName || 'MyProject',
        basePackage: parsed.basePackage || 'com.example.project',
        nodes: parsed.nodes || [],
        edges: parsed.edges || []
      });
      alert('Diagram loaded successfully!');
    } catch (e) {
      alert('Failed to parse saved diagram: ' + e);
    }
  };

  return (
    <div className="sidebar" style={{ borderLeft: 'none', borderRight: '1px solid var(--glass-border)', width: '320px' }}>
      <h3 className="sidebar-title">Project Config</h3>

      <div className="sidebar-section">
        <div className="sidebar-field">
          <label className="input-label">Project Name</label>
          <input
            type="text"
            className="text-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="MyProject"
          />
        </div>

        <div className="sidebar-field">
          <label className="input-label">Base Package</label>
          <input
            type="text"
            className="text-input"
            value={basePackage}
            onChange={(e) => setBasePackage(e.target.value)}
            placeholder="com.example.project"
          />
        </div>
      </div>

      <div className="sidebar-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
        <label className="section-label">Canvas Controls</label>
        <button 
          className="btn btn-secondary" 
          onClick={() => addEntity('NewEntity', 100, 100)}
          style={{ width: '100%' }}
        >
          <Plus size={16} /> Add Entity Node
        </button>
      </div>

      <div className="sidebar-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
        <label className="section-label">State Management</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleSaveDiagram} style={{ flex: 1, padding: '8px 10px', fontSize: '0.75rem' }}>
            <Save size={14} /> Save
          </button>
          <button className="btn btn-secondary" onClick={handleLoadDiagram} style={{ flex: 1, padding: '8px 10px', fontSize: '0.75rem' }}>
            <FolderOpen size={14} /> Load
          </button>
        </div>
      </div>

      <div className="sidebar-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', flex: 1, overflowY: 'auto' }}>
        <label className="section-label">Entities ({nodes.length})</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {nodes.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '16px' }}>
              No entities. Add one to start.
            </div>
          ) : (
            nodes.map((node) => (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                <Database size={12} style={{ color: 'var(--primary)' }} />
                <span>{node.data.name}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                  ({node.data.attributes.length} attrs)
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: 'auto' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          onClick={onGenerate}
          disabled={isGenerating || nodes.length === 0}
        >
          <Download size={18} />
          {isGenerating ? 'Generating...' : 'Generate Backend Scaffold'}
        </button>
      </div>
    </div>
  );
};

// Quick fix for inline javascript CSS variable interpolation fallback
const varColor = (name: string) => `var(${name})`;
const varColorPrimary = varColor('--primary');
