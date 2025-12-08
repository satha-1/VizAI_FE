import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface AuthCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  error?: string;
}

export const AuthCheckbox = forwardRef<HTMLInputElement, AuthCheckboxProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        <label
          htmlFor={checkboxId}
          className={`flex items-start gap-3 cursor-pointer ${className}`}
        >
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={`
              mt-0.5 w-4 h-4 rounded border-slate-300 
              text-primary focus:ring-primary focus:ring-2
              ${error ? 'border-red-500' : ''}
            `}
            {...props}
          />
          <span className="text-sm text-charcoal">{label}</span>
        </label>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

AuthCheckbox.displayName = 'AuthCheckbox';

