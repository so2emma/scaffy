import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { AVAILABLE_FRAMEWORKS } from './FrameworkSelectorModal';
import { useToast } from '../hooks/useToast';
import { Folder, LayoutTemplate, LogOut } from 'lucide-react';

interface UserMenuProps {
  onOpenProjects: () => void;
  onOpenTemplates: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenProjects, onOpenTemplates }) => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const targetFramework = useDiagramStore((state) => state.targetFramework);
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const framework = AVAILABLE_FRAMEWORKS.find((fw) => fw.id === targetFramework);
  const accentColor = framework?.color ?? '#16a34a';

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleSignOut = async () => {
    setIsOpen(false);
    await logout();
    showToast('Signed out', 'info');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold transition-transform active:scale-95"
        style={{
          background: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
          color: accentColor,
          border: `1.5px solid ${accentColor}`,
        }}
        title={user.username}
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-xl animate-in fade-in slide-in-from-top-2">
          {/* User Info Header */}
          <div className="flex items-center gap-3 border-b border-border bg-surface-2 p-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold"
              style={{
                background: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
                color: accentColor,
                border: `1.5px solid ${accentColor}`,
              }}
            >
              {initials}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-content">{user.username}</span>
              <span className="truncate text-xs text-muted">{user.email}</span>
            </div>
          </div>

          {/* Menu Links */}
          <div className="flex flex-col p-1.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenProjects();
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-content transition-colors hover:bg-surface-2"
            >
              <Folder size={15} className="text-primary" />
              <span>My Projects</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenTemplates();
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-content transition-colors hover:bg-surface-2"
            >
              <LayoutTemplate size={15} className="text-primary" />
              <span>My Templates</span>
            </button>

            <div className="my-1 border-t border-border" />

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
