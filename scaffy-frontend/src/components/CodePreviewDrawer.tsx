import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useDiagramStore } from '../store/useDiagramStore';
import { Terminal, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface CodePreviewDrawerProps {
  entityName: string;
}

export const CodePreviewDrawer: React.FC<CodePreviewDrawerProps> = ({ entityName }) => {
  const getDiagramSchema = useDiagramStore((state) => state.getDiagramSchema);
  
  // Helper for computing target file paths based on framework and active tab
  const getFilePathForTab = (tab: string): string => {
    const projNameSnake = projectName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    const pkgPath = basePackage.replace(/\./g, '/');
    const entitySnake = entityName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    const entityUncap = entityName.charAt(0).toLowerCase() + entityName.slice(1);

    if (targetFramework === 'SPRING_BOOT') {
      if (tab === 'Entity') return `${projNameSnake}/src/main/java/${pkgPath}/entity/${entityName}.java`;
      if (tab === 'Request DTO') return `${projNameSnake}/src/main/java/${pkgPath}/dto/${entityName}RequestDto.java`;
      if (tab === 'Response DTO') return `${projNameSnake}/src/main/java/${pkgPath}/dto/${entityName}ResponseDto.java`;
      if (tab === 'Mapper') return `${projNameSnake}/src/main/java/${pkgPath}/mapper/${entityName}Mapper.java`;
      if (tab === 'Repository') return `${projNameSnake}/src/main/java/${pkgPath}/repository/${entityName}Repository.java`;
      if (tab === 'Service') return `${projNameSnake}/src/main/java/${pkgPath}/service/${entityName}Service.java`;
      if (tab === 'ServiceImpl') return `${projNameSnake}/src/main/java/${pkgPath}/service/impl/${entityName}ServiceImpl.java`;
      if (tab === 'Controller') return `${projNameSnake}/src/main/java/${pkgPath}/controller/${entityName}Controller.java`;
      if (tab === 'Flyway SQL') return `${projNameSnake}/src/main/resources/db/migration/V1__init.sql`;
      if (tab === 'Unit Test') return `${projNameSnake}/src/test/java/${pkgPath}/service/${entityName}ServiceImplTest.java`;
      if (tab.startsWith('Enum ')) {
        const enumClassName = tab.substring(5);
        return `${projNameSnake}/src/main/java/${pkgPath}/entity/${enumClassName}.java`;
      }
    } else if (targetFramework === 'EXPRESS') {
      if (tab === 'Prisma Schema') return `${projNameSnake}/prisma/schema.prisma`;
      if (tab === 'Service') return `${projNameSnake}/src/services/${entityUncap}Service.ts`;
      if (tab === 'Controller') return `${projNameSnake}/src/controllers/${entityUncap}Controller.ts`;
      if (tab === 'Route') return `${projNameSnake}/src/routes/${entityUncap}Route.ts`;
      if (tab === 'App Configuration') return `${projNameSnake}/src/app.ts`;
    } else if (targetFramework === 'FASTAPI') {
      if (tab === 'Model (SQLAlchemy)') return `${projNameSnake}/app/models/${entitySnake}.py`;
      if (tab === 'Schema (Pydantic)') return `${projNameSnake}/app/schemas/${entitySnake}.py`;
      if (tab === 'CRUD Helpers') return `${projNameSnake}/app/crud/${entitySnake}.py`;
      if (tab === 'Router') return `${projNameSnake}/app/routers/${entitySnake}.py`;
      if (tab === 'Main App') return `${projNameSnake}/app/main.py`;
      if (tab === 'Database Config') return `${projNameSnake}/app/database.py`;
    }

    return `${projNameSnake}/${tab}`;
  };
  const theme = useDiagramStore((state) => state.theme);
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const projectName = useDiagramStore((state) => state.projectName);
  const basePackage = useDiagramStore((state) => state.basePackage);
  const targetFramework = useDiagramStore((state) => state.targetFramework);

  const openApiSupport = useDiagramStore((state) => state.openApiSupport);
  const generateTestStubs = useDiagramStore((state) => state.generateTestStubs);
  const flywayMigration = useDiagramStore((state) => state.flywayMigration);

  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('Entity');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(true); // Minimized by default
  const [drawerHeight, setDrawerHeight] = useState<number>(400);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      // Constrain height between 150px and window height - 100px
      if (newHeight >= 150 && newHeight <= window.innerHeight - 100) {
        setDrawerHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Debounced preview API fetch
  useEffect(() => {
    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchPreview();
    }, 450); // Debounce fetch by 450ms while user edits fields

    return () => clearTimeout(delayDebounceFn);
  }, [entityName, nodes, edges, projectName, basePackage, openApiSupport, generateTestStubs, flywayMigration, targetFramework]);

  const fetchPreview = async () => {
    try {
      const schema = getDiagramSchema();
      const response = await fetch(`http://localhost:8080/api/scaffold/preview?entityName=${entityName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schema),
      });

      if (response.ok) {
        const previewMap = await response.json();
        setFiles(previewMap);
        setError(null);
        
        // Ensure activeTab is valid in the new files map, or fallback to 'Entity'
        if (previewMap && !previewMap[activeTab]) {
          const keys = Object.keys(previewMap);
          if (keys.length > 0) {
            setActiveTab(keys[0]);
          } else {
            setActiveTab('Entity');
          }
        }
      } else {
        const errMsg = await response.text();
        setError(errMsg || 'Failed to render preview');
      }
    } catch (err: any) {
      console.error(err);
      setError('Connection error. Is backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const fileKeys = Object.keys(files);
  const activeCode = files[activeTab] || '';

  return (
    <div 
      className={`preview-drawer ${isMinimized ? 'minimized' : ''}`}
      style={{
        height: isMinimized ? '48px' : `${drawerHeight}px`,
        transition: isResizing ? 'none' : undefined,
        position: 'relative'
      }}
    >
      {/* Resize Handle */}
      {!isMinimized && (
        <div 
          className="preview-drawer-resize-handle"
          onMouseDown={startResizing}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            cursor: 'ns-resize',
            zIndex: 10,
            background: isResizing ? 'var(--text-primary)' : 'transparent',
            transition: 'background 0.2s'
          }}
        />
      )}
      {/* Drawer Tabs Header */}
      <div className="preview-drawer-header">
        <div className="preview-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              padding: '4px',
              borderRadius: '4px'
            }}
            title={isMinimized ? "Maximize Preview" : "Minimize Preview"}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <Terminal size={14} style={{ color: 'var(--text-secondary)' }} />
          <span>
            Code Preview: <strong style={{ color: 'var(--text-primary)' }}>{entityName}</strong>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '4px',
              marginLeft: '8px',
              background: 
                targetFramework === 'SPRING_BOOT' 
                  ? 'rgba(74, 222, 128, 0.1)' 
                  : targetFramework === 'EXPRESS' 
                  ? 'rgba(56, 189, 248, 0.1)' 
                  : 'rgba(251, 146, 60, 0.1)',
              color: 
                targetFramework === 'SPRING_BOOT' 
                  ? '#4ade80' 
                  : targetFramework === 'EXPRESS' 
                  ? '#38bdf8' 
                  : '#fb923c',
              border: `1px solid ${
                targetFramework === 'SPRING_BOOT' 
                  ? 'rgba(74, 222, 128, 0.2)' 
                  : targetFramework === 'EXPRESS' 
                  ? 'rgba(56, 189, 248, 0.2)' 
                  : 'rgba(251, 146, 60, 0.2)'
              }`
            }}>
              {targetFramework === 'SPRING_BOOT' ? 'Spring Boot' : targetFramework === 'EXPRESS' ? 'Express' : 'FastAPI'}
            </span>
          </span>
          {isLoading && <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />}
        </div>
        
        <div className="preview-tabs">
          {fileKeys.map((key) => (
            <button
              key={key}
              className={`preview-tab-btn ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="preview-drawer-body">
        {error ? (
          <div className="preview-error-overlay">
            <AlertTriangle size={32} style={{ color: 'var(--accent-red)' }} />
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Scaffolding Error</div>
            <pre style={{ fontSize: '0.75rem', maxWidth: '80%', whiteSpace: 'pre-wrap', textAlign: 'center', opacity: 0.8 }}>
              {error}
            </pre>
          </div>
        ) : fileKeys.length === 0 ? (
          <div className="preview-loading-overlay">
            <RefreshCw size={24} className="animate-spin" style={{ opacity: 0.5 }} />
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Loading scaffold preview...</span>
          </div>
        ) : (
          <div className="preview-editor-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              background: 'rgba(0,0,0,0.15)',
              borderBottom: '1px solid var(--glass-border)',
              padding: '6px 16px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Target File:</span>
              <span style={{ color: 'var(--text-primary)' }}>{getFilePathForTab(activeTab)}</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <Editor
                height="100%"
                language={
                  activeTab === 'Flyway SQL'
                    ? 'sql'
                    : activeTab === 'Prisma Schema'
                    ? 'prisma'
                    : targetFramework === 'EXPRESS'
                    ? 'typescript'
                    : targetFramework === 'FASTAPI'
                    ? 'python'
                    : 'java'
                }
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={activeCode}
                loading={
                  <div className="preview-loading-overlay">
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Loading Editor...</span>
                  </div>
                }
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: "'Courier New', Courier, monospace",
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 },
                  scrollbar: {
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
