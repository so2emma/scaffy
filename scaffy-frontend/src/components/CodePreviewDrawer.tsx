import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useDiagramStore } from '../store/useDiagramStore';
import { useToast } from '../hooks/useToast';
import {
  Terminal, RefreshCw, AlertTriangle, ChevronDown, ChevronUp,
  ChevronRight, FileCode, FileText, Database, TestTube, Copy, Check
} from 'lucide-react';

interface CodePreviewDrawerProps {
  entityName: string;
}

// ---- File tree types ----
interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeNode[];
  tabKey?: string;
}

function buildFileTree(filePaths: { path: string; tabKey: string }[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isFolder: true, children: [] };

  for (const { path, tabKey } of filePaths) {
    const parts = path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      if (isLast) {
        current.children!.push({ name: part, path: currentPath, isFolder: false, tabKey });
      } else {
        let folder = current.children!.find((c) => c.isFolder && c.name === part);
        if (!folder) {
          folder = { name: part, path: currentPath, isFolder: true, children: [] };
          current.children!.push(folder);
        }
        current = folder;
      }
    }
  }

  return root.children || [];
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.sql')) return <Database size={13} className="ft-icon ft-icon-sql" />;
  if (lower.includes('test') || lower.includes('spec')) return <TestTube size={13} className="ft-icon ft-icon-test" />;
  if (lower.endsWith('.java') || lower.endsWith('.ts') || lower.endsWith('.py') || lower.endsWith('.prisma'))
    return <FileCode size={13} className="ft-icon ft-icon-code" />;
  return <FileText size={13} className="ft-icon ft-icon-text" />;
}

