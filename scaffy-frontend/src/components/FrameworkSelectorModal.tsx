import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';

export interface FrameworkOption {
  id: string;
  displayName: string;
  language: string;
  description: string;
  color: string;
}

export const AVAILABLE_FRAMEWORKS: FrameworkOption[] = [
  { id: 'SPRING_BOOT', displayName: 'Spring Boot', language: 'Java', description: 'Maven · JPA · Hibernate', color: '#4ade80' },
  { id: 'EXPRESS', displayName: 'Express TS', language: 'TypeScript', description: 'Node.js · Prisma', color: '#38bdf8' },
  { id: 'FASTAPI', displayName: 'FastAPI', language: 'Python', description: 'SQLAlchemy · Pydantic', color: '#fb923c' },
  { id: 'NESTJS', displayName: 'NestJS', language: 'TypeScript', description: 'TypeORM · Class-Validator', color: '#e879f9' },
  { id: 'DJANGO_REST', displayName: 'Django REST', language: 'Python', description: 'Django ORM · DRF Serializers', color: '#f59e0b' },
  { id: 'LARAVEL', displayName: 'Laravel', language: 'PHP', description: 'Eloquent · Blade', color: '#f43f5e' },
  { id: 'GIN', displayName: 'Gin (Go)', language: 'Go', description: 'GORM · Gin Router', color: '#34d399' },
  { id: 'RAILS', displayName: 'Ruby on Rails', language: 'Ruby', description: 'ActiveRecord · ActionController', color: '#f87171' },
];

const LANGUAGE_ORDER = ['Java', 'TypeScript', 'Python', 'PHP', 'Go', 'Ruby'];

interface FrameworkSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  frameworks?: FrameworkOption[];
  selectedFramework: string;
  onSelect: (frameworkId: string) => void;
}

export const FrameworkSelectorModal: React.FC<FrameworkSelectorModalProps> = ({
  isOpen,
  onClose,
  frameworks = AVAILABLE_FRAMEWORKS,
  selectedFramework,
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
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
    if (!search.trim()) return frameworks;
    const q = search.toLowerCase();
    return frameworks.filter(
      (fw) =>
        fw.displayName.toLowerCase().includes(q) ||
        fw.language.toLowerCase().includes(q) ||
        fw.description.toLowerCase().includes(q)
    );
  }, [search, frameworks]);

  const grouped = useMemo(() => {
    const groups: Record<string, FrameworkOption[]> = {};
    for (const fw of filtered) {
      if (!groups[fw.language]) groups[fw.language] = [];
      groups[fw.language].push(fw);
    }
    // Sort by predefined language order
    const sorted: [string, FrameworkOption[]][] = [];
    for (const lang of LANGUAGE_ORDER) {
      if (groups[lang]) sorted.push([lang, groups[lang]]);
    }
    // Add any languages not in the predefined order
    for (const lang of Object.keys(groups)) {
      if (!LANGUAGE_ORDER.includes(lang)) sorted.push([lang, groups[lang]]);
    }
    return sorted;
  }, [filtered]);

  const handleSelect = (frameworkId: string) => {
    onSelect(frameworkId);
    onClose();
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
          <h2 className="framework-modal-title">Select Framework</h2>
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
            placeholder="Search frameworks by name, language, or stack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="framework-modal-search-input"
          />
        </div>

        {/* Content */}
        <div className="framework-modal-content">
          {grouped.length === 0 ? (
            <div className="framework-modal-empty">
              No frameworks match &ldquo;{search}&rdquo;
            </div>
          ) : (
            grouped.map(([language, fws]) => (
              <div key={language} className="framework-modal-group">
                <h3 className="framework-modal-group-title">{language}</h3>
                <div className="framework-modal-grid">
                  {fws.map((fw) => {
                    const isActive = selectedFramework === fw.id;
                    return (
                      <button
                        key={fw.id}
                        className={`framework-card ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelect(fw.id)}
                        style={{
                          '--fw-color': fw.color,
                          '--fw-color-rgb': hexToRgb(fw.color),
                        } as React.CSSProperties}
                      >
                        <div className="framework-card-top">
                          <span className="framework-card-dot" />
                          <span className="framework-card-name">{fw.displayName}</span>
                          {isActive && <span className="framework-card-badge">Active</span>}
                        </div>
                        <span className="framework-card-desc">{fw.description}</span>
                        <span className="framework-card-lang">{fw.language}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
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
