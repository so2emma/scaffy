import { create } from 'zustand';

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

  setUser: (user: AuthUser | null) => void;
  setCurrentProject: (id: string | null, name: string | null) => void;
  setIsCloudSaved: (saved: boolean) => void;
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

  setUser: (user) => set({ user }),
  setCurrentProject: (id, name) => set({ currentProjectId: id, currentProjectName: name }),
  setIsCloudSaved: (saved) => set({ isCloudSaved: saved, lastCloudSaveTime: saved ? new Date() : get().lastCloudSaveTime }),

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        set({ user, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  logout: async () => {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    set({ user: null, currentProjectId: null, currentProjectName: null, isCloudSaved: false });
  },
}));