// ---- Tree Node Component ----
interface TreeItemProps {
  node: TreeNode;
  depth: number;
  activeTabKey: string;
  onSelect: (tabKey: string) => void;
  defaultExpanded?: boolean;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, depth, activeTabKey, onSelect, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (node.isFolder) {
    return (
      <>
        <div
          className="ft-row ft-folder"
          style={{ paddingLeft: `${4 + depth * 14}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight size={11} className={`ft-chevron ${expanded ? 'ft-chevron-open' : ''}`} />
          <span className="ft-folder-name">{node.name}</span>
        </div>
        {expanded && node.children && node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activeTabKey={activeTabKey}
            onSelect={onSelect}
            defaultExpanded={depth < 3}
          />
        ))}
      </>
    );
  }

  const isActive = node.tabKey === activeTabKey;

  return (
    <div
      className={`ft-row ft-file ${isActive ? 'ft-file-active' : ''}`}
      style={{ paddingLeft: `${4 + depth * 14}px` }}
      onClick={() => node.tabKey && onSelect(node.tabKey)}
    >
      {getFileIcon(node.name)}
      <span className="ft-file-name">{node.name}</span>
    </div>
  );
};

// ---- Main Component ----
export const CodePreviewDrawer: React.FC<CodePreviewDrawerProps> = ({ entityName }) => {
  const getDiagramSchema = useDiagramStore((state) => state.getDiagramSchema);
  const theme = useDiagramStore((state) => state.theme);
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const projectName = useDiagramStore((state) => state.projectName);
  const basePackage = useDiagramStore((state) => state.basePackage);
  const targetFramework = useDiagramStore((state) => state.targetFramework);

  const openApiSupport = useDiagramStore((state) => state.enabledFeatures['openApi']);
  const generateTestStubs = useDiagramStore((state) => state.enabledFeatures['mockitoTests']);
  const flywayMigration = useDiagramStore((state) => state.enabledFeatures['flywayMigration']);

  const { showToast } = useToast();

  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('Entity');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [drawerHeight, setDrawerHeight] = useState<number>(420);
  const [isResizingV, setIsResizingV] = useState<boolean>(false);
  const [treePanelWidth, setTreePanelWidth] = useState<number>(240);
  const [isResizingH, setIsResizingH] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  const getFilePathForTab = useCallback((tab: string): string => {
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
    } else if (targetFramework === 'NESTJS') {
      const entityKebab = entityName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      if (tab === 'Entity') return `${projNameSnake}/src/${entityKebab}/entities/${entityKebab}.entity.ts`;
      if (tab === 'Create DTO') return `${projNameSnake}/src/${entityKebab}/dto/create-${entityKebab}.dto.ts`;
      if (tab === 'Update DTO') return `${projNameSnake}/src/${entityKebab}/dto/update-${entityKebab}.dto.ts`;
      if (tab === 'Service') return `${projNameSnake}/src/${entityKebab}/${entityKebab}.service.ts`;
      if (tab === 'Controller') return `${projNameSnake}/src/${entityKebab}/${entityKebab}.controller.ts`;
      if (tab === 'Module') return `${projNameSnake}/src/${entityKebab}/${entityKebab}.module.ts`;
      if (tab === 'App Module') return `${projNameSnake}/src/app.module.ts`;
      if (tab === 'Unit Test') return `${projNameSnake}/src/${entityKebab}/${entityKebab}.service.spec.ts`;
    } else if (targetFramework === 'DJANGO_REST') {
      if (tab === 'Models') return `${projNameSnake}/api/models.py`;
      if (tab === 'Serializers') return `${projNameSnake}/api/serializers.py`;
      if (tab === 'Views') return `${projNameSnake}/api/views.py`;
      if (tab === 'URLs') return `${projNameSnake}/api/urls.py`;
      if (tab === 'Admin') return `${projNameSnake}/api/admin.py`;
      if (tab === 'Settings') return `${projNameSnake}/${projNameSnake}/settings.py`;
      if (tab === 'Tests') return `${projNameSnake}/api/tests.py`;
    }

    return `${projNameSnake}/${tab}`;
  }, [projectName, basePackage, entityName, targetFramework]);

  const fileTree = useMemo(() => {
    const fileKeys = Object.keys(files);
    if (fileKeys.length === 0) return [];
    const paths = fileKeys.map((key) => ({ path: getFilePathForTab(key), tabKey: key }));
    return buildFileTree(paths);
  }, [files, getFilePathForTab]);

  // Vertical resize (drawer height)
  useEffect(() => {
    if (!isResizingV) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 200 && newHeight <= window.innerHeight - 100) {
        setDrawerHeight(newHeight);
      }
    };
    const handleMouseUp = () => setIsResizingV(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingV]);

  // Horizontal resize (tree panel width)
  useEffect(() => {
    if (!isResizingH) return;
    const handleMouseMove = (e: MouseEvent) => {
      const drawer = document.querySelector('.code-preview__body');
      if (!drawer) return;
      const rect = drawer.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      if (newWidth >= 150 && newWidth <= 400) {
        setTreePanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizingH(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingH]);

  // Debounced preview API fetch
  useEffect(() => {
    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchPreview();
    }, 450);
    return () => clearTimeout(delayDebounceFn);
  }, [entityName, nodes, edges, projectName, basePackage, openApiSupport, generateTestStubs, flywayMigration, targetFramework]);

  const fetchPreview = async () => {
    try {
      const schema = getDiagramSchema();
      const response = await fetch(`http://localhost:8080/api/scaffold/preview?entityName=${entityName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schema),
      });

      if (response.ok) {
        const previewMap = await response.json();
        setFiles(previewMap);
        setError(null);

        if (previewMap && !previewMap[activeTab]) {
          const keys = Object.keys(previewMap);
          if (keys.length > 0) setActiveTab(keys[0]);
          else setActiveTab('Entity');
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

  const handleCopy = async () => {
    const code = files[activeTab] || '';
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const fileKeys = Object.keys(files);
  const activeCode = files[activeTab] || '';
  const activeFilePath = getFilePathForTab(activeTab);

  const getEditorLanguage = () => {
    if (activeTab === 'Flyway SQL') return 'sql';
    if (activeTab === 'Prisma Schema') return 'prisma';
    if (targetFramework === 'EXPRESS') return 'typescript';
    if (targetFramework === 'NESTJS') return 'typescript';
    if (targetFramework === 'FASTAPI') return 'python';
    if (targetFramework === 'DJANGO_REST') return 'python';
    return 'java';
  };

  // Extract just the filename from the path for the tab display
  const activeFileName = activeFilePath.split('/').pop() || activeTab;

  return (
    <div
      className={`code-preview ${isMinimized ? 'code-preview--minimized' : ''}`}
      style={{
        height: isMinimized ? '40px' : `${drawerHeight}px`,
        transition: isResizingV || isResizingH ? 'none' : 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Vertical Resize Handle */}
      {!isMinimized && (
        <div
          className="code-preview__resize-v"
          onMouseDown={(e) => { e.preventDefault(); setIsResizingV(true); }}
        />
      )}

      {/* Title Bar (always visible) */}
      <div className="code-preview__titlebar">
        <div className="code-preview__titlebar-left">
          <button
            className="code-preview__toggle"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Preview' : 'Collapse Preview'}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <Terminal size={13} />
          <span className="code-preview__title">
            Preview — <strong>{entityName}</strong>
          </span>
          <span className={`code-preview__badge code-preview__badge--${targetFramework.toLowerCase()}`}>
            {targetFramework === 'SPRING_BOOT' ? 'Spring Boot' : targetFramework === 'EXPRESS' ? 'Express' : targetFramework === 'NESTJS' ? 'NestJS' : targetFramework === 'DJANGO_REST' ? 'Django REST' : 'FastAPI'}
          </span>
          {isLoading && <RefreshCw size={11} className="animate-spin" />}
        </div>
      </div>

      {/* Main Body */}
      {!isMinimized && (
        <div className="code-preview__body">
          {error ? (
            <div className="code-preview__overlay">
              <AlertTriangle size={28} style={{ color: 'var(--accent-red)' }} />
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Scaffolding Error</div>
              <pre className="code-preview__error-msg">{error}</pre>
            </div>
          ) : fileKeys.length === 0 ? (
            <div className="code-preview__overlay">
              <RefreshCw size={22} className="animate-spin" style={{ opacity: 0.5 }} />
              <span>Loading scaffold preview...</span>
            </div>
          ) : (
            <>
              {/* File Tree Sidebar */}
              <div className="code-preview__tree" style={{ width: `${treePanelWidth}px` }}>
                <div className="code-preview__tree-header">EXPLORER</div>
                <div className="code-preview__tree-scroll">
                  {fileTree.map((node) => (
                    <TreeItem
                      key={node.path}
                      node={node}
                      depth={0}
                      activeTabKey={activeTab}
                      onSelect={setActiveTab}
                      defaultExpanded={true}
                    />
                  ))}
                </div>
              </div>

              {/* Resize Handle */}
              <div
                className={`code-preview__resize-h ${isResizingH ? 'code-preview__resize-h--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); setIsResizingH(true); }}
              />

              {/* Editor Area */}
              <div className="code-preview__editor-area">
                {/* Tab bar */}
                <div className="code-preview__tabs">
                  <div className="code-preview__tab code-preview__tab--active">
                    {getFileIcon(activeFileName)}
                    <span>{activeFileName}</span>
                  </div>
                  <div className="code-preview__tabs-spacer" />
                  <button
                    className={`code-preview__copy ${copied ? 'code-preview__copy--done' : ''}`}
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Breadcrumb */}
                <div className="code-preview__breadcrumb">
                  {activeFilePath.split('/').map((seg, i, arr) => (
                    <React.Fragment key={i}>
                      <span className={i === arr.length - 1 ? 'code-preview__breadcrumb-active' : ''}>{seg}</span>
                      {i < arr.length - 1 && <ChevronRight size={10} className="code-preview__breadcrumb-sep" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Monaco */}
                <div className="code-preview__monaco">
                  <Editor
                    height="100%"
                    language={getEditorLanguage()}
                    theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                    value={activeCode}
                    loading={
                      <div className="code-preview__overlay">
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Loading editor...</span>
                      </div>
                    }
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineHeight: 20,
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
                      fontLigatures: true,
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                      padding: { top: 8, bottom: 8 },
                      lineNumbers: 'on',
                      renderLineHighlight: 'line',
                      guides: { indentation: true },
                      scrollbar: {
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                        verticalSliderSize: 6,
                      },
                      overviewRulerLanes: 0,
                      hideCursorInOverviewRuler: true,
                      overviewRulerBorder: false,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
