import React, { useState, useEffect } from 'react';
import { X, Database, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../hooks/useToast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

const API = 'http://localhost:8080';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
      setApiError(null);
      setFieldErrors({});
    } else {
      setAnimating(false);
      const timer = setTimeout(() => {
        setVisible(false);
        setEmail('');
        setUsername('');
        setPassword('');
        setFieldErrors({});
        setApiError(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (activeTab === 'register') {
      if (!username.trim()) {
        errors.username = 'Username is required';
      } else if (username.length < 3 || username.length > 20) {
        errors.username = 'Username must be between 3 and 20 characters';
      }
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const endpoint = activeTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = activeTab === 'login' ? { email, password } : { email, username, password };

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || 'Authentication failed. Please check your credentials.');
        return;
      }

      await useAuthStore.getState().checkAuth();
      onClose();

      if (activeTab === 'register') {
        showToast('Account created! Welcome to Scaffy.', 'success');
      } else {
        showToast(`Welcome back, ${data.username || username || 'User'}!`, 'success');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setApiError('Unable to connect to server. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${
        animating ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all duration-200 ${
          animating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Close Button */}
        <button
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-2 hover:text-content"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Database size={26} />
          </span>
          <h2 className="font-display text-xl font-bold tracking-tight">Scaffy</h2>
          <p className="text-xs text-muted">Cloud diagram storage & framework code generator</p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex rounded-xl bg-surface-2 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'login'
                ? 'bg-surface text-content shadow-sm'
                : 'text-muted hover:text-content'
            }`}
            onClick={() => {
              setActiveTab('login');
              setApiError(null);
              setFieldErrors({});
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'register'
                ? 'bg-surface text-content shadow-sm'
                : 'text-muted hover:text-content'
            }`}
            onClick={() => {
              setActiveTab('register');
              setApiError(null);
              setFieldErrors({});
            }}
          >
            Create Account
          </button>
        </div>

        {/* API Error Banner */}
        {apiError && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
            {apiError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="field-label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
            {fieldErrors.email && (
              <span className="text-[0.7rem] text-red-500">{fieldErrors.email}</span>
            )}
          </div>

          {activeTab === 'register' && (
            <div className="flex flex-col gap-1">
              <label className="field-label">Username</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                disabled={isSubmitting}
              />
              {fieldErrors.username && (
                <span className="text-[0.7rem] text-red-500">{fieldErrors.username}</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="field-label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isSubmitting}
            />
            {fieldErrors.password && (
              <span className="text-[0.7rem] text-red-500">{fieldErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full py-2.5"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{activeTab === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
              </>
            ) : activeTab === 'login' ? (
              <>
                <LogIn size={16} />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-content hover:underline"
          >
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
};
