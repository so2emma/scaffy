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
    <div className={`toast toast-${toast.type}`} role="alert">
      <div className="toast-icon">
        <Icon size={18} />
      </div>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={handleDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

export const ToastProvider: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
