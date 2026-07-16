import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { FRAMEWORK_FEATURES } from '../constants/frameworkFeatures';
import { AVAILABLE_FRAMEWORKS, FrameworkSelectorModal } from './FrameworkSelectorModal';
import { useToast } from '../hooks/useToast';
import { Plus, Download, Upload, FileDown, Database, ChevronRight, LayoutTemplate } from 'lucide-react';

interface SidebarProps {
  onGenerate: () => void;
  isGenerating: boolean;
  onOpenTemplates: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onGenerate, isGenerating, onOpenTemplates }) => {
  const projectName = useDiagramStore((state) => state.projectName);
  const setProjectName = useDiagramStore((state) => state.setProjectName);
  
  const basePackage = useDiagramStore((state) => state.basePackage);
  const setBasePackage = useDiagramStore((state) => state.setBasePackage);
  const targetFramework = useDiagramStore((state) => state.targetFramework);
  const setTargetFramework = useDiagramStore((state) => state.setTargetFramework);

  const enabledFeatures = useDiagramStore((state) => state.enabledFeatures);
  const toggleFeature = useDiagramStore((state) => state.toggleFeature);

  const addEntity = useDiagramStore((state) => state.addEntity);
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);

  const { showToast } = useToast();

  const [isFrameworkModalOpen, setIsFrameworkModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('saved');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const frameworkFeatures = FRAMEWORK_FEATURES[targetFramework] || [];
  const currentFramework = AVAILABLE_FRAMEWORKS.find((fw) => fw.id === targetFramework);

  // Auto-save with debounce
  const performAutoSave = useCallback(() => {
    const storeState = useDiagramStore.getState();
    const dataToSave = {
      projectName: storeState.projectName,
      basePackage: storeState.basePackage,
      targetFramework: storeState.targetFramework,
      enabledFeatures: storeState.enabledFeatures,
      nodes: storeState.nodes,
      edges: storeState.edges,
    };
    try {
      localStorage.setItem('scaffy_diagram_save', JSON.stringify(dataToSave));
      setSaveStatus('saved');
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }, []);

  useEffect(() => {
    // Mark as unsaved whenever relevant state changes
    setSaveStatus('unsaved');

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges, projectName, basePackage, targetFramework, enabledFeatures, performAutoSave]);

  // Export diagram as .scaffy.json file
  const handleExport = () => {
    try {
      const storeState = useDiagramStore.getState();
      const dataToExport = {
        projectName: storeState.projectName,
        basePackage: storeState.basePackage,
        targetFramework: storeState.targetFramework,
        enabledFeatures: storeState.enabledFeatures,
        nodes: storeState.nodes,
        edges: storeState.edges,
      };
      const json = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${storeState.projectName.toLowerCase().replace(/\s+/g, '-')}.scaffy.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Diagram exported successfully', 'success');
    } catch (e) {
      showToast('Failed to export diagram: ' + e, 'error');
    }
  };

  // Import diagram from JSON file
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        useDiagramStore.getState().importDiagram(parsed);
        showToast('Diagram imported successfully', 'success');
      } catch (err) {
        showToast('Failed to parse diagram file: ' + err, 'error');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read file', 'error');
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-imported
    e.target.value = '';
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
          
          {/* Active framework display card */}
          {currentFramework && (
            <div
              className="sidebar-framework-card"
              style={{
                border: `1px solid ${currentFramework.color}`,
                background: `rgba(${hexToRgb(currentFramework.color)}, 0.06)`,
                boxShadow: `0 0 16px rgba(${hexToRgb(currentFramework.color)}, 0.1)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: currentFramework.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {currentFramework.displayName}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {currentFramework.description}
                  </span>
                </div>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: currentFramework.color,
                    fontWeight: 700,
                    background: `rgba(${hexToRgb(currentFramework.color)}, 0.12)`,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {currentFramework.language}
                </span>
              </div>
            </div>
          )}

          {/* Change framework button */}
          <button
            className="btn btn-secondary"
            onClick={() => setIsFrameworkModalOpen(true)}
            style={{ width: '100%', marginTop: '8px', justifyContent: 'space-between' }}
          >
            <span>Change Framework</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--glass-border)', margin: '16px 0 0 0', padding: '16px 0 0 0' }}>
          <label className="section-label" style={{ marginBottom: '8px' }}>Generator Features</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {frameworkFeatures.map((feature) => (
              <label
                key={feature.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                title={`Toggle ${feature.label}`}
              >
                <input
                  type="checkbox"
                  checked={!!enabledFeatures[feature.id]}
                  onChange={() => toggleFeature(feature.id)}
                  style={{
                    accentColor: 'var(--text-main)',
                    width: '14px',
                    height: '14px',
                    marginTop: '2px',
                    cursor: 'pointer'
                  }}
                />
                <span>{feature.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
        <label className="section-label">Canvas Controls</label>
        <button 
          className="btn btn-secondary" 
          onClick={onOpenTemplates}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          <LayoutTemplate size={16} /> Start from Template
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => addEntity('NewEntity', 100, 100)}
          style={{ width: '100%' }}
        >
          <Plus size={16} /> Add Entity Node
        </button>
      </div>

      <div className="sidebar-section" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
        <label className="section-label">Diagram File</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleExport} style={{ flex: 1, padding: '8px 10px', fontSize: '0.75rem' }}>
            <FileDown size={14} /> Export
          </button>
          <button className="btn btn-secondary" onClick={handleImport} style={{ flex: 1, padding: '8px 10px', fontSize: '0.75rem' }}>
            <Upload size={14} /> Import
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.scaffy.json"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
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

      {/* Auto-save indicator + Generate button */}
      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px', marginTop: 'auto' }}>
        {/* Save status indicator */}
        <div className={`autosave-indicator ${saveStatus}`} style={{ marginBottom: '10px' }}>
          <span className="autosave-dot" />
          <span className="autosave-text">
            {saveStatus === 'saved' ? 'Saved' : 'Unsaved changes'}
          </span>
        </div>

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

      {/* Framework Selector Modal */}
      <FrameworkSelectorModal
        isOpen={isFrameworkModalOpen}
        onClose={() => setIsFrameworkModalOpen(false)}
        selectedFramework={targetFramework}
        onSelect={setTargetFramework}
      />
    </div>
  );
};

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255, 255, 255';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
