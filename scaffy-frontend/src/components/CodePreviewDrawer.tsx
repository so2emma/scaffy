import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useDiagramStore } from '../store/useDiagramStore';
import { useToast } from '../hooks/useToast';
import {
  Terminal, RefreshCw, AlertTriangle, ChevronDown, ChevronUp,
  ChevronRight, FileCode, FileText, Database, TestTube, Copy, Check, Box,
  Search, GitCompare, Download, SlidersHorizontal, Layers, X, FileArchive,
} from 'lucide-react';

interface CodePreviewDrawerProps {
  selectedEntityName: string | null;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeNode[];
  tabKey?: string;
}

interface SearchResult {
  filePath: string;
  fileName: string;
  lineNumber: number;
  lineContent: string;
  matchIndex: number;
  matchLength: number;
}

interface VariableItem {
  key: string;
  label: string;
  currentValue: string;
}

const BADGE_STYLES: Record<string, string> = {
  spring_boot: 'text-primary bg-primary/10',
  express: 'text-sky-500 bg-sky-500/10',
  fastapi: 'text-orange-400 bg-orange-400/10',
  nestjs: 'text-fuchsia-400 bg-fuchsia-400/10',
  django_rest: 'text-amber-500 bg-amber-500/10',
  laravel: 'text-rose-400 bg-rose-400/10',
  gin: 'text-emerald-400 bg-emerald-400/10',
  rails: 'text-red-400 bg-red-400/10',
};

const FRAMEWORK_COLORS: Record<string, string> = {
  SPRING_BOOT: '#4ade80',
  EXPRESS: '#38bdf8',
  FASTAPI: '#fb923c',
  NESTJS: '#e879f9',
  DJANGO_REST: '#f59e0b',
  LARAVEL: '#f43f5e',
  GIN: '#34d399',
  RAILS: '#f87171',
};

const FRAMEWORK_OPTIONS = [
  { id: 'SPRING_BOOT', label: 'Spring Boot' },
  { id: 'EXPRESS', label: 'Express' },
  { id: 'FASTAPI', label: 'FastAPI' },
  { id: 'NESTJS', label: 'NestJS' },
  { id: 'DJANGO_REST', label: 'Django REST' },
  { id: 'LARAVEL', label: 'Laravel' },
  { id: 'GIN', label: 'Gin (Go)' },
  { id: 'RAILS', label: 'Ruby on Rails' },
];

const CATEGORY_ORDER = [
  '📦 Application Layer',
  '🔌 API Layer',
  '⚙️ Business Logic',
  '📋 Data Transfer',
  '🗄️ Database',
  '🧪 Tests',
  '⚡ Infrastructure',
];

function sortTreeNodes(nodes: TreeNode[]): TreeNode[] {
  nodes.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  for (const node of nodes) {
    if (node.isFolder && node.children) {
      sortTreeNodes(node.children);
    }
  }

  return nodes;
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

  return sortTreeNodes(root.children || []);
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower === 'dockerfile') return <Box size={13} className="shrink-0 text-sky-400" />;
  if (lower.endsWith('.sql')) return <Database size={13} className="shrink-0 text-amber-500" />;
  if (lower.includes('test') || lower.includes('spec'))
    return <TestTube size={13} className="shrink-0 text-primary" />;
  if (
    lower.endsWith('.java') ||
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.py') ||
    lower.endsWith('.prisma') ||
    lower.endsWith('.go') ||
    lower.endsWith('.php') ||
    lower.endsWith('.rb')
  )
    return <FileCode size={13} className="shrink-0 text-sky-500" />;
  return <FileText size={13} className="shrink-0 text-subtle" />;
}

function getLanguageFromPath(path: string): string {
  const p = path.toLowerCase();
  if (p.endsWith('.java')) return 'java';
  if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript';
  if (p.endsWith('.js') || p.endsWith('.jsx')) return 'javascript';
  if (p.endsWith('.py')) return 'python';
  if (p.endsWith('.go')) return 'go';
  if (p.endsWith('.rb') || p.endsWith('.rspec') || p.includes('gemfile')) return 'ruby';
  if (p.endsWith('.php')) return 'php';
  if (p.endsWith('.sql')) return 'sql';
  if (p.endsWith('.yml') || p.endsWith('.yaml')) return 'yaml';
  if (p.endsWith('.json')) return 'json';
  if (p.endsWith('.xml')) return 'xml';
  if (p.endsWith('.properties') || p.endsWith('.ini') || p.endsWith('.toml')) return 'ini';
  if (p.endsWith('.md')) return 'markdown';
  if (p.endsWith('.prisma')) return 'prisma';
  if (p.endsWith('dockerfile')) return 'dockerfile';
  return 'plaintext';
}

function filesBelongsToEntity(filePath: string, selectedEntityName: string | null): boolean {
  if (!selectedEntityName) return false;
  const basename = filePath.split('/').pop() ?? '';
  return basename.startsWith(selectedEntityName);
}

function getCategoryFromPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  const filename = (filePath.split('/').pop() ?? '').toLowerCase();

  // 🧪 Tests
  if (
    lower.includes('/test') ||
    lower.includes('/spec') ||
    lower.includes('test.java') ||
    lower.includes('spec.ts') ||
    lower.endsWith('_test.go') ||
    lower.includes('rspec')
  ) {
    return '🧪 Tests';
  }

  // 📋 Data Transfer
  if (
    lower.includes('/dto') ||
    lower.includes('requestdto') ||
    lower.includes('responsedto') ||
    lower.includes('createdto') ||
    lower.includes('updatedto') ||
    lower.includes('/mapper') ||
    lower.includes('mapper.java') ||
    lower.includes('serializer') ||
    lower.includes('/resource') ||
    lower.includes('storerequest') ||
    lower.includes('updaterequest') ||
    filename.includes('dto') ||
    filename.includes('serializer') ||
    filename.includes('resource')
  ) {
    return '📋 Data Transfer';
  }

  // 🔌 API Layer
  if (
    lower.includes('/controller') ||
    lower.includes('controller.') ||
    lower.includes('/handler') ||
    lower.includes('handler.') ||
    lower.includes('/route') ||
    lower.includes('/router') ||
    lower.includes('/views') ||
    lower.includes('views.') ||
    lower.includes('/urls') ||
    lower.includes('urls.')
  ) {
    return '🔌 API Layer';
  }

  // ⚙️ Business Logic
  if (
    lower.includes('/service') ||
    lower.includes('service.') ||
    lower.includes('serviceimpl') ||
    lower.includes('/repository') ||
    lower.includes('/repositories') ||
    lower.includes('repository.') ||
    lower.includes('/crud') ||
    lower.includes('crud.')
  ) {
    return '⚙️ Business Logic';
  }

  // 📦 Application Layer
  if (
    lower.includes('/entity/') ||
    lower.includes('/entities/') ||
    lower.endsWith('entity.java') ||
    lower.endsWith('entity.ts') ||
    lower.includes('/model') ||
    lower.includes('/models') ||
    lower.includes('/schemas/') ||
    lower.endsWith('schema.prisma') ||
    filename.startsWith('model')
  ) {
    return '📦 Application Layer';
  }

  // 🗄️ Database
  if (
    lower.includes('/migration') ||
    lower.includes('/db/') ||
    lower.endsWith('.sql') ||
    lower.includes('/database') ||
    lower.includes('/admin') ||
    lower.endsWith('go.mod') ||
    lower.includes('database.py') ||
    lower.includes('database.go')
  ) {
    return '🗄️ Database';
  }

  // ⚡ Infrastructure
  return '⚡ Infrastructure';
}

function getEquivalentFilePath(activePath: string, compareFilesMap: Record<string, string>): string {
  if (compareFilesMap[activePath]) return activePath;
  const filename = activePath.split('/').pop()?.toLowerCase() ?? '';

  for (const p of Object.keys(compareFilesMap)) {
    if (p.toLowerCase().endsWith(filename)) return p;
  }
  const category = getCategoryFromPath(activePath);
  for (const p of Object.keys(compareFilesMap)) {
    if (getCategoryFromPath(p) === category) return p;
  }
  return Object.keys(compareFilesMap)[0] ?? '';
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  activeFilePath: string;
  selectedEntityName: string | null;
  frameworkColor: string;
  onSelect: (filePath: string) => void;
  defaultExpanded?: boolean;
}

const TreeItem: React.FC<TreeItemProps> = ({
  node,
  depth,
  activeFilePath,
  selectedEntityName,
  frameworkColor,
  onSelect,
  defaultExpanded = true,
}) => {
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
              activeFilePath={activeFilePath}
              selectedEntityName={selectedEntityName}
              frameworkColor={frameworkColor}
              onSelect={onSelect}
              defaultExpanded={depth < 4}
            />
          ))}
      </>
    );
  }

  const isActive = node.path === activeFilePath;
  const isEntityFile = filesBelongsToEntity(node.path, selectedEntityName);

  return (
    <div
      data-filepath={node.path}
      className={`group flex h-6 cursor-pointer items-center gap-1 whitespace-nowrap pr-2 text-[0.73rem] transition-all ${
        isActive ? 'bg-surface-3 text-content font-semibold' : 'text-muted hover:bg-surface-2'
      }`}
      style={{
        paddingLeft: isEntityFile ? `${depth * 14 + 4}px` : `${depth * 14 + 6}px`,
        borderLeft: isEntityFile ? `3px solid ${frameworkColor}` : 'none',
      }}
      onClick={() => onSelect(node.path)}
    >
      {getFileIcon(node.name)}
      <span className={`overflow-hidden text-ellipsis ${isEntityFile ? 'text-content font-medium' : ''}`}>
        {node.name}
      </span>
    </div>
  );
};

