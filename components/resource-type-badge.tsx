import { cn } from '@/lib/utils';
import type { ResourceType } from '@/lib/types';
import { RESOURCE_TYPE_COLORS } from '@/lib/types';

interface ResourceTypeBadgeProps {
  type: ResourceType;
  label: string;
  className?: string;
}

export function ResourceTypeBadge({ type, label, className }: ResourceTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        RESOURCE_TYPE_COLORS[type],
        className
      )}
    >
      {label}
    </span>
  );
}
