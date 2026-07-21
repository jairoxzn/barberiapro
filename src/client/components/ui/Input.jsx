import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export const Input = forwardRef(function Input(
  { label, error, className, containerClassName, ...props },
  ref
) {
  return (
    <div className={containerClassName}>
      {label && <label className="label">{label}</label>}
      <input
        ref={ref}
        className={cn('input', error && 'border-red-400 focus:ring-red-500/20', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, className, containerClassName, ...props },
  ref
) {
  return (
    <div className={containerClassName}>
      {label && <label className="label">{label}</label>}
      <textarea
        ref={ref}
        className={cn('input min-h-[90px] resize-y', error && 'border-red-400', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, className, containerClassName, children, ...props },
  ref
) {
  return (
    <div className={containerClassName}>
      {label && <label className="label">{label}</label>}
      <select
        ref={ref}
        className={cn('input appearance-none pr-9', error && 'border-red-400', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});
