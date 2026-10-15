'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message, className }: { message?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message ?? t('common.loading')}</p>
    </div>
  );
}

export function ErrorState({ message, className }: { message?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-16', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <span className="text-destructive text-xl">!</span>
      </div>
      <p className="text-sm text-muted-foreground">{message ?? t('common.error')}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
