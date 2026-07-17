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
    const sorted: [string, FrameworkOption[]][] = [];
    for (const lang of LANGUAGE_ORDER) {
      if (groups[lang]) sorted.push([lang, groups[lang]]);
    }
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
        className={`flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl transition-all duration-200 ${
          animating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="font-display text-lg font-semibold">Select Framework</h2>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-2 hover:text-content"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative px-6 py-4">
          <Search size={16} className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search frameworks by name, language, or stack..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !pl-10"
          />
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-6 pb-6">
          {grouped.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">
              No frameworks match &ldquo;{search}&rdquo;
            </div>
          ) : (
            grouped.map(([language, fws]) => (
              <div key={language} className="mb-5 last:mb-0">
                <h3 className="section-label mb-2.5">{language}</h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-2.5">
                  {fws.map((fw) => {
                    const isActive = selectedFramework === fw.id;
                    return (
                      <button
                        key={fw.id}
                        className="group relative flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                        onClick={() => handleSelect(fw.id)}
                        style={{
                          borderColor: isActive ? fw.color : 'var(--c-border)',
                          background: isActive
                            ? `color-mix(in srgb, ${fw.color} 7%, transparent)`
                            : 'var(--c-surface)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: fw.color }} />
                          <span className="text-sm font-semibold text-content">{fw.displayName}</span>
                          {isActive && (
                            <span
                              className="ml-auto rounded px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider"
                              style={{
                                color: fw.color,
                                background: `color-mix(in srgb, ${fw.color} 14%, transparent)`,
                              }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                        <span className="pl-[1.1rem] text-xs text-muted">{fw.description}</span>
                        <span className="pl-[1.1rem] text-[0.65rem] text-subtle">{fw.language}</span>
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
