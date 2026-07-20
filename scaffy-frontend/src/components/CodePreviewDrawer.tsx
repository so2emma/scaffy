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
  entityName: string;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeNode[];
  tabKey?: string;
}

interface SearchResult {
  tabKey: string;
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

const CATEGORY_MAP: { id: string; label: string; icon: string; keys: string[] }[] = [
  { id: 'App', label: 'Application Layer', icon: '📦', keys: ['Entity', 'Model', 'Models', 'Model (SQLAlchemy)', 'Schema (Pydantic)', 'Prisma Schema'] },
  { id: 'API', label: 'API Layer', icon: '🔌', keys: ['Controller', 'Handler', 'Route', 'Router', 'Views', 'URLs'] },
  { id: 'Logic', label: 'Business Logic', icon: '⚙️', keys: ['Service', 'ServiceImpl', 'CRUD Helpers', 'Repository'] },
  { id: 'DTO', label: 'Data Transfer', icon: '📋', keys: ['Request DTO', 'Response DTO', 'Create DTO', 'Update DTO', 'Mapper', 'Store Request', 'Update Request', 'API Resource', 'Serializer', 'Serializers'] },
  { id: 'DB', label: 'Database', icon: '🗄️', keys: ['Migration', 'Flyway SQL', 'Database Config', 'Database', 'Admin'] },
  { id: 'Tests', label: 'Tests', icon: '🧪', keys: ['Unit Test', 'Feature Test', 'Tests', 'RSpec'] },
  { id: 'Infra', label: 'Infrastructure', icon: '⚡', keys: ['Dockerfile', 'docker-compose', 'GitHub CI', '.env.example', 'App Module', 'Module', 'App Configuration', 'Settings', 'Main', 'Main App', 'Routes', 'go.mod'] },
];

function getCategoryForTabKey(tabKey: string, isProjectFile: boolean): string {
  if (isProjectFile) return 'Project Configuration';
  if (tabKey.startsWith('Enum ')) return 'Application Layer';
  for (const cat of CATEGORY_MAP) {
    if (cat.keys.includes(tabKey)) return cat.label;
  }
  return 'Infrastructure';
}

function getEquivalentTabKey(activeTab: string, compareFramework: string, targetFiles: Record<string, string>): string {
  if (targetFiles[activeTab]) return activeTab;
  const tabLower = activeTab.toLowerCase();

  if (tabLower.includes('entity') || tabLower.includes('model')) {
    const found = Object.keys(targetFiles).find((k) => k.toLowerCase().includes('entity') || k.toLowerCase().includes('model'));
    if (found) return found;
  }
  if (tabLower.includes('controller') || tabLower.includes('handler') || tabLower.includes('views') || tabLower.includes('route')) {
    const found = Object.keys(targetFiles).find(
      (k) =>
        k.toLowerCase().includes('controller') ||
        k.toLowerCase().includes('handler') ||
        k.toLowerCase().includes('views') ||
        k.toLowerCase().includes('route')
    );
    if (found) return found;
  }
  if (tabLower.includes('service') || tabLower.includes('crud')) {
    const found = Object.keys(targetFiles).find((k) => k.toLowerCase().includes('service') || k.toLowerCase().includes('crud'));
    if (found) return found;
  }
  if (tabLower.includes('test') || tabLower.includes('spec')) {
    const found = Object.keys(targetFiles).find((k) => k.toLowerCase().includes('test') || k.toLowerCase().includes('spec'));
    if (found) return found;
  }

  const keys = Object.keys(targetFiles);
  return keys.length > 0 ? keys[0] : activeTab;
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
    lower.endsWith('.py') ||
    lower.endsWith('.prisma') ||
    lower.endsWith('.go') ||
    lower.endsWith('.php') ||
    lower.endsWith('.rb')
  )
    return <FileCode size={13} className="shrink-0 text-sky-500" />;
  return <FileText size={13} className="shrink-0 text-subtle" />;
}

