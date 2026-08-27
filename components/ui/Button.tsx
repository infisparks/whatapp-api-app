import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'whatsapp';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs font-medium rounded-lg h-8 gap-1.5',
      md: 'px-4 py-2 text-sm font-medium rounded-lg h-10 gap-2',
      lg: 'px-5 py-2.5 text-base font-semibold rounded-lg h-12 gap-2.5',
    };

    const variantClasses = {
      primary:
        'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border border-transparent focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 focus:ring-2 focus:ring-slate-400',
      outline:
        'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 focus:ring-2 focus:ring-indigo-500',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-transparent focus:ring-2 focus:ring-rose-500',
      ghost:
        'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-transparent',
      whatsapp:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-transparent focus:ring-2 focus:ring-emerald-500',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
