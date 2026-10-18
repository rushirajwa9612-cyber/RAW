import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 24, className = '' }: SpinnerProps) {
  return <Loader2 className={`animate-spin-slow ${className}`} style={{ width: size, height: size }} />;
}

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      <Spinner size={32} className="text-[var(--accent)]" />
      <p className="mt-4 text-sm text-[var(--text-tertiary)]">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="mb-4 text-[var(--text-tertiary)]">{icon}</div>}
      <h3 className="text-lg font-display font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-[var(--text-tertiary)] max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
