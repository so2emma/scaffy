import React, { useState, useEffect } from 'react';
import {
  X, LayoutTemplate, Plus, Globe, User, Package, ShoppingCart, Building2, Users, FileText,
  Stethoscope, KanbanSquare, Hotel, GraduationCap, MoreVertical, Edit2, Trash2, Loader2, Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useToast } from '../hooks/useToast';

interface UserTemplatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplateItem {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  diagramJson: string;
  entityCount: number;
  isPublic: boolean;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  'Commerce',
  'Platform',
  'Social',
  'Content',
  'Healthcare',
  'Productivity',
  'Hospitality',
  'Education',
  'SaaS',
  'General',
];

const ICON_OPTIONS = [
  'Package',
  'ShoppingCart',
  'Building2',
  'Users',
  'FileText',
  'Stethoscope',
  'KanbanSquare',
  'Hotel',
  'GraduationCap',
];

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Package,
  ShoppingCart,
  Building2,
  Users,
  FileText,
  Stethoscope,
  KanbanSquare,
  Hotel,
  GraduationCap,
};

const CATEGORY_COLORS: Record<string, string> = {
  Commerce: '#4ade80',
  Platform: '#38bdf8',
  Social: '#e879f9',
  Content: '#fb923c',
  Healthcare: '#f87171',
  Productivity: '#a78bfa',
  Hospitality: '#22d3ee',
  Education: '#fbbf24',
  SaaS: '#6366f1',
  General: '#94a3b8',
};

const API = 'http://localhost:8080';

