import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type AuthButtonVariant = 'primary' | 'secondary';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AuthButtonVariant;
  isLoading?: boolean;
}

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ variant = 'primary', isLoading, disabled, children, className = '', ...props }, ref) => {
    const baseStyles = `
      w-full py-2.5 px-4 rounded-lg font-medium text-sm
      transition-all duration-150
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      flex items-center justify-center gap-2
    `;

    const variantStyles = {
      primary: `
        bg-gradient-to-r from-primary to-primary-light
        text-white
        hover:from-primary-dark hover:to-primary
        focus:ring-primary
      `,
      secondary: `
        bg-white
        text-primary
        border-2 border-primary
        hover:bg-primary/5
        focus:ring-primary
      `,
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

AuthButton.displayName = 'AuthButton';

