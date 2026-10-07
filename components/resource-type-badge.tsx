import { cn } from '@/lib/utils';
import type { ResourceType } from '@/lib/types';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPE_COLORS } from '@/lib/types';

interface ResourceTypeBadgeProps {
  type: ResourceType;
  className?: string;
}

export function ResourceTypeBadge({ type, className }: ResourceTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        RESOURCE_TYPE_COLORS[type],
        className
      )}
    >
      {RESOURCE_TYPE_LABELS[type]}
    </span>
  );
}
