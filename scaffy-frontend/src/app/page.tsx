'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDiagramStore } from '../store/useDiagramStore';
import { useAuthStore } from '../store/useAuthStore';
import { Sidebar } from '../components/Sidebar';
import { Canvas } from '../components/Canvas';
import { ReactFlowProvider } from '@xyflow/react';
import { ImportModal } from '../components/ImportModal';
import { RelationshipPanel } from '../components/RelationshipPanel';
import { ValidationErrors } from '../components/ValidationErrors';
import { CodePreviewDrawer } from '../components/CodePreviewDrawer';
import { TemplateGalleryModal } from '../components/TemplateGalleryModal';
import { AuthModal } from '../components/AuthModal';
import { UserMenu } from '../components/UserMenu';
import { ProjectsPanel } from '../components/ProjectsPanel';
import { UserTemplatesPanel } from '../components/UserTemplatesPanel';
import { AVAILABLE_FRAMEWORKS } from '../components/FrameworkSelectorModal';
import { useToast } from '../hooks/useToast';
import { Database, Sun, Moon, LogIn, Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function frameworkLabel(id: string): string {
  return AVAILABLE_FRAMEWORKS.find((fw) => fw.id === id)?.displayName ?? id;
}

function ScaffyAppContent() {
  const getDiagramSchema = useDiagramStore((state) => state.getDiagramSchema);
  const theme = useDiagramStore((state) => state.theme);
  const toggleTheme = useDiagramStore((state) => state.toggleTheme);
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const projectName = useDiagramStore((state) => state.projectName);
  const basePackage = useDiagramStore((state) => state.basePackage);
  const targetFramework = useDiagramStore((state) => state.targetFramework);

  const { user, isLoading: authLoading } = useAuthStore();
  const { showToast } = useToast();

  const validationErrors = useDiagramStore((state) => state.validationErrors);
  const setValidationErrors = useDiagramStore((state) => state.setValidationErrors);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);

  // Auth & Cloud Panels state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProjectsPanelOpen, setIsProjectsPanelOpen] = useState(false);
  const [isUserTemplatesPanelOpen, setIsUserTemplatesPanelOpen] = useState(false);

  useEffect(() => {
    useAuthStore.getState().checkAuth();
  }, []);

  const selectedNode = nodes.find((n) => n.selected);
  const selectedEntityName = selectedNode ? selectedNode.data.name : null;

  const framework = AVAILABLE_FRAMEWORKS.find((fw) => fw.id === targetFramework);
  const frameworkColor = framework?.color ?? '#16a34a';

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (nodes.length === 0) {
        setValidationErrors([]);
        return;
      }
      runValidation();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, projectName, basePackage, targetFramework]);

  const runValidation = async (): Promise<boolean> => {
    try {
      const schema = getDiagramSchema();
      const response = await fetch('http://localhost:8080/api/scaffold/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schema),
      });
      if (response.ok) {
        const errors = await response.json();
        setValidationErrors(errors);
        return errors.length === 0;
      }
    } catch (e) {
      console.error('Validation service unreachable', e);
    }
    return false;
  };

  const handleGenerate = async () => {
    const isValid = await runValidation();
    if (!isValid && validationErrors.length > 0) {
      showToast('Cannot generate scaffold. Please fix the validation errors first.', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const schema = getDiagramSchema();
      const response = await fetch('http://localhost:8080/api/scaffold/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schema),
      });

      if (!response.ok) {
        const errorText = await response.text();
        showToast('Code generation failed: ' + errorText, 'error');
        setIsGenerating(false);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.toLowerCase()}-scaffold.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Scaffold generated and downloaded successfully!', 'success');
    } catch (e) {
      showToast('Server connection error. Ensure the backend is running on port 8080.', 'error');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} flex h-screen w-screen flex-col bg-canvas text-content`}>
      {/* Header */}
      <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Database size={20} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Scaffy</span>
          <span className="hidden rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[0.65rem] text-muted sm:inline">
            v1.0
          </span>
          <span
            className="ml-1 hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium md:inline-flex"
            style={{
              background: `color-mix(in srgb, ${frameworkColor} 12%, transparent)`,
              color: frameworkColor,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: frameworkColor }} />
            {frameworkLabel(targetFramework)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden max-w-md text-sm text-muted lg:block">
            Design ER diagrams and generate custom production-ready{' '}
            <strong className="font-semibold text-content">{frameworkLabel(targetFramework)}</strong> scaffolding in one click.
          </p>

          <button
            onClick={toggleTheme}
            className="btn btn-secondary h-9 w-9 !p-0"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* User Auth Menu or Sign In */}
          {authLoading ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : user ? (
            <UserMenu
              onOpenProjects={() => setIsProjectsPanelOpen(true)}
              onOpenTemplates={() => setIsUserTemplatesPanelOpen(true)}
            />
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="btn btn-primary !py-1.5 !px-3.5 !text-xs font-semibold"
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main workspace */}
      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          onOpenTemplates={() => setIsTemplateGalleryOpen(true)}
          onOpenProjects={() => setIsProjectsPanelOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <ReactFlowProvider>
            <Canvas
              onOpenImport={() => setIsImportOpen(true)}
              onOpenTemplates={() => setIsTemplateGalleryOpen(true)}
            />
          </ReactFlowProvider>
          <CodePreviewDrawer selectedEntityName={selectedEntityName} />
        </div>

        <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
        <TemplateGalleryModal
          isOpen={isTemplateGalleryOpen}
          onClose={() => setIsTemplateGalleryOpen(false)}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        <ProjectsPanel
          isOpen={isProjectsPanelOpen}
          onClose={() => setIsProjectsPanelOpen(false)}
        />

        <UserTemplatesPanel
          isOpen={isUserTemplatesPanelOpen}
          onClose={() => setIsUserTemplatesPanelOpen(false)}
        />

        <RelationshipPanel />

        <ValidationErrors
          errors={validationErrors}
          onErrorClick={(entityName) => {
            const store = useDiagramStore.getState();
            store.onNodesChange(
              store.nodes.map(n => ({
                type: 'select',
                id: n.id,
                selected: n.data.name === entityName
              }))
            );
          }}
        />
      </div>
    </div>
  );
}

export default function ScaffyApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ScaffyAppContent />
    </QueryClientProvider>
  );
}
