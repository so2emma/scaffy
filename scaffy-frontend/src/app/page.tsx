'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDiagramStore } from '../store/useDiagramStore';
import { Sidebar } from '../components/Sidebar';
import { Canvas } from '../components/Canvas';
import { ReactFlowProvider } from '@xyflow/react';
import { ImportModal } from '../components/ImportModal';
import { RelationshipPanel } from '../components/RelationshipPanel';
import { ValidationErrors, ValidationError } from '../components/ValidationErrors';
import { CodePreviewDrawer } from '../components/CodePreviewDrawer';
import { Database, Sun, Moon } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function ScaffyAppContent() {
  const getDiagramSchema = useDiagramStore((state) => state.getDiagramSchema);
  const theme = useDiagramStore((state) => state.theme);
  const toggleTheme = useDiagramStore((state) => state.toggleTheme);
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const projectName = useDiagramStore((state) => state.projectName);
  const basePackage = useDiagramStore((state) => state.basePackage);
  const targetFramework = useDiagramStore((state) => state.targetFramework);

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Compute selected entity name based on node selection in React Flow
  const selectedNode = nodes.find((n) => n.selected);
  const selectedEntityName = selectedNode ? selectedNode.data.name : null;

  // Debounced API-based validation for immediate feedback
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (nodes.length === 0) {
        setValidationErrors([]);
        return;
      }
      runValidation();
    }, 400); // Debounce check by 400ms

    return () => clearTimeout(delayDebounceFn);
  }, [nodes, edges, projectName, basePackage, targetFramework]);

  const runValidation = async (): Promise<boolean> => {
    try {
      const schema = getDiagramSchema();
      const response = await fetch('http://localhost:8080/api/scaffold/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    // Run validation one final time
    const isValid = await runValidation();
    if (!isValid && validationErrors.length > 0) {
      alert('Cannot generate scaffold. Please fix the validation errors first.');
      return;
    }

    setIsGenerating(true);
    try {
      const schema = getDiagramSchema();
      const response = await fetch('http://localhost:8080/api/scaffold/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schema),
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert('Code generation failed: ' + errorText);
        setIsGenerating(false);
        return;
      }

      // Download ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.toLowerCase()}-scaffold.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Server connection error. Ensure the Spring Boot backend is running on port 8080.');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`app-container ${theme}`}>
      {/* Header */}
      <header className="header">
        <div className="logo">
          <Database className="logo-icon" />
          <span>Scaffy</span>
          <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(120,120,120,0.1)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            v1.0
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Design ER diagrams and generate custom production-ready Spring Boot scaffolding in one click.
          </div>
          <button 
            onClick={toggleTheme} 
            className="btn btn-secondary" 
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main workspace */}
      <div className="main-content">
        {/* Left Project Sidebar */}
        <Sidebar onGenerate={handleGenerate} isGenerating={isGenerating} />

        {/* Center Canvas & Code Preview Split */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
          <ReactFlowProvider>
            <Canvas onOpenImport={() => setIsImportOpen(true)} />
          </ReactFlowProvider>
          {selectedEntityName && <CodePreviewDrawer entityName={selectedEntityName} />}
        </div>
        
        <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

        {/* Right Relationship Config Panel */}
        <RelationshipPanel />

        {/* Floating Validation Errors Card */}
        <ValidationErrors errors={validationErrors} />
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
