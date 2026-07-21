import { cn } from '@/utils/cn';

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-left text-sm', className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800',
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }) {
  return (
    <td className={cn('border-b border-slate-50 px-5 py-3 dark:border-slate-800/60', className)}>
      {children}
    </td>
  );
}

export function Tr({ children, className, ...props }) {
  return (
    <tr
      className={cn('transition hover:bg-slate-50 dark:hover:bg-slate-800/40', className)}
      {...props}
    >
      {children}
    </tr>
  );
}
