import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ValidationError {
  type: string;
  target: string;
  property?: string;
  message: string;
}

interface ValidationErrorsProps {
  errors: ValidationError[];
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({ errors }) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="scroll-thin absolute bottom-5 left-5 z-[8] flex max-h-64 w-[min(28rem,calc(100%-2.5rem))] flex-col gap-2.5 overflow-y-auto rounded-xl border border-danger/30 bg-surface/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-bold text-danger">
        <AlertCircle size={16} />
        <span>Validation Issues ({errors.length})</span>
      </div>
      <ul className="flex flex-col gap-1.5 text-xs text-muted">
        {errors.map((error, idx) => (
          <li key={idx} className="relative pl-3 before:absolute before:left-0 before:text-danger before:content-['•']">
            <strong className="text-content">[{error.type}]</strong> {error.target}
            {error.property ? ` (field: ${error.property})` : ''}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
};
