'use client';

import React, { useEffect, useCallback } from 'react';
import { useToastStore, Toast } from '../hooks/useToast';
import { CheckCircle, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const accentMap: Record<Toast['type'], string> = {
  success: 'border-l-primary text-primary',
  error: 'border-l-danger text-danger',
  warning: 'border-l-amber-500 text-amber-500',
  info: 'border-l-sky-500 text-sky-500',
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((state) => state.removeToast);

  const handleDismiss = useCallback(() => {
    removeToast(toast.id);
  }, [toast.id, removeToast]);

  useEffect(() => {
    const timer = setTimeout(handleDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, handleDismiss]);

  const Icon = iconMap[toast.type];

  return (
    <div
      className={`animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border border-l-[3px] border-border bg-surface p-3 shadow-lg ${accentMap[toast.type]}`}
      role="alert"
    >
      <div className="mt-px flex shrink-0 items-center justify-center">
        <Icon size={18} />
      </div>
      <span className="flex-1 break-words text-sm leading-snug text-content">{toast.message}</span>
      <button
        className="-mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-content"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export const ToastProvider: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[99999] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
