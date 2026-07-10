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
    <div className="validation-banner">
      <div className="validation-header">
        <AlertCircle size={16} />
        <span>Validation Issues ({errors.length})</span>
      </div>
      <ul className="validation-list">
        {errors.map((error, idx) => (
          <li key={idx} className="validation-item">
            <strong>[{error.type}]</strong> {error.target}
            {error.property ? ` (field: ${error.property})` : ''}: {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
};
