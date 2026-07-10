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
  const targetFramework = useDiagramStore((state) => state.targetFramework);
  const setTargetFramework = useDiagramStore((state) => state.setTargetFramework);

  const openApiSupport = useDiagramStore((state) => state.openApiSupport);
  const setOpenApiSupport = useDiagramStore((state) => state.setOpenApiSupport);
  
  const generateTestStubs = useDiagramStore((state) => state.generateTestStubs);
  const setGenerateTestStubs = useDiagramStore((state) => state.setGenerateTestStubs);

  const flywayMigration = useDiagramStore((state) => state.flywayMigration);
  const setFlywayMigration = useDiagramStore((state) => state.setFlywayMigration);

  const addEntity = useDiagramStore((state) => state.addEntity);
  const nodes = useDiagramStore((state) => state.nodes);

  // LocalStorage Save & Load
  const handleSaveDiagram = () => {
    const storeState = useDiagramStore.getState();
    const dataToSave = {
      projectName: storeState.projectName,
      basePackage: storeState.basePackage,
      targetFramework: storeState.targetFramework,
      openApiSupport: storeState.openApiSupport,
      generateTestStubs: storeState.generateTestStubs,
      flywayMigration: storeState.flywayMigration,
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
        targetFramework: parsed.targetFramework || 'SPRING_BOOT',
        openApiSupport: !!parsed.openApiSupport,
        generateTestStubs: !!parsed.generateTestStubs,
        flywayMigration: !!parsed.flywayMigration,
        nodes: parsed.nodes || [],
        edges: parsed.edges || []
      });
      alert('Diagram loaded successfully!');
    } catch (e) {
      alert('Failed to parse saved diagram: ' + e);
    }
  };

  return (
    <div className="sidebar" style={{ borderLeft: 'none', borderRight: '1px solid var(--glass-border)', width: '320px', height: '100%', overflowY: 'auto' }}>
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

        {targetFramework === 'SPRING_BOOT' && (
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
        )}

        <div className="sidebar-field">
          <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Target Framework</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'SPRING_BOOT', label: 'Spring Boot', desc: 'Java / Maven / JPA', color: '#4ade80' },
              { id: 'EXPRESS', label: 'Express TS', desc: 'Node.js / Prisma', color: '#38bdf8' },
              { id: 'FASTAPI', label: 'FastAPI', desc: 'Python / SQLAlchemy', color: '#fb923c' }
            ].map((fw) => {
              const active = targetFramework === fw.id;
              return (
                <button
                  key={fw.id}
                  onClick={() => setTargetFramework(fw.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: active ? `1px solid ${fw.color}` : '1px solid var(--glass-border)',
                    background: active 
                      ? `rgba(${fw.id === 'SPRING_BOOT' ? '74, 222, 128' : fw.id === 'EXPRESS' ? '56, 189, 248' : '251, 146, 60'}, 0.08)` 
                      : 'rgba(255,255,255,0.01)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: active 
                      ? `0 0 12px rgba(${fw.id === 'SPRING_BOOT' ? '74, 222, 128' : fw.id === 'EXPRESS' ? '56, 189, 248' : '251, 146, 60'}, 0.12)` 
                      : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: fw.color
                    }} />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {fw.label}
                    </span>
                    {active && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.6rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: fw.color,
                        fontWeight: 700
                      }}>
                        Active
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', marginLeft: '14px' }}>
                    {fw.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--glass-border)', margin: '16px 0 0 0', padding: '16px 0 0 0' }}>
          <label className="section-label" style={{ marginBottom: '8px' }}>Generator Features</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* OpenAPI Feature */}
            {(() => {
              const isSupported = targetFramework === 'SPRING_BOOT' || targetFramework === 'FASTAPI';
              return (
                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '8px', 
                    fontSize: '0.8rem', 
                    cursor: isSupported ? 'pointer' : 'not-allowed',
                    opacity: isSupported ? 1 : 0.45,
                    transition: 'opacity 0.2s'
                  }}
                  title={!isSupported ? "OpenAPI documentation is not supported for Express scaffolding." : "Enable OpenAPI/Swagger Docs generation"}
                >
                  <input
                    type="checkbox"
                    checked={isSupported ? openApiSupport : false}
                    disabled={!isSupported}
                    onChange={(e) => setOpenApiSupport(e.target.checked)}
                    style={{ 
                      accentColor: 'var(--text-main)', 
                      width: '14px', 
                      height: '14px', 
                      marginTop: '2px',
                      cursor: isSupported ? 'pointer' : 'not-allowed' 
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>OpenAPI / Swagger Docs</span>
                    {!isSupported && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                        Not supported for Express
                      </span>
                    )}
                  </div>
                </label>
              );
            })()}

            {/* Mockito Tests Feature */}
            {(() => {
              const isSupported = targetFramework === 'SPRING_BOOT';
              return (
                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '8px', 
                    fontSize: '0.8rem', 
                    cursor: isSupported ? 'pointer' : 'not-allowed',
                    opacity: isSupported ? 1 : 0.45,
                    transition: 'opacity 0.2s'
                  }}
                  title={!isSupported ? "Mockito service tests are Spring Boot specific." : "Enable Mockito Service Unit Tests generation"}
                >
                  <input
                    type="checkbox"
                    checked={isSupported ? generateTestStubs : false}
                    disabled={!isSupported}
                    onChange={(e) => setGenerateTestStubs(e.target.checked)}
                    style={{ 
                      accentColor: 'var(--text-main)', 
                      width: '14px', 
                      height: '14px', 
                      marginTop: '2px',
                      cursor: isSupported ? 'pointer' : 'not-allowed' 
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Mockito Service Unit Tests</span>
                    {!isSupported && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                        Spring Boot only
                      </span>
                    )}
                  </div>
                </label>
              );
            })()}

            {/* Flyway SQL migrations Feature */}
            {(() => {
              const isSupported = targetFramework === 'SPRING_BOOT';
              return (
                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '8px', 
                    fontSize: '0.8rem', 
                    cursor: isSupported ? 'pointer' : 'not-allowed',
                    opacity: isSupported ? 1 : 0.45,
                    transition: 'opacity 0.2s'
                  }}
                  title={!isSupported ? "Flyway SQL Migrations are Spring Boot specific." : "Enable Flyway SQL Migrations generation"}
                >
                  <input
                    type="checkbox"
                    checked={isSupported ? flywayMigration : false}
                    disabled={!isSupported}
                    onChange={(e) => setFlywayMigration(e.target.checked)}
                    style={{ 
                      accentColor: 'var(--text-main)', 
                      width: '14px', 
                      height: '14px', 
                      marginTop: '2px',
                      cursor: isSupported ? 'pointer' : 'not-allowed' 
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Flyway SQL Migrations</span>
                    {!isSupported && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                        Spring Boot only
                      </span>
                    )}
                  </div>
                </label>
              );
            })()}
          </div>
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

      <div className="sidebar-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
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
