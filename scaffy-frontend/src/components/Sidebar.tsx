import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { useAuthStore } from '../store/useAuthStore';
import { FRAMEWORK_FEATURES } from '../constants/frameworkFeatures';
import { AVAILABLE_FRAMEWORKS, FrameworkSelectorModal } from './FrameworkSelectorModal';
import { useToast } from '../hooks/useToast';
import { Plus, Download, Upload, FileDown, Database, ChevronRight, LayoutTemplate, Save, Cloud } from 'lucide-react';
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
  const healthLabel = errorCount === 0 ? '✓ No issues' : errorCount === 1 ? '⚠ 1 issue' : `✗ ${errorCount} issues`;

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
    <aside className="scroll-thin flex h-full w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-5 lg:w-72">
      <h3 className="font-display text-base font-semibold">Project Config</h3>

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
              className="flex items-center gap-2.5 rounded-xl border p-3"
              style={{
                borderColor: currentFramework.color,
                background: `color-mix(in srgb, ${currentFramework.color} 8%, transparent)`,
              }}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: currentFramework.color }}
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{currentFramework.displayName}</span>
                <span className="truncate text-xs text-muted">{currentFramework.description}</span>
              </div>
              <span
                className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider"
                style={{
                  color: currentFramework.color,
                  background: `color-mix(in srgb, ${currentFramework.color} 14%, transparent)`,
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
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Generator features */}
        <div className="border-t border-border pt-4">
          <label className="section-label mb-2 block">Generator Features</label>
          <div className="flex flex-col gap-2.5">
            {frameworkFeatures.map((feature) => (
              <label
                key={feature.id}
                className="flex cursor-pointer items-start gap-2 text-sm text-content"
                title={`Toggle ${feature.label}`}
              >
                <input
                  type="checkbox"
                  checked={!!enabledFeatures[feature.id]}
                  onChange={() => toggleFeature(feature.id)}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                />
                <span>{feature.label}</span>
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
      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <label className="section-label">Entities ({nodes.length})</label>

        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4 }}>
            <span style={{ color: healthColor, fontWeight: 600 }}>{healthLabel}</span>
          </div>
          <div style={{ height: 4, borderRadius: 9999, background: 'var(--c-surface-3)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${healthPct}%`,
              borderRadius: 9999,
              background: healthColor,
              transition: 'width 0.4s ease, background 0.4s ease'
            }} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {nodes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">
              No entities. Add one to start.
            </div>
          ) : (
            nodes.map((node) => (
              <div
                key={node.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm"
              >
                <Database size={12} className="text-primary" />
                <span className="truncate">{node.data.name}</span>
                <span className="ml-auto shrink-0 text-[0.65rem] text-muted">
                  ({node.data.attributes.length} attrs)
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Cloud Save & Generate */}
      <section className="mt-auto border-t border-border pt-3">
        {user && (
          <div className="mb-3 flex flex-col gap-1.5">
            <button
              onClick={handleCloudSaveClick}
              disabled={isManualSaving}
              className="btn btn-secondary w-full justify-center !py-2 !text-xs font-semibold"
            >
              {currentProjectId ? (
                <>
                  <Save size={14} className="text-primary" />
                  <span>{isManualSaving ? 'Saving...' : '💾 Save'}</span>
                </>
              ) : (
                <>
                  <Cloud size={14} className="text-primary" />
                  <span>☁ Save to Cloud</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center">
              {currentProjectId ? (
                isCloudSaved ? (
                  <span className="text-[0.7rem] font-medium text-green-400">
                    ☁ Saved{lastCloudSaveTime ? ` · ${timeAgo(lastCloudSaveTime)}` : ''}
                  </span>
                ) : (
                  <span className="animate-pulse text-[0.7rem] font-medium text-amber-400">
                    ☁ Unsaved changes
                  </span>
                )
              ) : (
                <span className="text-[0.7rem] text-subtle">☁ Not saved to cloud</span>
              )}
            </div>
          </div>
        )}

        <button
          className={`btn btn-primary w-full py-3 ${shaking ? 'animate-shake' : ''}`}
          onClick={handleGenerateClick}
          disabled={isGenerating || nodes.length === 0}
          title={
            validationErrors.length > 0
              ? `Fix ${validationErrors.length} validation error${validationErrors.length > 1 ? 's' : ''} before generating`
              : undefined
          }
        >
          <Download size={18} />
          {isGenerating ? 'Generating...' : 'Generate Backend Scaffold'}
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
