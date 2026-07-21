import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Search, LayoutTemplate, ShoppingCart, Building2, Users, FileText, Package, Loader2,
  Stethoscope, KanbanSquare, Hotel, GraduationCap, Globe, Sparkles
} from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { useDiagramStore } from '../store/useDiagramStore';
import { useToast } from '../hooks/useToast';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommunityTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  diagramJson: string;
  entityCount: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Commerce: '#4ade80',
  Platform: '#38bdf8',
  Social: '#e879f9',
  Content: '#fb923c',
  Healthcare: '#f87171',
  Productivity: '#a78bfa',
  Hospitality: '#22d3ee',
  Education: '#fbbf24',
  General: '#60a5fa',
};

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  ShoppingCart,
  Building2,
  Users,
  FileText,
  Package,
  Stethoscope,
  KanbanSquare,
  Hotel,
  GraduationCap,
};

const API = 'http://localhost:8080';

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({ isOpen, onClose }) => {
  const { templates, isLoading: isLoadingBuiltIn, fetchTemplateDiagram } = useTemplates();
  const { showToast } = useToast();
  const importDiagram = useDiagramStore((state) => state.importDiagram);
  const autoLayout = useDiagramStore((state) => state.autoLayout);
  const nodes = useDiagramStore((state) => state.nodes);

  const [activeTab, setActiveTab] = useState<'builtin' | 'community'>('builtin');
  const [communityTemplates, setCommunityTemplates] = useState<CommunityTemplate[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);

  const [search, setSearch] = useState('');
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
      setTimeout(() => searchRef.current?.focus(), 100);
      fetchCommunityTemplates();
    } else {
      setAnimating(false);
      const timer = setTimeout(() => {
        setVisible(false);
        setSearch('');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchCommunityTemplates = async () => {
    setIsLoadingCommunity(true);
    try {
      const res = await fetch(`${API}/api/user-templates/community`);
      if (res.ok) {
        const data = await res.json();
        setCommunityTemplates(data);
      }
    } catch (err) {
      console.warn('Backend server unreachable at http://localhost:8080:', err);
      setCommunityTemplates([]);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  const filteredBuiltIn = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [search, templates]);

  const filteredCommunity = useMemo(() => {
    if (!search.trim()) return communityTemplates;
    const q = search.toLowerCase();
    return communityTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }, [search, communityTemplates]);

  const handleSelectBuiltIn = async (templateId: string, templateName: string) => {
    if (nodes.length > 0) {
      const confirmed = window.confirm('This will replace your current diagram. Continue?');
      if (!confirmed) return;
    }

    setLoadingTemplate(templateId);
    try {
      const diagram = await fetchTemplateDiagram(templateId);
      importDiagram(diagram);
      autoLayout();
      showToast(`Template loaded: ${templateName}`, 'success');
      onClose();
    } catch (error) {
      showToast(`Failed to load template: ${error}`, 'error');
    } finally {
      setLoadingTemplate(null);
    }
  };

  const handleSelectCommunity = (tmpl: CommunityTemplate) => {
    if (nodes.length > 0) {
      const confirmed = window.confirm('This will replace your current diagram. Continue?');
      if (!confirmed) return;
    }

    try {
      const parsed = JSON.parse(tmpl.diagramJson);
      importDiagram(parsed);
      autoLayout();
      showToast(`Loaded community template: ${tmpl.name}`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to load community template data', 'error');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!visible) return null;

  const currentLoading = activeTab === 'builtin' ? isLoadingBuiltIn : isLoadingCommunity;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${
        animating ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl transition-all duration-200 ${
          animating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2.5">
            <LayoutTemplate size={22} className="text-primary" />
            <h2 className="font-display text-lg font-semibold">Diagram Templates</h2>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-2 hover:text-content"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col gap-3 px-6 pt-4">
          <div className="flex w-full rounded-xl bg-surface-2 p-1">
            <button
              onClick={() => setActiveTab('builtin')}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeTab === 'builtin'
                  ? 'bg-surface text-content shadow-sm'
                  : 'text-muted hover:text-content'
              }`}
            >
              Built-in Templates
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeTab === 'community'
                  ? 'bg-surface text-content shadow-sm'
                  : 'text-muted hover:text-content'
              }`}
            >
              🌍 Community Templates
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search templates by name, category, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input !pl-10"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-4">
          {currentLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
              <Package size={48} className="text-subtle opacity-30 animate-pulse" />
              Loading templates...
            </div>
          ) : activeTab === 'builtin' ? (
            filteredBuiltIn.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
                <LayoutTemplate size={48} className="text-subtle opacity-30" />
                {search ? `No templates match "${search}"` : 'No templates available'}
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
                {filteredBuiltIn.map((template, index) => {
                  const IconComponent = ICON_MAP[template.icon] || Package;
                  const categoryColor = CATEGORY_COLORS[template.category] || '#60a5fa';
                  const isLoadingTemplate = loadingTemplate === template.id;

                  return (
                    <button
                      key={`${template.id}-${index}`}
                      className="group relative flex h-56 flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleSelectBuiltIn(template.id, template.name)}
                      disabled={isLoadingTemplate}
                      style={{ borderColor: 'var(--c-border)' }}
                    >
                      <span
                        className="absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ background: categoryColor }}
                      />

                      <div className="flex items-start justify-between">
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-xl"
                          style={{
                            background: `color-mix(in srgb, ${categoryColor} 12%, transparent)`,
                            color: categoryColor,
                          }}
                        >
                          <IconComponent size={28} />
                        </span>
                        <span
                          className="rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider"
                          style={{
                            background: `color-mix(in srgb, ${categoryColor} 12%, transparent)`,
                            color: categoryColor,
                          }}
                        >
                          {template.category}
                        </span>
                      </div>

                      <div className="mt-4 flex-1">
                        <h3 className="font-display text-base font-semibold text-content">{template.name}</h3>
                        <p className="mt-1 line-clamp-3 text-sm text-muted">{template.description}</p>
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-content">{template.entityCount}</span>
                          <span className="text-xs text-muted">
                            {template.entityCount === 1 ? 'entity' : 'entities'}
                          </span>
                        </div>
                        {isLoadingTemplate && (
                          <div className="flex items-center gap-1.5 text-xs text-primary">
                            <Loader2 size={13} className="animate-spin" />
                            <span>Loading...</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : filteredCommunity.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
              <Globe size={48} className="text-subtle opacity-30" />
              <span>No community templates yet.</span>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
              {filteredCommunity.map((template) => {
                const IconComponent = ICON_MAP[template.icon || 'Package'] || Package;
                const categoryColor = CATEGORY_COLORS[template.category || 'General'] || '#60a5fa';

                return (
                  <button
                    key={template.id}
                    className="group relative flex h-56 flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                    onClick={() => handleSelectCommunity(template)}
                    style={{ borderColor: 'var(--c-border)' }}
                  >
                    <span
                      className="absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ background: categoryColor }}
                    />

                    <div className="flex items-start justify-between">
                      <span
                        className="flex h-14 w-14 items-center justify-center rounded-xl"
                        style={{
                          background: `color-mix(in srgb, ${categoryColor} 12%, transparent)`,
                          color: categoryColor,
                        }}
                      >
                        <IconComponent size={28} />
                      </span>
                      <span
                        className="rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider"
                        style={{
                          background: `color-mix(in srgb, ${categoryColor} 12%, transparent)`,
                          color: categoryColor,
                        }}
                      >
                        {template.category || 'Community'}
                      </span>
                    </div>

                    <div className="mt-4 flex-1">
                      <h3 className="font-display text-base font-semibold text-content">{template.name}</h3>
                      {template.description && (
                        <p className="mt-1 line-clamp-3 text-sm text-muted">{template.description}</p>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-content">{template.entityCount}</span>
                        <span className="text-xs text-muted">
                          {template.entityCount === 1 ? 'entity' : 'entities'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-primary">Use Template</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
