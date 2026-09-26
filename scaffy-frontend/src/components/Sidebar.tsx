import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { useAuthStore } from '../store/useAuthStore';
import { FRAMEWORK_FEATURES } from '../constants/frameworkFeatures';
import { AVAILABLE_FRAMEWORKS, FrameworkSelectorModal } from './FrameworkSelectorModal';
import { useToast } from '../hooks/useToast';
import { Plus, Download, Upload, FileDown, Database, ChevronRight, LayoutTemplate, Save, Cloud, Check, AlertTriangle, X } from 'lucide-react';
import { timeAgo } from './ProjectsPanel';

interface SidebarProps {
  onGenerate: () => void;
  isGenerating: boolean;
  onOpenTemplates: () => void;
  onOpenProjects?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onGenerate,
  isGenerating,
  onOpenTemplates,
  onOpenProjects,
}) => {
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
  const validationErrors = useDiagramStore((state) => state.validationErrors);

  const { user, currentProjectId, isCloudSaved, lastCloudSaveTime, setIsCloudSaved } = useAuthStore();
  const { showToast } = useToast();

  const [isFrameworkModalOpen, setIsFrameworkModalOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('saved');
  const [shaking, setShaking] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);

  const errorCount = validationErrors.length;
  const healthPct = Math.max(0, 100 - errorCount * 15);
  const healthColor = errorCount === 0 ? 'var(--c-primary)' : errorCount <= 2 ? '#f59e0b' : '#ef4444';

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const frameworkFeatures = FRAMEWORK_FEATURES[targetFramework] || [];
  const currentFramework = AVAILABLE_FRAMEWORKS.find((fw) => fw.id === targetFramework);

  // Local Storage Auto-save
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
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => performAutoSave(), 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges, projectName, basePackage, targetFramework, enabledFeatures, performAutoSave]);

  // Cloud Auto-save to backend
  useEffect(() => {
    if (!user || !currentProjectId) return;
    setIsCloudSaved(false);
    const timer = setTimeout(async () => {
      try {
        const schema = useDiagramStore.getState().getDiagramSchema();
        await fetch(`http://localhost:8080/api/projects/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            diagramJson: JSON.stringify(schema),
            targetFramework: schema.targetFramework,
            entityCount: schema.entities?.length ?? 0,
            versionNote: 'Auto-save',
          }),
        });
        setIsCloudSaved(true);
      } catch (err) {
        console.error('Cloud auto-save failed:', err);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [nodes, edges, projectName, targetFramework, user, currentProjectId, setIsCloudSaved]);

  const handleCloudSaveClick = async () => {
    if (!user) return;
    if (currentProjectId) {
      setIsManualSaving(true);
      try {
        const schema = useDiagramStore.getState().getDiagramSchema();
        const res = await fetch(`http://localhost:8080/api/projects/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            diagramJson: JSON.stringify(schema),
            targetFramework: schema.targetFramework,
            entityCount: schema.entities?.length ?? 0,
            versionNote: 'Manual Save',
          }),
        });
        if (res.ok) {
          setIsCloudSaved(true);
          showToast('Project saved to cloud', 'success');
        } else {
          showToast('Failed to save project to cloud', 'error');
        }
      } catch (e) {
        showToast('Error saving project: ' + e, 'error');
      } finally {
        setIsManualSaving(false);
      }
    } else if (onOpenProjects) {
      onOpenProjects();
    }
  };

  const handleGenerateClick = () => {
    if (validationErrors.length > 0) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }
    onGenerate();
  };

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

  const handleImport = () => fileInputRef.current?.click();

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
    reader.onerror = () => showToast('Failed to read file', 'error');
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside className="scroll-thin flex h-full w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-surface p-4 lg:w-72">
      <div className="flex items-center gap-2 px-1">
        <Database size={20} className="text-accent" />
        <h3 className="text-lg font-semibold text-content">Project Config</h3>
      </div>

      {/* Basic config */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Project Name</label>
          <input
            type="text"
            className="input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="MyProject"
          />
        </div>

        {targetFramework === 'SPRING_BOOT' && (
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Base Package</label>
            <input
              type="text"
              className="input"
              value={basePackage}
              onChange={(e) => setBasePackage(e.target.value)}
              placeholder="com.example.project"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="field-label">Target Framework</label>

          {currentFramework && (
            <div
              className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm"
              style={{
                borderColor: currentFramework.color,
                background: `color-mix(in srgb, ${currentFramework.color} 6%, var(--c-surface))`,
              }}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-surface"
                style={{ 
                  background: currentFramework.color, 
                  '--tw-ring-color': currentFramework.color + '30' 
                } as React.CSSProperties}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold text-content">{currentFramework.displayName}</span>
                <span className="truncate text-xs text-muted">{currentFramework.description}</span>
              </div>
              <span
                className="shrink-0 rounded px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide"
                style={{
                  color: currentFramework.color,
                  background: `color-mix(in srgb, ${currentFramework.color} 15%, transparent)`,
                }}
              >
                {currentFramework.language}
              </span>
            </div>
          )}

          <button
            className="btn btn-secondary w-full justify-between"
            onClick={() => setIsFrameworkModalOpen(true)}
          >
            <span>Change Framework</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Generator features */}
        <div className="border-t border-border pt-4">
          <label className="section-label block">Generator Features</label>
          <div className="flex flex-col gap-2">
            {frameworkFeatures.map((feature) => (
              <label
                key={feature.id}
                className="group flex cursor-pointer items-start gap-2.5 rounded-md p-2 text-sm text-content transition-colors hover:bg-surface-hover"
                title={`Toggle ${feature.label}`}
              >
                <input
                  type="checkbox"
                  checked={!!enabledFeatures[feature.id]}
                  onChange={() => toggleFeature(feature.id)}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-accent"
                />
                <span className="group-hover:text-accent transition-colors">{feature.label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Canvas controls */}
      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="section-label">Canvas Controls</label>
        <button className="btn btn-secondary w-full" onClick={onOpenTemplates}>
          <LayoutTemplate size={16} /> Start from Template
        </button>
        <button className="btn btn-secondary w-full" onClick={() => addEntity('NewEntity', 100, 100)}>
          <Plus size={16} /> Add Entity Node
        </button>
      </section>

      {/* Diagram file */}
      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="section-label">Diagram File</label>
        <div className="flex gap-2">
          <button className="btn btn-secondary flex-1 !px-2.5 !text-xs" onClick={handleExport}>
            <FileDown size={14} /> Export
          </button>
          <button className="btn btn-secondary flex-1 !px-2.5 !text-xs" onClick={handleImport}>
            <Upload size={14} /> Import
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.scaffy.json"
          onChange={handleFileSelected}
          className="hidden"
        />
      </section>

      {/* Entities list */}
      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-center justify-between px-1">
          <label className="section-label mb-0">Entities</label>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
            {nodes.length}
          </span>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between px-1 text-xs">
            <span style={{ color: healthColor, fontWeight: 600 }} className="flex items-center gap-1">
              {errorCount === 0 ? <Check size={14} /> : errorCount === 1 ? <AlertTriangle size={14} /> : <X size={14} />}
              {errorCount === 0 ? 'No issues' : errorCount === 1 ? '1 issue' : `${errorCount} issues`}
            </span>
            <span className="text-muted">{healthPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${healthPct}%`,
                background: healthColor,
              }} 
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {nodes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface-2 p-4 text-center text-xs text-muted">
              No entities yet. Add one to start building.
            </div>
          ) : (
            nodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center gap-2.5 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm transition-all hover:border-accent hover:bg-surface-hover"
              >
                <Database size={14} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate font-medium text-content">{node.data.name}</span>
                <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-[0.625rem] font-medium text-muted">
                  {node.data.attributes.length}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Cloud Save & Generate */}
      <section className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
        {user ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCloudSaveClick}
              disabled={isManualSaving}
              className="btn btn-secondary w-full justify-center font-medium"
            >
              {currentProjectId ? (
                <>
                  <Save size={16} />
                  <span>{isManualSaving ? 'Saving...' : 'Save Project'}</span>
                </>
              ) : (
                <>
                  <Cloud size={16} />
                  <span>Save to Cloud</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center px-2">
              {currentProjectId ? (
                isCloudSaved ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
                    Saved{lastCloudSaveTime ? ` · ${timeAgo(lastCloudSaveTime)}` : ''}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-warning animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning"></span>
                    Unsaved changes
                  </span>
                )
              ) : (
                <span className="text-xs text-subtle">Not saved to cloud</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                showToast('Please sign in to save your project to the cloud.', 'info');
                useAuthStore.getState().setIsAuthModalOpen(true);
              }}
              className="btn btn-secondary w-full justify-center font-medium"
              title="Sign in to save project to cloud"
            >
              <Cloud size={16} />
              <span>Save to Cloud</span>
            </button>
            <div className="flex items-center justify-center px-2">
              <span className="text-xs text-subtle">Sign in to enable cloud save</span>
            </div>
          </div>
        )}

        <button
          className={`btn btn-accent w-full py-3 font-semibold shadow-md ${shaking ? 'animate-shake' : ''}`}
          onClick={handleGenerateClick}
          disabled={isGenerating || nodes.length === 0}
          title={
            validationErrors.length > 0
              ? `Fix ${validationErrors.length} validation error${validationErrors.length > 1 ? 's' : ''} before generating`
              : undefined
          }
        >
          <Download size={18} />
          {isGenerating ? 'Generating...' : 'Generate Code'}
        </button>
      </section>

      <FrameworkSelectorModal
        isOpen={isFrameworkModalOpen}
        onClose={() => setIsFrameworkModalOpen(false)}
        selectedFramework={targetFramework}
        onSelect={setTargetFramework}
      />
    </aside>
  );
};
