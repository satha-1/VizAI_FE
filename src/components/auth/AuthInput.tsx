import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightIcon?: ReactNode;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, rightIcon, id, className = '', ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-charcoal mb-1"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full rounded-lg border px-3 py-2 text-sm text-charcoal
              placeholder:text-gray-400
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${rightIcon ? 'pr-9' : ''}
              ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';

