import { create } from 'zustand';
import { autoSaveCurrentProjectToCloud } from '../utils/cloudSave';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  currentProjectId: string | null;
  currentProjectName: string | null;
  isCloudSaved: boolean;       // true if diagram matches last cloud save
  lastCloudSaveTime: Date | null;
  isAuthModalOpen: boolean;
  pendingAction: (() => void) | null;

  setUser: (user: AuthUser | null) => void;
  setCurrentProject: (id: string | null, name: string | null) => void;
  setIsCloudSaved: (saved: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setPendingAction: (action: (() => void) | null) => void;
  triggerRequireAuth: (action: () => void) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const API = 'http://localhost:8080';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  currentProjectId: null,
  currentProjectName: null,
  isCloudSaved: false,
  lastCloudSaveTime: null,
  isAuthModalOpen: false,
  pendingAction: null,

  setUser: (user) => {
    set({ user });
    const pending = get().pendingAction;
    if (user && pending) {
      set({ pendingAction: null });
      setTimeout(async () => {
        await autoSaveCurrentProjectToCloud();
        pending();
      }, 200);
    }
  },

  setCurrentProject: (id, name) => set({ currentProjectId: id, currentProjectName: name }),
  setIsCloudSaved: (saved) => set({ isCloudSaved: saved, lastCloudSaveTime: saved ? new Date() : get().lastCloudSaveTime }),
  setIsAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  setPendingAction: (action) => set({ pendingAction: action }),

  triggerRequireAuth: (action) => {
    const user = get().user;
    if (user) {
      (async () => {
        await autoSaveCurrentProjectToCloud();
        action();
      })();
    } else {
      set({ pendingAction: action, isAuthModalOpen: true });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        set({ user, isLoading: false });
        const pending = get().pendingAction;
        if (pending) {
          set({ pendingAction: null });
          setTimeout(async () => {
            await autoSaveCurrentProjectToCloud();
            pending();
          }, 200);
        }
      } else {
        set({ user: null, isLoading: false });
      }
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  logout: async () => {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    set({ user: null, currentProjectId: null, currentProjectName: null, isCloudSaved: false, pendingAction: null });
  },
}));
