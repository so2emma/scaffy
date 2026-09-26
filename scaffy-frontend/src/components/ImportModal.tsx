import React, { useState, useEffect } from 'react';
import { X, Upload, Database, FolderOpen, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDiagramStore } from '../store/useDiagramStore';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const importDiagram = useDiagramStore((state) => state.importDiagram);
  const [activeTab, setActiveTab] = useState<'ddl' | 'springboot'>('ddl');

  const [ddlText, setDdlText] = useState('');
  const [projectPath, setProjectPath] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
      setErrorMsg(null);
    } else {
      setAnimating(false);
      const timer = setTimeout(() => {
        setVisible(false);
        setDdlText('');
        setProjectPath('');
        setErrorMsg(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible) return null;

  const handleDdlImport = async () => {
    if (!ddlText.trim()) {
      setErrorMsg('Please paste SQL DDL statements first.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('http://localhost:8080/api/scaffold/reverse-engineer/ddl', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: ddlText,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to parse DDL script.');
      }
      const schema = await response.json();
      importDiagram(schema);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'An error occurred during DDL parsing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpringBootImport = async () => {
    if (!projectPath.trim()) {
      setErrorMsg('Please specify an absolute Spring Boot folder path.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('http://localhost:8080/api/scaffold/reverse-engineer/spring-boot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to scan Spring Boot directory.');
      }
      const schema = await response.json();
      importDiagram(schema);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'An error occurred during project scanning.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setDdlText((event.target?.result as string) || '');
    reader.readAsText(file);
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${
        animating ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`card card-hover flex w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ${
        animating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Upload size={18} className="text-accent transition-transform duration-300 hover:scale-110" />
            <span className="font-display text-lg font-semibold">
              Reverse Engineer / <span className="text-accent">Import</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-all duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface-2">
          <button
            onClick={() => {
              setActiveTab('ddl');
              setErrorMsg(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm transition-all duration-200 ${
              activeTab === 'ddl'
                ? 'border-accent font-semibold text-content'
                : 'border-transparent font-medium text-muted hover:text-content'
            }`}
          >
            <Database size={14} />
            SQL DDL Schema
          </button>
          <button
            onClick={() => {
              setActiveTab('springboot');
              setErrorMsg(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm transition-all duration-200 ${
              activeTab === 'springboot'
                ? 'border-accent font-semibold text-content'
                : 'border-transparent font-medium text-muted hover:text-content'
            }`}
          >
            <FolderOpen size={14} />
            Spring Boot Repository
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-6">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs text-danger transition-all duration-200">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div>{errorMsg}</div>
            </div>
          )}

          {activeTab === 'ddl' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted">
                  Paste SQL table declarations below or load a `.sql` file:
                </span>
                <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-content transition-all duration-200 hover:border-accent hover:bg-accent/10 hover:text-accent">
                  <Upload size={12} />
                  Choose File
                  <input type="file" accept=".sql" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <textarea
                value={ddlText}
                onChange={(e) => setDdlText(e.target.value)}
                placeholder={
                  'CREATE TABLE users (\n    id BIGINT PRIMARY KEY,\n    email VARCHAR(255) NOT NULL UNIQUE\n);'
                }
                className="scroll-thin h-44 resize-none rounded-lg border border-border bg-surface-2 p-2.5 font-mono text-xs text-content outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <span className="text-sm text-muted">
                Provide the absolute path to an existing Spring Boot Maven project folder. The scanner will
                look for all Java Entity classes and reconstruct the layout:
              </span>

              <div className="flex flex-col gap-1.5">
                <label className="field-label">Local Project Directory Path</label>
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/Users/username/IdeaProjects/my-spring-app"
                  className="input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border bg-surface-2 px-5 py-3.5">
          <button className="btn btn-secondary !px-3 !text-sm transition-all duration-200" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn btn-accent min-w-[6.25rem] !px-4 !text-sm transition-all duration-200 hover:scale-[1.02]"
            onClick={activeTab === 'ddl' ? handleDdlImport : handleSpringBootImport}
            disabled={isLoading}
          >
            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Import Schema'}
          </button>
        </div>
      </div>
    </div>
  );
};