export const UserTemplatesPanel: React.FC<UserTemplatesPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { getDiagramSchema, importDiagram, autoLayout, nodes } = useDiagramStore();
  const { showToast } = useToast();

  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState<'mine' | 'community'>('mine');
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Save template dialog
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [tmplName, setTmplName] = useState('');
  const [tmplDesc, setTmplDesc] = useState('');
  const [tmplCategory, setTmplCategory] = useState('General');
  const [tmplIcon, setTmplIcon] = useState('Package');
  const [tmplIsPublic, setTmplIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Menu dropdown for template cards
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
      fetchTemplates(activeTab);
    } else {
      setAnimating(false);
      const timer = setTimeout(() => {
        setVisible(false);
        setOpenMenuId(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  const fetchTemplates = async (tab: 'mine' | 'community') => {
    setIsLoading(true);
    try {
      const endpoint = tab === 'mine' ? '/api/user-templates' : '/api/user-templates/community';
      const res = await fetch(`${API}${endpoint}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load templates', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTemplate = (tmpl: TemplateItem) => {
    if (nodes.length > 0) {
      const confirmed = window.confirm('This will replace your current diagram. Continue?');
      if (!confirmed) return;
    }

    try {
      const parsed = JSON.parse(tmpl.diagramJson);
      importDiagram(parsed);
      autoLayout();
      showToast(`Loaded template: ${tmpl.name}`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to parse template data', 'error');
    }
  };

  const handleSaveAsTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to save a template', 'warning');
      return;
    }
    if (!tmplName.trim()) return;

    setIsSubmitting(true);
    try {
      const schema = getDiagramSchema();
      const res = await fetch(`${API}/api/user-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: tmplName,
          description: tmplDesc,
          category: tmplCategory,
          icon: tmplIcon,
          diagramJson: JSON.stringify(schema),
          entityCount: schema.entities?.length ?? 0,
          isPublic: tmplIsPublic,
        }),
      });

      if (res.ok) {
        showToast('Template saved successfully!', 'success');
        setIsSaveModalOpen(false);
        fetchTemplates(activeTab);
      } else {
        showToast('Failed to save template', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving template', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublic = async (tmpl: TemplateItem) => {
    setOpenMenuId(null);
    try {
      const res = await fetch(`${API}/api/user-templates/${tmpl.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublic: !tmpl.isPublic }),
      });
      if (res.ok) {
        showToast(
          `Template ${!tmpl.isPublic ? 'published to community' : 'set to private'}`,
          'info'
        );
        fetchTemplates(activeTab);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update template', 'error');
    }
  };

  const handleDeleteTemplate = async (tmpl: TemplateItem) => {
    setOpenMenuId(null);
    if (!window.confirm(`Delete template "${tmpl.name}"?`)) return;

    try {
      const res = await fetch(`${API}/api/user-templates/${tmpl.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        showToast('Template deleted', 'info');
        setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete template', 'error');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          animating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Main Slide-over Panel */}
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-accent/30 bg-surface shadow-2xl transition-transform duration-300 ${
          animating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-border bg-surface-2 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <LayoutTemplate size={22} className="text-accent" />
            <h2 className="font-display text-lg font-semibold tracking-tight text-content">Templates</h2>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={() => {
                  const schema = getDiagramSchema();
                  setTmplName(schema.projectName || 'My Template');
                  setTmplDesc('');
                  setTmplCategory('General');
                  setTmplIcon('Package');
                  setTmplIsPublic(false);
                  setIsSaveModalOpen(true);
                }}
                className="btn btn-accent !py-2 !px-4 !text-sm shadow-md transition-all duration-200 hover:shadow-lg"
              >
                <Plus size={15} />
                <span>Save as Template</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted shadow-sm transition-all duration-200 hover:bg-surface-2 hover:text-accent hover:scale-105"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border bg-surface-2 px-4 py-3">
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold shadow-sm transition-all duration-200 ${
              activeTab === 'mine'
                ? 'bg-accent text-white scale-105'
                : 'text-muted hover:bg-surface-3 hover:text-content'
            }`}
          >
            My Templates
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold shadow-sm transition-all duration-200 ${
              activeTab === 'community'
                ? 'bg-accent text-white scale-105'
                : 'text-muted hover:bg-surface-3 hover:text-content'
            }`}
          >
            🌍 Community
          </button>
        </div>

        {/* Template Grid */}
        <div className="scroll-thin flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
              <Loader2 size={28} className="animate-spin text-accent" />
              <span className="font-medium">Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-sm text-muted">
              <Package size={48} className="text-subtle opacity-30" />
              <span className="font-medium">
                {activeTab === 'mine'
                  ? 'You haven\'t saved any custom templates yet.'
                  : 'No community templates published yet.'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {templates.map((tmpl) => {
                const IconComp = ICON_MAP[tmpl.icon || 'Package'] || Package;
                const catColor = CATEGORY_COLORS[tmpl.category || 'General'] || '#60a5fa';

                return (
                  <div
                    key={tmpl.id}
                    className="card card-hover group relative flex flex-col rounded-xl border border-border bg-surface p-5 shadow-md transition-all duration-200 hover:shadow-lg"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-110"
                          style={{
                            background: `color-mix(in srgb, ${catColor} 15%, transparent)`,
                            color: catColor,
                          }}
                        >
                          <IconComp size={20} />
                        </span>
                        <div>
                          <h3 className="font-display text-base font-semibold tracking-tight text-content transition-colors duration-200 group-hover:text-accent">
                            {tmpl.name}
                          </h3>
                          <span
                            className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider shadow-sm"
                            style={{
                              background: `color-mix(in srgb, ${catColor} 12%, transparent)`,
                              color: catColor,
                            }}
                          >
                            {tmpl.category || 'General'}
                          </span>
                        </div>
                      </div>

                      {activeTab === 'mine' && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === tmpl.id ? null : tmpl.id);
                            }}
                            className="rounded-lg p-1.5 text-muted transition-all duration-200 hover:bg-surface-2 hover:text-accent"
                          >
                            <MoreVertical size={17} />
                          </button>

                          {openMenuId === tmpl.id && (
                            <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
                              <button
                                type="button"
                                onClick={() => handleTogglePublic(tmpl)}
                                className="card card-hover flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-content transition-all duration-200"
                              >
                                <Globe size={15} />
                                <span>{tmpl.isPublic ? 'Make Private' : 'Make Public'}</span>
                              </button>
                              <div className="my-1.5 border-t border-border" />
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(tmpl)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-500 transition-all duration-200 hover:bg-red-500/10"
                              >
                                <Trash2 size={15} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {tmpl.description && (
                      <p className="mt-3 text-sm leading-relaxed text-muted line-clamp-2">{tmpl.description}</p>
                    )}

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                      <div className="flex items-center gap-2.5 text-[0.75rem] text-muted">
                        <span className="font-medium">{tmpl.entityCount} entities</span>
                        {tmpl.isPublic && (
                          <span className="flex items-center gap-1 text-accent">
                            <Globe size={12} /> Public
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUseTemplate(tmpl)}
                        className="btn btn-accent !py-1.5 !px-4 !text-sm shadow-sm transition-all duration-200 hover:shadow-md"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Save Template Dialog */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="font-display text-lg font-semibold tracking-tight text-content">Save as Template</h3>
            <form onSubmit={handleSaveAsTemplateSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="field-label mb-2 text-sm font-semibold">Template Name</label>
                <input
                  type="text"
                  className="input transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label mb-2 text-sm font-semibold">Description</label>
                <textarea
                  className="input min-h-[70px] transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
                  value={tmplDesc}
                  onChange={(e) => setTmplDesc(e.target.value)}
                  placeholder="Describe your template structure..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label mb-2 text-sm font-semibold">Category</label>
                  <select
                    className="input transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label mb-2 text-sm font-semibold">Icon</label>
                  <select
                    className="input transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
                    value={tmplIcon}
                    onChange={(e) => setTmplIcon(e.target.value)}
                  >
                    {ICON_OPTIONS.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-lg p-2 text-sm font-medium text-content transition-all duration-200 hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={tmplIsPublic}
                  onChange={(e) => setTmplIsPublic(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-accent transition-transform duration-200 hover:scale-110"
                />
                <span>Publish to Community (visible to everyone)</span>
              </label>

              <div className="mt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="btn btn-secondary !py-2 !px-4 !text-sm shadow-sm transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-accent !py-2 !px-4 !text-sm shadow-md transition-all duration-200 hover:shadow-lg"
                >
                  {isSubmitting ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
