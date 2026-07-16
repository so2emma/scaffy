import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, LayoutTemplate, ShoppingCart, Building2, Users, FileText, Package } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { useDiagramStore } from '../store/useDiagramStore';
import { useToast } from '../hooks/useToast';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Commerce': '#4ade80',
  'Platform': '#38bdf8',
  'Social': '#e879f9',
  'Content': '#fb923c',
};

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'ShoppingCart': ShoppingCart,
  'Building2': Building2,
  'Users': Users,
  'FileText': FileText,
  'Package': Package,
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
    // Check if canvas has entities and show confirmation
    if (nodes.length > 0) {
      const confirmed = window.confirm(
        'This will replace your current diagram. Continue?'
      );
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
    if (e.target === e.currentTarget) {
      onClose();
    }
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
      className={`framework-modal-overlay ${animating ? 'open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`framework-modal ${animating ? 'open' : ''}`}>
        {/* Header */}
        <div className="framework-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutTemplate size={24} style={{ color: 'var(--primary)' }} />
            <h2 className="framework-modal-title">Diagram Templates</h2>
          </div>
          <button className="framework-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="framework-modal-search">
          <Search size={16} className="framework-modal-search-icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search templates by name, category, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="framework-modal-search-input"
          />
        </div>

        {/* Content */}
        <div className="framework-modal-content">
          {isLoading ? (
            <div className="framework-modal-empty">
              <div style={{ marginBottom: '12px' }}>
                <Package size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              </div>
              Loading templates...
            </div>
          ) : filtered.length === 0 ? (
            <div className="framework-modal-empty">
              <div style={{ marginBottom: '12px' }}>
                <LayoutTemplate size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              </div>
              {search ? `No templates match "${search}"` : 'No templates available'}
            </div>
          ) : (
            <div className="template-gallery-grid">
              {filtered.map((template, index) => {
                const IconComponent = ICON_MAP[template.icon] || Package;
                const categoryColor = CATEGORY_COLORS[template.category] || '#60a5fa';
                const isLoadingTemplate = loadingTemplate === template.id;

                return (
                  <button
                    key={`${template.id}-${index}`}
                    className="template-card"
                    onClick={() => handleSelectTemplate(template.id, template.name)}
                    disabled={isLoadingTemplate}
                    style={{
                      '--template-color': categoryColor,
                      '--template-color-rgb': hexToRgb(categoryColor),
                    } as React.CSSProperties}
                  >
                    {/* Gradient overlay on hover */}
                    <div className="template-card-overlay" />
                    
                    {/* Icon and category badge */}
                    <div className="template-card-top">
                      <div className="template-card-icon-wrapper">
                        <IconComponent size={32} className="template-card-icon" />
                      </div>
                      <div className="template-card-category-badge">
                        {template.category}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="template-card-content">
                      <h3 className="template-card-title">{template.name}</h3>
                      <p className="template-card-desc">{template.description}</p>
                    </div>

                    {/* Footer with entity count */}
                    <div className="template-card-footer">
                      <div className="template-card-meta">
                        <div className="template-card-entity-count">
                          <span className="entity-count-number">{template.entityCount}</span>
                          <span className="entity-count-label">
                            {template.entityCount === 1 ? 'entity' : 'entities'}
                          </span>
                        </div>
                      </div>
                      {isLoadingTemplate && (
                        <div className="template-card-loading">
                          <span className="loading-spinner" />
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

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255, 255, 255';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
