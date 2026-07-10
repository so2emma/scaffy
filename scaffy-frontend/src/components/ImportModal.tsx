import React, { useState } from 'react';
import { X, Upload, Database, FolderOpen, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDiagramStore } from '../store/useDiagramStore';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const importDiagram = useDiagramStore((state) => state.importDiagram);
  const [activeTab, setActiveTab] = useState<'ddl' | 'springboot'>('ddl');
  
  // DDL states
  const [ddlText, setDdlText] = useState('');
  
  // Spring Boot states
  const [projectPath, setProjectPath] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
        headers: {
          'Content-Type': 'text/plain',
        },
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
        headers: {
          'Content-Type': 'application/json',
        },
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
    reader.onload = (event) => {
      setDdlText(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        style={{
          width: '540px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          boxShadow: 'var(--glass-glow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Upload size={18} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Reverse Engineer / Import
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div 
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--glass-border)',
            background: 'rgba(120, 120, 120, 0.02)'
          }}
        >
          <button
            onClick={() => { setActiveTab('ddl'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ddl' ? '2px solid var(--text-primary)' : '2px solid transparent',
              color: activeTab === 'ddl' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontWeight: activeTab === 'ddl' ? 600 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Database size={14} />
            SQL DDL Schema
          </button>
          <button
            onClick={() => { setActiveTab('springboot'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'springboot' ? '2px solid var(--text-primary)' : '2px solid transparent',
              color: activeTab === 'springboot' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontWeight: activeTab === 'springboot' ? 600 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <FolderOpen size={14} />
            Spring Boot Repository
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {errorMsg && (
            <div 
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--accent-red)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '0.75rem',
                color: 'var(--accent-red)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {activeTab === 'ddl' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Paste SQL table declarations below or load a `.sql` file:
                </span>
                <label 
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-primary)',
                    background: 'rgba(120, 120, 120, 0.08)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Upload size={12} />
                  Choose File
                  <input type="file" accept=".sql" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>

              <textarea
                value={ddlText}
                onChange={(e) => setDdlText(e.target.value)}
                placeholder="CREATE TABLE users (&#10;    id BIGINT PRIMARY KEY,&#10;    email VARCHAR(255) NOT NULL UNIQUE&#10;);"
                style={{
                  height: '180px',
                  background: 'rgba(120,120,120,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: '10px',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Provide the absolute path to an existing Spring Boot Maven project folder. The scanner will look for all Java Entity classes and reconstruct the layout:
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Local Project Directory Path
                </label>
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/Users/username/IdeaProjects/my-spring-app"
                  className="text-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--glass-border)',
            background: 'rgba(120, 120, 120, 0.02)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Cancel
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={activeTab === 'ddl' ? handleDdlImport : handleSpringBootImport}
            disabled={isLoading}
            style={{ padding: '6px 16px', fontSize: '0.8rem', minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isLoading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              'Import Schema'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