export const CodePreviewDrawer: React.FC<CodePreviewDrawerProps> = ({ entityName }) => {
  const getDiagramSchema = useDiagramStore((state) => state.getDiagramSchema);
  const theme = useDiagramStore((state) => state.theme);
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const projectName = useDiagramStore((state) => state.projectName);
  const basePackage = useDiagramStore((state) => state.basePackage);
  const targetFramework = useDiagramStore((state) => state.targetFramework);
  const validationErrors = useDiagramStore((state) => state.validationErrors);

  const openApiSupport = useDiagramStore((state) => state.enabledFeatures['openApi']);
  const generateTestStubs = useDiagramStore((state) => state.enabledFeatures['mockitoTests']);
  const flywayMigration = useDiagramStore((state) => state.enabledFeatures['flywayMigration']);

  const { showToast } = useToast();

  // Primary file states
  const [files, setFiles] = useState<Record<string, string>>({});
  const [projectFiles, setProjectFiles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('Entity');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
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

  // Feature 7: Smart Sections & Category Filter
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // All combined files (entity + project wide)
  const allFiles = useMemo(() => {
    return { ...files, ...projectFiles };
  }, [files, projectFiles]);

  const getFilePathForTab = useCallback(
    (tab: string): string => {
      const projNameSnake = (projectName || 'scaffy').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
      const pkgPath = (basePackage || 'com.example').replace(/\./g, '/');
      const entitySnake = (entityName || 'entity').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
      const entityUncap = entityName ? entityName.charAt(0).toLowerCase() + entityName.slice(1) : 'entity';

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
        if (tab === 'application.properties') return `${projNameSnake}/src/main/resources/application.properties`;
        if (tab === 'pom.xml') return `${projNameSnake}/pom.xml`;
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
        if (tab === 'package.json') return `${projNameSnake}/package.json`;
      } else if (targetFramework === 'FASTAPI') {
        if (tab === 'Model (SQLAlchemy)') return `${projNameSnake}/app/models/${entitySnake}.py`;
        if (tab === 'Schema (Pydantic)') return `${projNameSnake}/app/schemas/${entitySnake}.py`;
        if (tab === 'CRUD Helpers') return `${projNameSnake}/app/crud/${entitySnake}.py`;
        if (tab === 'Router') return `${projNameSnake}/app/routers/${entitySnake}.py`;
        if (tab === 'Main App') return `${projNameSnake}/app/main.py`;
        if (tab === 'Database Config') return `${projNameSnake}/app/database.py`;
        if (tab === 'requirements.txt') return `${projNameSnake}/requirements.txt`;
      } else if (targetFramework === 'NESTJS') {
        const entityKebab = entityName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
        if (tab === 'Entity') return `${projNameSnake}/src/${entityKebab}/entities/${entityKebab}.entity.ts`;
        if (tab === 'Create DTO') return `${projNameSnake}/src/${entityKebab}/dto/create-${entityKebab}.dto.ts`;
        if (tab === 'Update DTO') return `${projNameSnake}/src/${entityKebab}/dto/update-${entityKebab}.dto.ts`;
        if (tab === 'Service') return `${projNameSnake}/src/${entityKebab}/${entityKebab}.service.ts`;
        if (tab === 'Controller') return `${projNameSnake}/src/${entityKebab}/${entityKebab}.controller.ts`;
        if (tab === 'Module') return `${projNameSnake}/src/${entityKebab}/${entityKebab}.module.ts`;
        if (tab === 'App Module') return `${projNameSnake}/src/app.module.ts`;
        if (tab === 'main.ts') return `${projNameSnake}/src/main.ts`;
        if (tab === 'package.json') return `${projNameSnake}/package.json`;
        if (tab === 'Unit Test') return `${projNameSnake}/src/${entityKebab}/${entityKebab}.service.spec.ts`;
      } else if (targetFramework === 'DJANGO_REST') {
        if (tab === 'Models') return `${projNameSnake}/api/models.py`;
        if (tab === 'Serializers') return `${projNameSnake}/api/serializers.py`;
        if (tab === 'Views') return `${projNameSnake}/api/views.py`;
        if (tab === 'URLs') return `${projNameSnake}/api/urls.py`;
        if (tab === 'Admin') return `${projNameSnake}/api/admin.py`;
        if (tab === 'Settings') return `${projNameSnake}/${projNameSnake}/settings.py`;
        if (tab === 'manage.py') return `${projNameSnake}/manage.py`;
        if (tab === 'requirements.txt') return `${projNameSnake}/requirements.txt`;
        if (tab === 'Tests') return `${projNameSnake}/api/tests.py`;
      } else if (targetFramework === 'LARAVEL') {
        if (tab === 'Model') return `${projNameSnake}/app/Models/${entityName}.php`;
        if (tab === 'Controller') return `${projNameSnake}/app/Http/Controllers/Api/${entityName}Controller.php`;
        if (tab === 'Store Request') return `${projNameSnake}/app/Http/Requests/Store${entityName}Request.php`;
        if (tab === 'Update Request') return `${projNameSnake}/app/Http/Requests/Update${entityName}Request.php`;
        if (tab === 'API Resource') return `${projNameSnake}/app/Http/Resources/${entityName}Resource.php`;
        if (tab === 'Migration') return `${projNameSnake}/database/migrations/2024_01_01_000001_create_${entitySnake}s_table.php`;
        if (tab === 'Routes' || tab === 'routes/api.php') return `${projNameSnake}/routes/api.php`;
        if (tab === 'composer.json') return `${projNameSnake}/composer.json`;
        if (tab === 'Feature Test') return `${projNameSnake}/tests/Feature/${entityName}Test.php`;
      } else if (targetFramework === 'GIN') {
        if (tab === 'Model') return `${projNameSnake}/internal/models/${entitySnake}.go`;
        if (tab === 'Handler') return `${projNameSnake}/internal/handlers/${entitySnake}_handler.go`;
        if (tab === 'Repository') return `${projNameSnake}/internal/repositories/${entitySnake}_repository.go`;
        if (tab === 'Routes') return `${projNameSnake}/internal/routes/routes.go`;
        if (tab === 'Database' || tab === 'internal/database/database.go') return `${projNameSnake}/internal/database/database.go`;
        if (tab === 'Main' || tab === 'cmd/server/main.go') return `${projNameSnake}/cmd/server/main.go`;
        if (tab === 'go.mod') return `${projNameSnake}/go.mod`;
      } else if (targetFramework === 'RAILS') {
        const entityPlural = `${entitySnake}s`;
        if (tab === 'Model') return `${projNameSnake}/app/models/${entitySnake}.rb`;
        if (tab === 'Controller') return `${projNameSnake}/app/controllers/api/v1/${entityPlural}_controller.rb`;
        if (tab === 'Serializer') return `${projNameSnake}/app/serializers/${entitySnake}_serializer.rb`;
        if (tab === 'Migration') return `${projNameSnake}/db/migrate/20240101000001_create_${entityPlural}.rb`;
        if (tab === 'Routes' || tab === 'config/routes.rb') return `${projNameSnake}/config/routes.rb`;
        if (tab === 'Gemfile') return `${projNameSnake}/Gemfile`;
        if (tab === 'config/database.yml') return `${projNameSnake}/config/database.yml`;
        if (tab === 'RSpec') return `${projNameSnake}/spec/models/${entitySnake}_spec.rb`;
      }

      // Docker / CI files
      if (tab === 'Dockerfile') return `${projNameSnake}/Dockerfile`;
      if (tab === 'docker-compose') return `${projNameSnake}/docker-compose.yml`;
      if (tab === 'GitHub CI') return `${projNameSnake}/.github/workflows/ci.yml`;
      if (tab === '.env.example') return `${projNameSnake}/.env.example`;

      return `${projNameSnake}/${tab}`;
    },
    [projectName, basePackage, entityName, targetFramework]
  );

  // Fetch Entity Preview
  const fetchPreview = useCallback(async () => {
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

        if (previewMap && !previewMap[activeTab] && !projectFiles[activeTab]) {
          const keys = Object.keys(previewMap);
          if (keys.length > 0) setActiveTab(keys[0]);
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
  }, [entityName, getDiagramSchema, activeTab, projectFiles]);

  // Feature 8: Fetch Project-Wide Files (__PROJECT__)
  const fetchProjectFiles = useCallback(async () => {
    try {
      const schema = getDiagramSchema();
      const response = await fetch(`http://localhost:8080/api/scaffold/preview?entityName=__PROJECT__`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schema),
      });

      if (response.ok) {
        const pFiles = await response.json();
        setProjectFiles(pFiles);
      }
    } catch (err) {
      console.error('Project files preview error:', err);
    }
  }, [getDiagramSchema]);

  // Feature 6: Fetch Compare Framework Preview
  const fetchComparePreview = useCallback(async () => {
    if (!compareMode || !compareFramework) return;
    setIsCompareFetching(true);
    try {
      const schema = getDiagramSchema();
      const schemaOverride = { ...schema, targetFramework: compareFramework };
      const response = await fetch(`http://localhost:8080/api/scaffold/preview?entityName=${entityName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schemaOverride),
      });

      if (response.ok) {
        const cMap = await response.json();
        setCompareFiles(cMap);
      }
    } catch (err) {
      console.error('Compare framework fetch error:', err);
    } finally {
      setIsCompareFetching(false);
    }
  }, [compareMode, compareFramework, entityName, getDiagramSchema]);

  useEffect(() => {
    setIsLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchPreview();
      fetchProjectFiles();
    }, 450);
    return () => clearTimeout(delayDebounceFn);
  }, [
    entityName,
    nodes,
    edges,
    projectName,
    basePackage,
    openApiSupport,
    generateTestStubs,
    flywayMigration,
    targetFramework,
    fetchPreview,
    fetchProjectFiles,
  ]);

  useEffect(() => {
    if (compareMode) {
      fetchComparePreview();
    }
  }, [compareMode, compareFramework, fetchComparePreview]);

  // Feature 1: Debounced Search Computation
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const queryLower = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      for (const [tabKey, content] of Object.entries(allFiles)) {
        if (!content) continue;
        const fileName = getFilePathForTab(tabKey).split('/').pop() || tabKey;
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const matchIdx = line.toLowerCase().indexOf(queryLower);
          if (matchIdx !== -1) {
            const trimmedLine = line.trim();
            const trimmedMatchIdx = trimmedLine.toLowerCase().indexOf(queryLower);
            results.push({
              tabKey,
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
  }, [searchQuery, allFiles, getFilePathForTab]);

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

    // Regex for {{VAR}} and ${VAR}
    const templateMatches = combinedContent.match(/\{\{([A-Z0-9_]+)\}\}|\$\{([A-Z0-9_]+)\}/g) || [];
    for (const match of templateMatches) {
      const cleanName = match.replace(/[\{\}\$\s]/g, '');
      addVar(match, `Template Var (${cleanName})`, match);
    }

    // Common placeholders
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
    setFiles((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, content]) => [key, content.replaceAll(oldValue, newValue)])
      )
    );
    setProjectFiles((prev) =>
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
    const content = allFiles[activeTab] || '';
    const activeFilePath = getFilePathForTab(activeTab);
    const filename = activeFilePath.split('/').pop() || activeTab;
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
  }, [allFiles, activeTab, getFilePathForTab, showToast]);

  // Feature 3: Download All as ZIP
  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const [tabKey, content] of Object.entries(allFiles)) {
        const filePath = getFilePathForTab(tabKey);
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
      showToast('Downloaded all preview files as ZIP', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate ZIP archive', 'error');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Feature 1: Search result click
  const handleSearchResultClick = (tabKey: string, lineNumber: number) => {
    setActiveTab(tabKey);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(lineNumber);
        editorRef.current.setPosition({ lineNumber, column: 1 });
        editorRef.current.focus();
      }
    }, 50);
  };

  // Feature 5: Warning click navigation
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

  // Resizing handlers
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
    const code = allFiles[activeTab] || '';
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const getEditorLanguage = (tabName: string = activeTab, framework: string = targetFramework) => {
    if (tabName === 'Dockerfile') return 'dockerfile';
    if (tabName === 'docker-compose') return 'yaml';
    if (tabName === 'GitHub CI') return 'yaml';
    if (tabName === '.env.example') return 'plaintext';
    if (tabName === 'Flyway SQL' || tabName.endsWith('.sql')) return 'sql';
    if (tabName === 'Prisma Schema') return 'prisma';
    if (framework === 'EXPRESS' || framework === 'NESTJS') return 'typescript';
    if (framework === 'FASTAPI' || framework === 'DJANGO_REST') return 'python';
    if (framework === 'LARAVEL') return 'php';
    if (framework === 'GIN') return 'go';
    if (framework === 'RAILS') return 'ruby';
    return 'java';
  };

  const activeFilePath = getFilePathForTab(activeTab);
  const activeFileName = activeFilePath.split('/').pop() || activeTab;
  const activeCode = allFiles[activeTab] || '';
  const badgeClass = BADGE_STYLES[targetFramework.toLowerCase()] || 'text-muted bg-surface-2';

  const frameworkLabel =
    FRAMEWORK_OPTIONS.find((f) => f.id === targetFramework)?.label || targetFramework;

  // Feature 7: Group files by Category
  const categorizedSections = useMemo(() => {
    const sectionsMap: Record<string, { label: string; icon: string; items: { tabKey: string; name: string; path: string }[] }> = {};

    const allKeys = Object.keys(allFiles);
    for (const key of allKeys) {
      const isProj = Boolean(projectFiles[key]);
      const catLabel = getCategoryForTabKey(key, isProj);
      const catObj = CATEGORY_MAP.find((c) => c.label === catLabel) || {
        id: 'Proj',
        label: 'Project Configuration',
        icon: '📁',
      };

      if (!sectionsMap[catLabel]) {
        sectionsMap[catLabel] = {
          label: catLabel,
          icon: catObj.icon,
          items: [],
        };
      }

      const filePath = getFilePathForTab(key);
      const name = filePath.split('/').pop() || key;
      sectionsMap[catLabel].items.push({ tabKey: key, name, path: filePath });
    }

    return sectionsMap;
  }, [allFiles, projectFiles, getFilePathForTab]);

  const nodeErrors = validationErrors.filter((e) => e.target === entityName);

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

      {/* Feature 9: Redesigned Title Bar & IDE Toolbar */}
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
            Preview — <strong className="font-semibold text-content">{entityName}</strong>
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${badgeClass}`}
          >
            {frameworkLabel}
          </span>
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
            title="Search files across generated code (Ctrl+F)"
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
            title="Download All Files as ZIP"
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
          ) : Object.keys(allFiles).length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-sm text-muted">
              <RefreshCw size={22} className="animate-spin opacity-50" />
              <span>Loading scaffold preview...</span>
            </div>
          ) : (
            <>
              {/* Left Explorer & Search Panel */}
              <div
                className="scroll-thin flex h-full shrink-0 flex-col border-r border-border bg-surface-2"
                style={{ width: `${treePanelWidth}px`, minWidth: 150, maxWidth: 400 }}
              >
                {/* Feature 1: Search Input */}
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

                {/* Feature 7: Category Filter Pills */}
                {!searchQuery && (
                  <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border p-1.5 scroll-thin">
                    {['All', 'App', 'API', 'Logic', 'DTO', 'DB', 'Tests', 'Infra'].map((cat) => (
                      <button
                        key={cat}
                        className={`rounded px-1.5 py-0.5 text-[0.62rem] font-medium transition-colors ${
                          categoryFilter === cat
                            ? 'bg-primary/20 text-primary font-semibold'
                            : 'text-subtle hover:bg-surface-3 hover:text-content'
                        }`}
                        onClick={() => setCategoryFilter(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div className="shrink-0 border-b border-border px-3.5 py-1.5 text-[0.65rem] font-bold tracking-widest text-subtle">
                  EXPLORER
                </div>

                {/* Main Tree / Search Results Area */}
                <div className="scroll-thin flex-1 overflow-y-auto overflow-x-hidden py-1">
                  {searchQuery.trim() ? (
                    // Search Results List
                    searchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-subtle">
                        No results for "{searchQuery}"
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5 px-1">
                        {searchResults.map((res, idx) => (
                          <div
                            key={`${res.tabKey}-${res.lineNumber}-${idx}`}
                            className="group flex cursor-pointer flex-col rounded p-1.5 text-xs transition-colors hover:bg-surface-3"
                            onClick={() => handleSearchResultClick(res.tabKey, res.lineNumber)}
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
                  ) : (
                    // Feature 7 & 8: Smart Categorized Tree View
                    <div className="flex flex-col gap-1">
                      {Object.entries(categorizedSections)
                        .filter(([catLabel]) => {
                          if (categoryFilter === 'All') return true;
                          if (categoryFilter === 'App' && catLabel === 'Application Layer') return true;
                          if (categoryFilter === 'API' && catLabel === 'API Layer') return true;
                          if (categoryFilter === 'Logic' && catLabel === 'Business Logic') return true;
                          if (categoryFilter === 'DTO' && catLabel === 'Data Transfer') return true;
                          if (categoryFilter === 'DB' && catLabel === 'Database') return true;
                          if (categoryFilter === 'Tests' && catLabel === 'Tests') return true;
                          if (categoryFilter === 'Infra' && catLabel === 'Infrastructure') return true;
                          return false;
                        })
                        .map(([catLabel, section]) => {
                          const isCollapsed = collapsedSections.has(catLabel);
                          return (
                            <div key={catLabel} className="flex flex-col">
                              {/* Section Header */}
                              <div
                                className="flex h-6 cursor-pointer items-center justify-between border-b border-border/40 px-3 text-[0.7rem] font-bold text-muted transition-colors hover:bg-surface-3"
                                onClick={() =>
                                  setCollapsedSections((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(catLabel)) next.delete(catLabel);
                                    else next.add(catLabel);
                                    return next;
                                  })
                                }
                              >
                                <span className="flex items-center gap-1.5">
                                  <span>{section.icon}</span>
                                  <span>{section.label}</span>
                                </span>
                                <ChevronRight
                                  size={11}
                                  className={`text-subtle transition-transform ${
                                    !isCollapsed ? 'rotate-90' : ''
                                  }`}
                                />
                              </div>

                              {/* Section Items */}
                              {!isCollapsed && (
                                <div className="flex flex-col py-0.5">
                                  {section.items.map((item) => (
                                    <div
                                      key={item.tabKey}
                                      className={`flex h-6 cursor-pointer items-center gap-1.5 whitespace-nowrap pl-6 pr-2 text-[0.73rem] transition-colors ${
                                        activeTab === item.tabKey
                                          ? 'bg-surface-3 text-content font-medium'
                                          : 'text-muted hover:bg-surface-2'
                                      }`}
                                      onClick={() => setActiveTab(item.tabKey)}
                                    >
                                      {getFileIcon(item.name)}
                                      <span className="truncate">{item.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                      {/* Feature 5: Diagram Warnings Section */}
                      {validationErrors.length > 0 && (
                        <div className="mt-2 flex flex-col border-t border-amber-500/20 pt-2">
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

                {/* Feature 5: Yellow Warning Banner if entity has validation errors */}
                {nodeErrors.length > 0 && (
                  <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/20 bg-amber-500/8 px-4 py-1.5 text-xs text-amber-400">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>
                      This entity has {nodeErrors.length} validation {nodeErrors.length === 1 ? 'issue' : 'issues'}.{' '}
                      {nodeErrors.map((e) => e.message).join(' · ')}
                    </span>
                  </div>
                )}

                {/* Feature 2: Diff Snapshot Banner */}
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

                {/* Feature 6: Compare Mode Framework Selector Header */}
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
                    // Feature 2: Monaco Diff Editor
                    <DiffEditor
                      height="100%"
                      original={diffOriginal[activeTab] || '// No previous snapshot'}
                      modified={allFiles[activeTab] || ''}
                      language={getEditorLanguage()}
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
                    // Feature 6: Split Editors for Framework Comparison
                    <div className="flex h-full w-full flex-row">
                      {/* Primary Framework Editor */}
                      <div className="flex h-full flex-1 flex-col border-r border-border">
                        <div className="bg-surface-2 px-3 py-1 text-[0.65rem] font-bold text-subtle border-b border-border">
                          {frameworkLabel} — {activeFileName}
                        </div>
                        <div className="relative flex-1">
                          <Editor
                            height="100%"
                            language={getEditorLanguage(activeTab, targetFramework)}
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
                        <div className="bg-surface-2 px-3 py-1 text-[0.65rem] font-bold text-subtle border-b border-border">
                          {FRAMEWORK_OPTIONS.find((f) => f.id === compareFramework)?.label} —{' '}
                          {getEquivalentTabKey(activeTab, compareFramework, compareFiles)}
                        </div>
                        <div className="relative flex-1">
                          <Editor
                            height="100%"
                            language={getEditorLanguage(
                              getEquivalentTabKey(activeTab, compareFramework, compareFiles),
                              compareFramework
                            )}
                            theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                            value={
                              compareFiles[getEquivalentTabKey(activeTab, compareFramework, compareFiles)] ||
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
                      language={getEditorLanguage()}
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

              {/* Feature 4: Sliding Variables Panel */}
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
                      fetchPreview();
                      fetchProjectFiles();
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
