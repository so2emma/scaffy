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
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-300 ${
          animating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={20} className="text-primary" />
            <h2 className="font-display text-base font-semibold text-content">Templates</h2>
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
                className="btn btn-primary !py-1.5 !text-xs"
              >
                <Plus size={14} />
                <span>Save as Template</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 hover:text-content"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface-2 px-4 py-2">
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'mine'
                ? 'bg-surface text-content shadow-sm'
                : 'text-muted hover:text-content'
            }`}
          >
            My Templates
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'community'
                ? 'bg-surface text-content shadow-sm'
                : 'text-muted hover:text-content'
            }`}
          >
            🌍 Community
          </button>
        </div>

        {/* Template Grid */}
        <div className="scroll-thin flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-xs text-muted">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="mt-2">Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-xs text-muted">
              <Package size={40} className="text-subtle opacity-30" />
              <span>
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
                    className="group relative flex flex-col rounded-xl border border-border bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{
                            background: `color-mix(in srgb, ${catColor} 15%, transparent)`,
                            color: catColor,
                          }}
                        >
                          <IconComp size={18} />
                        </span>
                        <div>
                          <h3 className="font-display text-sm font-semibold text-content">
                            {tmpl.name}
                          </h3>
                          <span
                            className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider"
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
                            className="p-1 text-muted transition-colors hover:text-content"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === tmpl.id && (
                            <div className="absolute right-0 top-6 z-30 w-40 rounded-xl border border-border bg-surface p-1 shadow-xl">
                              <button
                                type="button"
                                onClick={() => handleTogglePublic(tmpl)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-content hover:bg-surface-2"
                              >
                                <Globe size={14} />
                                <span>{tmpl.isPublic ? 'Make Private' : 'Make Public'}</span>
                              </button>
                              <div className="my-1 border-t border-border" />
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(tmpl)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-red-500 hover:bg-red-500/10"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {tmpl.description && (
                      <p className="mt-2 text-xs text-muted line-clamp-2">{tmpl.description}</p>
                    )}

                    {/* Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <div className="flex items-center gap-2 text-[0.7rem] text-muted">
                        <span>{tmpl.entityCount} entities</span>
                        {tmpl.isPublic && (
                          <span className="flex items-center gap-1 text-primary">
                            <Globe size={11} /> Public
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUseTemplate(tmpl)}
                        className="btn btn-primary !py-1 !px-3 !text-xs"
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
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="font-display text-base font-semibold text-content">Save as Template</h3>
            <form onSubmit={handleSaveAsTemplateSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="field-label">Template Name</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="field-label">Description</label>
                <textarea
                  className="input mt-1 min-h-[60px]"
                  value={tmplDesc}
                  onChange={(e) => setTmplDesc(e.target.value)}
                  placeholder="Describe your template structure..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Category</label>
                  <select
                    className="input mt-1"
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
                  <label className="field-label">Icon</label>
                  <select
                    className="input mt-1"
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

              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-content">
                <input
                  type="checkbox"
                  checked={tmplIsPublic}
                  onChange={(e) => setTmplIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span>Publish to Community (visible to everyone)</span>
              </label>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="btn btn-secondary !py-1.5 !text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary !py-1.5 !text-xs"
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
