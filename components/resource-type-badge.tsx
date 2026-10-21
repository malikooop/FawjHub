import { cn } from '@/lib/utils';
import type { ResourceType } from '@/lib/types';

interface ResourceTypeBadgeProps {
  type: ResourceType;
  label: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Presentation-only tones. Four restrained groups instead of one      */
/* color per type, all built on the navy/blue system:                  */
/*   course     -> primary blue tint                                   */
/*   practical  -> neutral surface (TD / TP / anything unrecognized)   */
/*   exam       -> navy fill, the strongest mark                       */
/*   correction -> muted green tint                                    */
/* The resource type value itself is never changed.                    */
/* ------------------------------------------------------------------ */

const TONES = {
  course:
    'border-primary/20 bg-primary/10 text-primary dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300',
  practical:
    'border-border bg-muted text-foreground/80',
  exam:
    'border-navy bg-navy text-navy-foreground dark:border-brand-cyan/30 dark:text-brand-cyan',
  correction:
    'border-emerald-600/20 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300',
} as const;

type Tone = keyof typeof TONES;

function getTone(type: ResourceType): Tone {
  const key = String(type ?? '').toLowerCase();

  // Order matters: a "correction" of an exam is still a correction.
  if (/correct/.test(key)) return 'correction';
  if (/exam/.test(key)) return 'exam';
  if (/course|cours|lecture/.test(key)) return 'course';

  // TD, TP, and any unknown value fall back to the neutral tone.
  return 'practical';
}

export function ResourceTypeBadge({ type, label, className }: ResourceTypeBadgeProps) {
  return (
    <span
      dir="auto"
      className={cn(
        'inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded border px-1.5',
        'text-[11px] font-semibold leading-none',
        TONES[getTone(type)],
        className
      )}
    >
      {label}
    </span>
  );
}