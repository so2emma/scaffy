import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useDiagramStore } from '../store/useDiagramStore';
import { useToast } from '../hooks/useToast';
import {
  Terminal, RefreshCw, AlertTriangle, ChevronDown, ChevronUp,
  ChevronRight, FileCode, FileText, Database, TestTube, Copy, Check,
} from 'lucide-react';

interface CodePreviewDrawerProps {
  entityName: string;
}

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
  if (lower.endsWith('.sql')) return <Database size={13} className="shrink-0 text-amber-500" />;
  if (lower.includes('test') || lower.includes('spec'))
    return <TestTube size={13} className="shrink-0 text-primary" />;
  if (lower.endsWith('.java') || lower.endsWith('.ts') || lower.endsWith('.py') || lower.endsWith('.prisma'))
    return <FileCode size={13} className="shrink-0 text-sky-500" />;
  return <FileText size={13} className="shrink-0 text-subtle" />;
}

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
          className="flex h-6 cursor-pointer items-center gap-1 whitespace-nowrap pr-2 text-[0.73rem] font-medium text-muted transition-colors hover:bg-surface-2"
          style={{ paddingLeft: `${4 + depth * 14}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight
            size={11}
            className={`shrink-0 text-subtle transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <span className="overflow-hidden text-ellipsis">{node.name}</span>
        </div>
        {expanded &&
          node.children &&
          node.children.map((child) => (
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
      className={`flex h-6 cursor-pointer items-center gap-1 whitespace-nowrap pr-2 text-[0.73rem] transition-colors ${
        isActive ? 'bg-surface-3 text-content' : 'text-muted hover:bg-surface-2'
      }`}
      style={{ paddingLeft: `${4 + depth * 14}px` }}
      onClick={() => node.tabKey && onSelect(node.tabKey)}
    >
      {getFileIcon(node.name)}
      <span className="overflow-hidden text-ellipsis">{node.name}</span>
    </div>
  );
};

const BADGE_STYLES: Record<string, string> = {
  spring_boot: 'text-primary bg-primary/10',
  express: 'text-sky-500 bg-sky-500/10',
  fastapi: 'text-orange-400 bg-orange-400/10',
  nestjs: 'text-fuchsia-400 bg-fuchsia-400/10',
  django_rest: 'text-amber-500 bg-amber-500/10',
  laravel: 'text-rose-400 bg-rose-400/10',
};

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

  const getFilePathForTab = useCallback(
    (tab: string): string => {
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
      } else if (targetFramework === 'LARAVEL') {
        const entitySnake = entityName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
        if (tab === 'Model') return `${projNameSnake}/app/Models/${entityName}.php`;
        if (tab === 'Controller') return `${projNameSnake}/app/Http/Controllers/Api/${entityName}Controller.php`;
        if (tab === 'Store Request') return `${projNameSnake}/app/Http/Requests/Store${entityName}Request.php`;
        if (tab === 'Update Request') return `${projNameSnake}/app/Http/Requests/Update${entityName}Request.php`;
        if (tab === 'API Resource') return `${projNameSnake}/app/Http/Resources/${entityName}Resource.php`;
        if (tab === 'Migration') return `${projNameSnake}/database/migrations/2024_01_01_000001_create_${entitySnake}s_table.php`;
        if (tab === 'Routes') return `${projNameSnake}/routes/api.php`;
        if (tab === 'Feature Test') return `${projNameSnake}/tests/Feature/${entityName}Test.php`;
      }

      return `${projNameSnake}/${tab}`;
    },
    [projectName, basePackage, entityName, targetFramework]
  );

  const fileTree = useMemo(() => {
    const fileKeys = Object.keys(files);
    if (fileKeys.length === 0) return [];
    const paths = fileKeys.map((key) => ({ path: getFilePathForTab(key), tabKey: key }));
    return buildFileTree(paths);
  }, [files, getFilePathForTab]);

  useEffect(() => {
    if (!isResizingV) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 200 && newHeight <= window.innerHeight - 100) setDrawerHeight(newHeight);
    };
    const handleMouseUp = () => setIsResizingV(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingV]);

  useEffect(() => {
    if (!isResizingH) return;
    const handleMouseMove = (e: MouseEvent) => {
      const drawer = document.querySelector('[data-code-preview-body]');
      if (!drawer) return;
      const rect = drawer.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      if (newWidth >= 150 && newWidth <= 400) setTreePanelWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizingH(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingH]);

  useEffect(() => {
    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchPreview();
    }, 450);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (targetFramework === 'LARAVEL') return 'php';
    return 'java';
  };

  const activeFileName = activeFilePath.split('/').pop() || activeTab;
  const badgeClass = BADGE_STYLES[targetFramework.toLowerCase()] || 'text-muted bg-surface-2';

  const frameworkLabel =
    targetFramework === 'SPRING_BOOT'
      ? 'Spring Boot'
      : targetFramework === 'EXPRESS'
      ? 'Express'
      : targetFramework === 'NESTJS'
      ? 'NestJS'
      : targetFramework === 'DJANGO_REST'
      ? 'Django REST'
      : targetFramework === 'FASTAPI'
      ? 'FastAPI'
      : 'Laravel';

  return (
    <div
      className="relative z-[6] flex shrink-0 flex-col overflow-hidden border-t border-border bg-surface"
      style={{
        height: isMinimized ? '40px' : `${drawerHeight}px`,
        transition: isResizingV || isResizingH ? 'none' : 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Vertical Resize Handle */}
      {!isMinimized && (
        <div
          className="absolute inset-x-0 top-0 z-10 h-1 cursor-ns-resize transition-colors hover:bg-primary/40"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizingV(true);
          }}
        />
      )}

      {/* Title Bar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <button
          className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-content"
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? 'Expand Preview' : 'Collapse Preview'}
        >
          {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <Terminal size={13} className="text-muted" />
        <span className="text-[0.78rem] text-muted">
          Preview — <strong className="font-semibold text-content">{entityName}</strong>
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${badgeClass}`}
        >
          {frameworkLabel}
        </span>
        {isLoading && <RefreshCw size={11} className="animate-spin text-muted" />}
      </div>

      {/* Body */}
      {!isMinimized && (
        <div className="flex min-h-0 flex-1 flex-row overflow-hidden" data-code-preview-body>
          {error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-sm text-muted">
              <AlertTriangle size={28} className="text-danger" />
              <div className="text-sm font-semibold text-content">Scaffolding Error</div>
              <pre className="max-w-[80%] whitespace-pre-wrap text-center text-xs opacity-70">{error}</pre>
            </div>
          ) : fileKeys.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-sm text-muted">
              <RefreshCw size={22} className="animate-spin opacity-50" />
              <span>Loading scaffold preview...</span>
            </div>
          ) : (
            <>
              {/* File Tree */}
              <div
                className="scroll-thin flex h-full shrink-0 flex-col border-r border-border bg-surface-2"
                style={{ width: `${treePanelWidth}px`, minWidth: 150, maxWidth: 400 }}
              >
                <div className="shrink-0 border-b border-border px-3.5 py-2 text-[0.65rem] font-bold tracking-widest text-subtle">
                  EXPLORER
                </div>
                <div className="scroll-thin flex-1 overflow-y-auto overflow-x-hidden py-1">
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
                className={`w-[3px] shrink-0 cursor-col-resize transition-colors hover:bg-primary/40 ${
                  isResizingH ? 'bg-primary/50' : 'bg-transparent'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizingH(true);
                }}
              />

              {/* Editor Area */}
              <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                {/* Tab bar */}
                <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border bg-surface-2 px-2">
                  <div className="flex h-full items-center gap-1.5 border-b-2 border-primary px-3 text-[0.72rem] font-medium text-content">
                    {getFileIcon(activeFileName)}
                    <span>{activeFileName}</span>
                  </div>
                  <div className="flex-1" />
                  <button
                    className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[0.65rem] font-medium transition-colors ${
                      copied
                        ? 'border-primary/40 text-primary'
                        : 'border-border text-subtle hover:border-border-strong hover:text-content'
                    }`}
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Breadcrumb */}
                <div className="scroll-thin flex shrink-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap border-b border-border bg-surface-2/50 px-3.5 py-1 font-mono text-[0.68rem] text-subtle">
                  {activeFilePath.split('/').map((seg, i, arr) => (
                    <React.Fragment key={i}>
                      <span className={i === arr.length - 1 ? 'font-medium text-content' : ''}>{seg}</span>
                      {i < arr.length - 1 && (
                        <ChevronRight size={10} className="shrink-0 opacity-50" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Monaco */}
                <div className="relative min-h-0 flex-1">
                  <Editor
                    height="100%"
                    language={getEditorLanguage()}
                    theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                    value={activeCode}
                    loading={
                      <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted">
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
