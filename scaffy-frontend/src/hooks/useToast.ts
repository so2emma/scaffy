import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 4;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, type = 'info', duration?: number) => {
    const defaultDuration = type === 'error' ? 5000 : 3000;
    const toast: Toast = {
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      message,
      type,
      duration: duration ?? defaultDuration,
    };
    set((state) => {
      const updated = [...state.toasts, toast];
      // Keep only the most recent MAX_TOASTS
      if (updated.length > MAX_TOASTS) {
        return { toasts: updated.slice(updated.length - MAX_TOASTS) };
      }
      return { toasts: updated };
    });
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export function useToast() {
  const showToast = useToastStore((state) => state.showToast);
  return { showToast };
}
