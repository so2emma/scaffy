import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Search, LayoutTemplate, ShoppingCart, Building2, Users, FileText, Package, Loader2,
  Stethoscope, KanbanSquare, Hotel, GraduationCap,
} from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { useDiagramStore } from '../store/useDiagramStore';
import { useToast } from '../hooks/useToast';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({ isOpen, onClose }) => {
  const { templates, isLoading, fetchTemplateDiagram } = useTemplates();
  const { showToast } = useToast();
  const importDiagram = useDiagramStore((state) => state.importDiagram);
  const autoLayout = useDiagramStore((state) => state.autoLayout);
  const nodes = useDiagramStore((state) => state.nodes);

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
    } else {
      setAnimating(false);
      const timer = setTimeout(() => {
        setVisible(false);
        setSearch('');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [search, templates]);

  const handleSelectTemplate = async (templateId: string, templateName: string) => {
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

        {/* Search */}
        <div className="relative px-6 py-4">
          <Search size={16} className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search templates by name, category, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !pl-10"
          />
        </div>

        {/* Content */}
        <div className="scroll-thin flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
              <Package size={48} className="text-subtle opacity-30" />
              Loading templates...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted">
              <LayoutTemplate size={48} className="text-subtle opacity-30" />
              {search ? `No templates match "${search}"` : 'No templates available'}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
              {filtered.map((template, index) => {
                const IconComponent = ICON_MAP[template.icon] || Package;
                const categoryColor = CATEGORY_COLORS[template.category] || '#60a5fa';
                const isLoadingTemplate = loadingTemplate === template.id;

                return (
                  <button
                    key={`${template.id}-${index}`}
                    className="group relative flex h-56 flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => handleSelectTemplate(template.id, template.name)}
                    disabled={isLoadingTemplate}
                    style={{ borderColor: 'var(--c-border)' }}
                  >
                    {/* Top accent bar */}
                    <span
                      className="absolute inset-x-0 top-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ background: categoryColor }}
                    />

                    {/* Icon + category */}
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

                    {/* Content */}
                    <div className="mt-4 flex-1">
                      <h3 className="font-display text-base font-semibold text-content">{template.name}</h3>
                      <p className="mt-1 line-clamp-3 text-sm text-muted">{template.description}</p>
                    </div>

                    {/* Footer */}
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
          )}
        </div>
      </div>
    </div>
  );
};
