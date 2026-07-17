import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export interface ValidationError {
  type: string;
  target: string;
  property?: string;
  message: string;
}

interface ValidationErrorsProps {
  errors: ValidationError[];
  onErrorClick?: (entityName: string) => void;
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({ errors, onErrorClick }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!errors || errors.length === 0) return null;

  return (
    <div className="scroll-thin absolute bottom-5 left-5 z-[8] flex max-h-64 w-[min(28rem,calc(100%-2.5rem))] flex-col gap-2.5 overflow-y-auto rounded-xl border border-danger/30 bg-surface/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between text-sm font-bold text-danger">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} />
          <span>Validation Issues ({errors.length})</span>
        </div>
        <button
          className="cursor-pointer rounded p-0.5 hover:bg-danger/10 text-danger transition-colors outline-none"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand validation panel" : "Collapse validation panel"}
        >
          {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {!isCollapsed && (
        <ul className="flex flex-col gap-1.5 text-xs text-muted">
          {errors.map((error, idx) => (
            <li
              key={idx}
              onClick={() => onErrorClick?.(error.target)}
              className="relative pl-4 pr-1 py-0.5 rounded cursor-pointer hover:bg-surface-2 hover:text-content transition-colors before:absolute before:left-1 before:text-danger before:content-['•']"
            >
              <strong className="text-content">[{error.type}]</strong> {error.target}
              {error.property ? ` (field: ${error.property})` : ''}: {error.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