export const CodePreviewDrawer: React.FC<CodePreviewDrawerProps> = ({ selectedEntityName }) => {
  const getDiagramSchema = useDiagramStore((state) => state.getDiagramSchema);
  const theme = useDiagramStore((state) => state.theme);
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const projectName = useDiagramStore((state) => state.projectName);
  const basePackage = useDiagramStore((state) => state.basePackage);
  const targetFramework = useDiagramStore((state) => state.targetFramework);
  const enabledFeatures = useDiagramStore((state) => state.enabledFeatures);
  const validationErrors = useDiagramStore((state) => state.validationErrors);

  const { showToast } = useToast();

  // Full project file map (real path -> content)
  const [allFiles, setAllFiles] = useState<Record<string, string>>({});
  const [activeFilePath, setActiveFilePath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Drawer layout states
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [drawerHeight, setDrawerHeight] = useState<number>(420);
  const [isResizingV, setIsResizingV] = useState<boolean>(false);
  const [treePanelWidth, setTreePanelWidth] = useState<number>(240);
  const [isResizingH, setIsResizingH] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  // Feature 1: Search
  const editorRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Feature 2: Diff Mode
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [diffOriginal, setDiffOriginal] = useState<Record<string, string>>({});
  const [diffSnapshotTime, setDiffSnapshotTime] = useState<string | null>(null);

  // Feature 3: Download
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Feature 4: Template Variables
  const [isVariablesOpen, setIsVariablesOpen] = useState(false);
  const [detectedVars, setDetectedVars] = useState<VariableItem[]>([]);

  // Feature 6: Framework Comparison
  const [compareMode, setCompareMode] = useState(false);
  const [compareFramework, setCompareFramework] = useState<string>(
    targetFramework === 'EXPRESS' ? 'SPRING_BOOT' : 'EXPRESS'
  );
  const [compareFiles, setCompareFiles] = useState<Record<string, string>>({});
  const [isCompareFetching, setIsCompareFetching] = useState(false);

  // Explorer View Tabs: 'all' (Full Directory Tree) vs 'entity' (Flat Categorized Entity File View)
  const [activeExplorerTab, setActiveExplorerTab] = useState<'all' | 'entity'>('all');

  // Fetch Full Project Codebase Preview
  const fetchAllFiles = useCallback(async () => {
    if (nodes.length === 0) {
      setAllFiles({});
      setActiveFilePath('');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const schema = getDiagramSchema();
      const response = await fetch('http://localhost:8080/api/scaffold/preview/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schema),
      });

      if (response.ok) {
        const data: Record<string, string> = await response.json();
        setAllFiles(data);
        setActiveFilePath((prev) => (data[prev] !== undefined ? prev : Object.keys(data)[0] ?? ''));
      } else {
        const errMsg = await response.text();
        setError(errMsg || 'Failed to render project preview');
      }
    } catch {
      setError('Connection error. Is backend running?');
    } finally {
      setIsLoading(false);
    }
  }, [getDiagramSchema, nodes.length]);

  // Fetch Compare Framework Preview
  const fetchComparePreview = useCallback(async () => {
    if (!compareMode || !compareFramework || nodes.length === 0) return;
    setIsCompareFetching(true);
    try {
      const schema = getDiagramSchema();
      const schemaOverride = { ...schema, targetFramework: compareFramework };
      const response = await fetch('http://localhost:8080/api/scaffold/preview/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemaOverride),
      });

      if (response.ok) {
        const cData = await response.json();
        setCompareFiles(cData);
      }
    } catch (err) {
      console.error('Compare framework fetch error:', err);
    } finally {
      setIsCompareFetching(false);
    }
  }, [compareMode, compareFramework, nodes.length, getDiagramSchema]);

  // Trigger preview fetch on diagram change
  useEffect(() => {
    const timer = setTimeout(fetchAllFiles, 450);
    return () => clearTimeout(timer);
  }, [nodes, edges, projectName, basePackage, targetFramework, enabledFeatures, fetchAllFiles]);

  useEffect(() => {
    if (compareMode) {
      fetchComparePreview();
    }
  }, [compareMode, compareFramework, fetchComparePreview]);

  // When an entity is selected on canvas: DEFAULT TO ENTITY VIEW TAB automatically!
  useEffect(() => {
    if (!selectedEntityName || Object.keys(allFiles).length === 0) return;

    // Automatically switch to the Entity View tab when an entity is selected
    setActiveExplorerTab('entity');

    const firstEntityFile = Object.keys(allFiles).find((p) =>
      (p.split('/').pop() ?? '').startsWith(selectedEntityName)
    );

    if (firstEntityFile) {
      setActiveFilePath(firstEntityFile);
      setIsMinimized(false);
      setTimeout(() => {
        const el = document.querySelector(`[data-filepath="${CSS.escape(firstEntityFile)}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }, [selectedEntityName, allFiles]);

  // Directory Tree Structure for 'all' tab
  const fileTree = useMemo(() => {
    const paths = Object.keys(allFiles).map((p) => ({ path: p, tabKey: p }));
    return buildFileTree(paths);
  }, [allFiles]);

  // Grouped Entity Files for 'entity' tab
  const entityFilesGrouped = useMemo(() => {
    if (!selectedEntityName) return [];

    const map = new Map<string, { path: string; name: string; category: string }[]>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, []);
    }

    for (const filePath of Object.keys(allFiles)) {
      if (filesBelongsToEntity(filePath, selectedEntityName)) {
        const cat = getCategoryFromPath(filePath);
        const name = filePath.split('/').pop() ?? filePath;
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push({ path: filePath, name, category: cat });
      }
    }

    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      files: map.get(cat) || [],
    })).filter((group) => group.files.length > 0);
  }, [allFiles, selectedEntityName]);

  // Feature 1: Debounced Search Computation across allFiles
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const queryLower = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      for (const [filePath, content] of Object.entries(allFiles)) {
        if (!content) continue;
        const fileName = filePath.split('/').pop() || filePath;
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const matchIdx = line.toLowerCase().indexOf(queryLower);
          if (matchIdx !== -1) {
            const trimmedLine = line.trim();
            const trimmedMatchIdx = trimmedLine.toLowerCase().indexOf(queryLower);
            results.push({
              filePath,
              fileName,
              lineNumber: i + 1,
              lineContent: trimmedLine.length > 60 ? trimmedLine.substring(0, 60) + '...' : trimmedLine,
              matchIndex: trimmedMatchIdx !== -1 ? trimmedMatchIdx : 0,
              matchLength: searchQuery.length,
            });
            if (results.length >= 50) break;
          }
        }
        if (results.length >= 50) break;
      }
      setSearchResults(results);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, allFiles]);

  // Feature 4: Variable Scanner
  useEffect(() => {
    if (!isVariablesOpen) return;
    const combinedContent = Object.values(allFiles).join('\n');
    const vars: VariableItem[] = [];
    const addedKeys = new Set<string>();

    const addVar = (key: string, label: string, currentValue: string) => {
      if (!addedKeys.has(key) && currentValue) {
        addedKeys.add(key);
        vars.push({ key, label, currentValue });
      }
    };

    const templateMatches = combinedContent.match(/\{\{([A-Z0-9_]+)\}\}|\$\{([A-Z0-9_]+)\}/g) || [];
    for (const match of templateMatches) {
      const cleanName = match.replace(/[\{\}\$\s]/g, '');
      addVar(match, `Template Var (${cleanName})`, match);
    }

    if (combinedContent.includes('localhost')) addVar('localhost', 'Host', 'localhost');
    if (combinedContent.includes('5432')) addVar('5432', 'PostgreSQL Port', '5432');
    if (combinedContent.includes('3306')) addVar('3306', 'MySQL Port', '3306');
    if (combinedContent.includes('27017')) addVar('27017', 'MongoDB Port', '27017');
    if (combinedContent.includes('postgres')) addVar('postgres', 'DB User/Password', 'postgres');
    if (combinedContent.includes('your-secret-key')) addVar('your-secret-key', 'Secret Key', 'your-secret-key');
    if (combinedContent.includes('change-me')) addVar('change-me', 'Secret/Password', 'change-me');
    if (basePackage && combinedContent.includes(basePackage)) addVar(basePackage, 'Base Package', basePackage);

    setDetectedVars(vars);
  }, [isVariablesOpen, allFiles, basePackage]);

  // Feature 4: Variable Replacement
  const handleVariableChange = (oldValue: string, newValue: string) => {
    setAllFiles((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, content]) => [key, content.replaceAll(oldValue, newValue)])
      )
    );
    setDetectedVars((prev) =>
      prev.map((v) => (v.key === oldValue ? { ...v, key: newValue, currentValue: newValue } : v))
    );
  };

  // Feature 3: Download Single File
  const handleDownloadFile = useCallback(() => {
    if (!activeFilePath) return;
    const content = allFiles[activeFilePath] || '';
    const filename = activeFilePath.split('/').pop() || 'file';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  }, [allFiles, activeFilePath, showToast]);

  // Feature 3: Download All as ZIP
  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const [filePath, content] of Object.entries(allFiles)) {
        zip.file(filePath, content);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName || 'scaffy'}-preview.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Downloaded full project as ZIP archive', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate ZIP archive', 'error');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Feature 1: Search Result Click
  const handleSearchResultClick = (filePath: string, lineNumber: number) => {
    setActiveFilePath(filePath);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(lineNumber);
        editorRef.current.setPosition({ lineNumber, column: 1 });
        editorRef.current.focus();
      }
    }, 50);
  };

  // Feature 5: Warning Click Navigation
  const handleWarningClick = (targetName: string) => {
    useDiagramStore.getState().onNodesChange(
      useDiagramStore.getState().nodes.map((n) => ({
        type: 'select',
        id: n.id,
        selected: n.data.name === targetName,
      }))
    );
    showToast(`Navigated to entity: ${targetName}`, 'info');
  };

  // Feature 9: Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
        setIsMinimized(false);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (isDiffMode) {
          setIsDiffMode(false);
        } else {
          setDiffOriginal({ ...allFiles });
          setDiffSnapshotTime(new Date().toLocaleTimeString());
          setIsDiffMode(true);
        }
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCompareMode((prev) => !prev);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleDownloadFile();
      } else if (e.key === 'Escape') {
        if (isSearchOpen || searchQuery) {
          setSearchQuery('');
          setIsSearchOpen(false);
        } else if (isDiffMode) {
          setIsDiffMode(false);
        } else if (compareMode) {
          setCompareMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDiffMode, compareMode, isSearchOpen, searchQuery, allFiles, handleDownloadFile]);

  // Resizing Handlers
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

  const handleCopy = async () => {
    const code = allFiles[activeFilePath] || '';
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const activeFileName = activeFilePath.split('/').pop() || activeFilePath;
  const activeCode = allFiles[activeFilePath] || '';
  const frameworkColor = FRAMEWORK_COLORS[targetFramework] || '#38bdf8';
  const badgeClass = BADGE_STYLES[targetFramework.toLowerCase()] || 'text-muted bg-surface-2';
  const frameworkLabel = FRAMEWORK_OPTIONS.find((f) => f.id === targetFramework)?.label || targetFramework;
  const totalFileCount = Object.keys(allFiles).length;

  const activeBasename = activeFilePath.split('/').pop() ?? '';
  const nodeErrors = validationErrors.filter((e) =>
    selectedEntityName ? e.target === selectedEntityName : activeBasename.startsWith(e.target)
  );

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

      {/* Title Bar & IDE Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3 bg-surface">
        {/* Left Group */}
        <div className="flex items-center gap-2">
          <button
            className="flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-content"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Preview' : 'Collapse Preview'}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <Terminal size={13} className="text-muted" />
          <span className="text-[0.78rem] text-muted">
            Preview — <strong className="font-semibold text-content">{projectName || 'Project'}</strong>
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${badgeClass}`}>
            {frameworkLabel}
          </span>
          <span className="text-[0.68rem] text-subtle font-mono">{totalFileCount} files</span>
          {selectedEntityName && (
            <span
              className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold transition-colors"
              style={{
                color: frameworkColor,
                backgroundColor: `color-mix(in srgb, ${frameworkColor} 14%, transparent)`,
              }}
            >
              ● {selectedEntityName}
            </span>
          )}
          {compareMode && (
            <span className="text-[0.68rem] font-medium text-subtle">
              vs{' '}
              <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[0.65rem] font-semibold text-content">
                {FRAMEWORK_OPTIONS.find((f) => f.id === compareFramework)?.label}
              </span>
            </span>
          )}
          {(isLoading || isCompareFetching) && <RefreshCw size={11} className="animate-spin text-muted" />}
        </div>

        {/* Right Group: Toolbar Icon Buttons */}
        <div className="flex items-center gap-1">
          {/* Search Toggle */}
          <button
            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
              isSearchOpen || searchQuery
                ? 'bg-primary/10 text-primary'
                : 'text-subtle hover:bg-surface-2 hover:text-content'
            }`}
            onClick={() => {
              setIsMinimized(false);
              setIsSearchOpen((prev) => !prev);
              if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            title="Search files across generated codebase (Ctrl+F)"
          >
            <Search size={13} />
          </button>

          {/* Variables Panel Toggle */}
          <button
            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
              isVariablesOpen ? 'bg-primary/10 text-primary' : 'text-subtle hover:bg-surface-2 hover:text-content'
            }`}
            onClick={() => {
              setIsMinimized(false);
              setIsVariablesOpen((prev) => !prev);
            }}
            title="Template Variables Panel"
          >
            <SlidersHorizontal size={13} />
          </button>

          {/* Framework Compare Toggle */}
          <button
            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
              compareMode ? 'bg-primary/10 text-primary' : 'text-subtle hover:bg-surface-2 hover:text-content'
            }`}
            onClick={() => {
              setIsMinimized(false);
              setCompareMode((prev) => !prev);
            }}
            title="Compare Frameworks (Ctrl+Shift+C)"
          >
            <Layers size={13} />
          </button>

          {/* Diff Mode Toggle */}
          <button
            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
              isDiffMode ? 'bg-primary/10 text-primary' : 'text-subtle hover:bg-surface-2 hover:text-content'
            }`}
            onClick={() => {
              setIsMinimized(false);
              if (isDiffMode) {
                setIsDiffMode(false);
              } else {
                setDiffOriginal({ ...allFiles });
                setDiffSnapshotTime(new Date().toLocaleTimeString());
                setIsDiffMode(true);
              }
            }}
            title="Diff Mode (Ctrl+D)"
          >
            <GitCompare size={13} />
          </button>

          {/* Download File */}
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-content"
            onClick={handleDownloadFile}
            title="Download Active File (Ctrl+S)"
          >
            <Download size={13} />
          </button>

          {/* Download All as ZIP */}
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-content"
            onClick={handleDownloadZip}
            disabled={isDownloadingZip}
            title="Download Full Project as ZIP"
          >
            {isDownloadingZip ? <RefreshCw size={13} className="animate-spin" /> : <FileArchive size={13} />}
          </button>

          <div className="mx-1 h-4 w-[1px] bg-border" />

          {/* Height Presets Dropdown */}
          <select
            className="h-6 rounded border border-border bg-surface-2 px-1.5 text-[0.68rem] text-muted outline-none transition-colors hover:text-content"
            value={drawerHeight}
            onChange={(e) => {
              const val = Number(e.target.value);
              setDrawerHeight(val);
              setIsMinimized(false);
            }}
            title="Drawer Height Preset"
          >
            <option value={300}>300px</option>
            <option value={400}>400px</option>
            <option value={500}>500px</option>
            <option value={600}>600px</option>
            <option value={800}>Full</option>
          </select>
        </div>
      </div>

      {/* Drawer Body */}
      {!isMinimized && (
        <div className="flex min-h-0 flex-1 flex-row overflow-hidden" data-code-preview-body>
          {error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-sm text-muted">
              <AlertTriangle size={28} className="text-danger" />
              <div className="text-sm font-semibold text-content">Scaffolding Error</div>
              <pre className="max-w-[80%] whitespace-pre-wrap text-center text-xs opacity-70">{error}</pre>
            </div>
          ) : totalFileCount === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-sm text-muted">
              <RefreshCw size={22} className="animate-spin opacity-50" />
              <span>Add entities to the canvas to view full project tree preview...</span>
            </div>
          ) : (
            <>
              {/* Left Explorer & Search Panel */}
              <div
                className="scroll-thin flex h-full shrink-0 flex-col border-r border-border bg-surface-2"
                style={{ width: `${treePanelWidth}px`, minWidth: 150, maxWidth: 400 }}
              >
                {/* Search Input */}
                {(isSearchOpen || searchQuery) && (
                  <div className="shrink-0 border-b border-border p-2">
                    <div className="relative flex items-center">
                      <Search size={12} className="absolute left-2 text-subtle" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search files..."
                        className="w-full rounded border border-border bg-surface py-1 pl-7 pr-12 text-xs text-content placeholder-subtle outline-none focus:border-primary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchResults.length > 0 && (
                        <span className="absolute right-2 text-[0.6rem] font-semibold text-primary">
                          {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
                        </span>
                      )}
                      {searchQuery && (
                        <button
                          className="absolute right-1 text-subtle hover:text-content"
                          onClick={() => setSearchQuery('')}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Explorer View Tabs: 'All Files' (Full Directory Tree) vs Entity Specific View */}
                {!searchQuery && (
                  <div className="flex shrink-0 items-center gap-1 border-b border-border p-1.5 scroll-thin">
                    <button
                      className={`rounded px-2.5 py-0.5 text-[0.65rem] font-medium transition-colors ${
                        activeExplorerTab === 'all'
                          ? 'bg-primary/20 text-primary font-semibold'
                          : 'text-subtle hover:bg-surface-3 hover:text-content'
                      }`}
                      onClick={() => setActiveExplorerTab('all')}
                    >
                      All Files
                    </button>
                    <button
                      className={`flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[0.65rem] font-medium transition-colors ${
                        activeExplorerTab === 'entity'
                          ? 'bg-primary/20 text-primary font-semibold'
                          : 'text-subtle hover:bg-surface-3 hover:text-content'
                      }`}
                      onClick={() => setActiveExplorerTab('entity')}
                    >
                      {selectedEntityName ? (
                        <>
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: frameworkColor }}
                          />
                          <span>{selectedEntityName}</span>
                        </>
                      ) : (
                        <span>Entity View</span>
                      )}
                    </button>
                  </div>
                )}

                <div className="shrink-0 border-b border-border px-3.5 py-1.5 text-[0.65rem] font-bold tracking-widest text-subtle">
                  {activeExplorerTab === 'all'
                    ? 'EXPLORER'
                    : selectedEntityName
                    ? `${selectedEntityName.toUpperCase()} ARCHITECTURE`
                    : 'ENTITY VIEW'}
                </div>

                {/* Explorer File Content List */}
                <div className="scroll-thin flex-1 overflow-y-auto overflow-x-hidden py-1">
                  {searchQuery.trim() ? (
                    // Search Results List
                    searchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-subtle">No results for "{searchQuery}"</div>
                    ) : (
                      <div className="flex flex-col gap-0.5 px-1">
                        {searchResults.map((res, idx) => (
                          <div
                            key={`${res.filePath}-${res.lineNumber}-${idx}`}
                            className="group flex cursor-pointer flex-col rounded p-1.5 text-xs transition-colors hover:bg-surface-3"
                            onClick={() => handleSearchResultClick(res.filePath, res.lineNumber)}
                          >
                            <div className="flex items-center justify-between text-[0.7rem] font-semibold text-content">
                              <span className="truncate">{res.fileName}</span>
                              <span className="text-[0.62rem] text-subtle">L{res.lineNumber}</span>
                            </div>
                            <div className="truncate font-mono text-[0.65rem] text-muted">
                              {res.lineContent.substring(0, res.matchIndex)}
                              <mark className="rounded bg-primary/25 px-0.5 text-content">
                                {res.lineContent.substring(res.matchIndex, res.matchIndex + res.matchLength)}
                              </mark>
                              {res.lineContent.substring(res.matchIndex + res.matchLength)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : activeExplorerTab === 'all' ? (
                    // Real Full Folder Directory Tree View
                    <div className="flex flex-col gap-0.5">
                      {fileTree.map((node) => (
                        <TreeItem
                          key={node.path}
                          node={node}
                          depth={0}
                          activeFilePath={activeFilePath}
                          selectedEntityName={selectedEntityName}
                          frameworkColor={frameworkColor}
                          onSelect={setActiveFilePath}
                          defaultExpanded={true}
                        />
                      ))}

                      {/* Diagram Warnings Section */}
                      {validationErrors.length > 0 && (
                        <div className="mt-3 flex flex-col border-t border-amber-500/20 pt-2">
                          <div className="flex items-center gap-1 px-3 text-[0.68rem] font-bold text-amber-500">
                            <AlertTriangle size={11} />
                            <span>Diagram Warnings ({validationErrors.length})</span>
                          </div>
                          <div className="flex flex-col py-1">
                            {validationErrors.map((err, idx) => (
                              <div
                                key={idx}
                                className="flex cursor-pointer items-center gap-1.5 px-4 py-1 text-[0.68rem] text-amber-400 hover:bg-amber-500/10"
                                onClick={() => handleWarningClick(err.target)}
                              >
                                <AlertTriangle size={10} className="shrink-0" />
                                <span className="font-semibold">{err.target}:</span>
                                <span className="truncate opacity-90">{err.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Categorized Entity View (Grouped by Application Layer, API, Business Logic, DTOs, Tests, etc.)
                    <div className="flex flex-col gap-2.5 px-1 py-1 scroll-thin">
                      {!selectedEntityName ? (
                        <div className="p-4 text-center text-xs text-subtle">
                          Select an entity on the canvas to view its architecture files
                        </div>
                      ) : entityFilesGrouped.length === 0 ? (
                        <div className="p-4 text-center text-xs text-subtle">
                          No generated files found for entity "{selectedEntityName}"
                        </div>
                      ) : (
                        entityFilesGrouped.map((group) => (
                          <div key={group.category} className="flex flex-col gap-0.5">
                            {/* Category Group Header */}
                            <div className="flex items-center justify-between border-b border-border/60 bg-surface-2/60 px-2 py-1 text-[0.68rem] font-bold text-muted rounded-t">
                              <span>{group.category}</span>
                              <span className="font-mono text-[0.6rem] text-subtle">{group.files.length}</span>
                            </div>

                            {/* Entity Files under Category */}
                            <div className="flex flex-col gap-0.5 pt-0.5">
                              {group.files.map((file) => {
                                const isActive = file.path === activeFilePath;
                                return (
                                  <div
                                    key={file.path}
                                    data-filepath={file.path}
                                    className={`group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${
                                      isActive
                                        ? 'bg-surface-3 font-semibold text-content'
                                        : 'text-muted hover:bg-surface-2 hover:text-content'
                                    }`}
                                    style={{
                                      borderLeft: `3px solid ${frameworkColor}`,
                                    }}
                                    onClick={() => setActiveFilePath(file.path)}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      {getFileIcon(file.name)}
                                      <span className="truncate font-medium text-[0.74rem]">{file.name}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Horizontal Resize Handle */}
              <div
                className={`w-[3px] shrink-0 cursor-col-resize transition-colors hover:bg-primary/40 ${
                  isResizingH ? 'bg-primary/50' : 'bg-transparent'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizingH(true);
                }}
              />

              {/* Editor Workspace */}
              <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                {/* Tab Bar */}
                <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-border bg-surface-2 px-2">
                  <div className="flex h-full items-center gap-1.5 border-b-2 border-primary px-3 text-[0.72rem] font-medium text-content">
                    {getFileIcon(activeFileName)}
                    <span>{activeFileName}</span>
                  </div>
                  <div className="flex-1" />

                  {/* Copy Button */}
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

                  {/* Toolbar Diff Toggle Button */}
                  <button
                    className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[0.65rem] font-medium transition-colors ${
                      isDiffMode
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-subtle hover:text-content'
                    }`}
                    onClick={() => {
                      if (isDiffMode) {
                        setIsDiffMode(false);
                      } else {
                        setDiffOriginal({ ...allFiles });
                        setDiffSnapshotTime(new Date().toLocaleTimeString());
                        setIsDiffMode(true);
                      }
                    }}
                    title="Compare with snapshot (Ctrl+D)"
                  >
                    <GitCompare size={12} />
                    <span>{isDiffMode ? 'Exit Diff' : 'Diff'}</span>
                  </button>
                </div>

                {/* Breadcrumb Path */}
                <div className="scroll-thin flex shrink-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap border-b border-border bg-surface-2/50 px-3.5 py-1 font-mono text-[0.68rem] text-subtle">
                  {activeFilePath.split('/').map((seg, i, arr) => (
                    <React.Fragment key={i}>
                      <span className={i === arr.length - 1 ? 'font-medium text-content' : ''}>{seg}</span>
                      {i < arr.length - 1 && <ChevronRight size={10} className="shrink-0 opacity-50" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Warning Banner */}
                {nodeErrors.length > 0 && (
                  <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/20 bg-amber-500/8 px-4 py-1.5 text-xs text-amber-400">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>
                      This entity has {nodeErrors.length} validation {nodeErrors.length === 1 ? 'issue' : 'issues'}.{' '}
                      {nodeErrors.map((e) => e.message).join(' · ')}
                    </span>
                  </div>
                )}

                {/* Diff Snapshot Banner */}
                {isDiffMode && (
                  <div className="flex shrink-0 items-center justify-between border-b border-primary/20 bg-primary/10 px-4 py-1.5 text-xs text-primary">
                    <div className="flex items-center gap-2">
                      <GitCompare size={13} />
                      <span>Comparing snapshot from {diffSnapshotTime} to current</span>
                    </div>
                    <button
                      className="rounded bg-primary/20 px-2 py-0.5 text-[0.65rem] font-semibold text-primary hover:bg-primary/30"
                      onClick={() => setIsDiffMode(false)}
                    >
                      Exit Diff
                    </button>
                  </div>
                )}

                {/* Compare Mode Framework Selector Header */}
                {compareMode && (
                  <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-3 px-3 py-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-content">{targetFramework}</span>
                      <span className="text-subtle">vs</span>
                      <select
                        className="rounded border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-primary outline-none"
                        value={compareFramework}
                        onChange={(e) => setCompareFramework(e.target.value)}
                      >
                        {FRAMEWORK_OPTIONS.filter((f) => f.id !== targetFramework).map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="rounded bg-surface-2 px-2 py-0.5 text-[0.65rem] font-semibold text-subtle hover:text-content"
                      onClick={() => setCompareMode(false)}
                    >
                      Exit Compare
                    </button>
                  </div>
                )}

                {/* Monaco Editor Container */}
                <div className="relative flex min-h-0 flex-1 flex-row">
                  {isDiffMode ? (
                    // Monaco Diff Editor
                    <DiffEditor
                      height="100%"
                      original={diffOriginal[activeFilePath] || '// No previous snapshot'}
                      modified={activeCode}
                      language={getLanguageFromPath(activeFilePath)}
                      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                      options={{
                        readOnly: true,
                        renderSideBySide: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineHeight: 20,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                        fontLigatures: true,
                        automaticLayout: true,
                        padding: { top: 8, bottom: 8 },
                      }}
                    />
                  ) : compareMode ? (
                    // Split Editors for Framework Comparison
                    <div className="flex h-full w-full flex-row">
                      {/* Primary Framework Editor */}
                      <div className="flex h-full flex-1 flex-col border-r border-border">
                        <div className="bg-surface-2 px-3 py-1 text-[0.65rem] font-bold text-subtle border-b border-border truncate">
                          {frameworkLabel} — {activeFileName}
                        </div>
                        <div className="relative flex-1">
                          <Editor
                            height="100%"
                            language={getLanguageFromPath(activeFilePath)}
                            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                            value={activeCode}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 12,
                              automaticLayout: true,
                            }}
                          />
                        </div>
                      </div>

                      {/* Secondary Framework Editor */}
                      <div className="flex h-full flex-1 flex-col">
                        <div className="bg-surface-2 px-3 py-1 text-[0.65rem] font-bold text-subtle border-b border-border truncate">
                          {FRAMEWORK_OPTIONS.find((f) => f.id === compareFramework)?.label} —{' '}
                          {getEquivalentFilePath(activeFilePath, compareFiles).split('/').pop() || 'File'}
                        </div>
                        <div className="relative flex-1">
                          <Editor
                            height="100%"
                            language={getLanguageFromPath(getEquivalentFilePath(activeFilePath, compareFiles))}
                            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                            value={
                              compareFiles[getEquivalentFilePath(activeFilePath, compareFiles)] ||
                              '// No equivalent file in target framework'
                            }
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 12,
                              automaticLayout: true,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Standard Single Monaco Editor
                    <Editor
                      height="100%"
                      language={getLanguageFromPath(activeFilePath)}
                      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                      value={activeCode}
                      onMount={(editor) => {
                        editorRef.current = editor;
                      }}
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
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
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
                  )}
                </div>
              </div>

              {/* Sliding Variables Panel */}
              {isVariablesOpen && (
                <div className="scroll-thin flex h-full w-[220px] shrink-0 flex-col border-l border-border bg-surface-2 p-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-content">Variables</span>
                    <button
                      className="text-subtle hover:text-content"
                      onClick={() => setIsVariablesOpen(false)}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="scroll-thin flex-1 overflow-y-auto py-2 flex flex-col gap-3">
                    {detectedVars.length === 0 ? (
                      <div className="text-center text-xs text-subtle">No variables detected.</div>
                    ) : (
                      detectedVars.map((v) => (
                        <div key={v.key} className="flex flex-col gap-1">
                          <label className="text-[0.68rem] font-semibold text-muted">{v.label}</label>
                          <input
                            type="text"
                            className="rounded border border-border bg-surface px-2 py-1 text-xs text-content outline-none focus:border-primary"
                            value={v.currentValue}
                            onChange={(e) => handleVariableChange(v.currentValue, e.target.value)}
                          />
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    className="mt-2 w-full rounded border border-border bg-surface py-1.5 text-xs font-medium text-subtle transition-colors hover:bg-surface-3 hover:text-content"
                    onClick={() => {
                      fetchAllFiles();
                      showToast('Reset variables to backend generated content', 'info');
                    }}
                  >
                    Reset to generated
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
