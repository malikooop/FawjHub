import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Subject } from '@/lib/types';
import { RESOURCE_TYPE_ORDER } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import * as Icons from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  resourceCount?: number;
  completedCount?: number;
}

/* ------------------------------------------------------------------ */
/* Presentation-only subject labels, keyed by the real subject slug.   */
/* Mirrors the homepage and resource-card mappings. Stored subject     */
/* records and slugs are never modified; unknown slugs fall back to    */
/* the stored name and code.                                           */
/* ------------------------------------------------------------------ */

const SUBJECT_CODES: Record<string, string> = {
  'information-systems': 'IS',
  'computer-architecture': 'ADO',
  'probability-statistics-1': 'PS1',
  'object-oriented-programming-1': 'OOP 1',
  'algorithms-data-structures-3': 'ASD 3',
  'project-management': 'PM',
  'numerical-methods': 'NM',
};

const SUBJECT_NAMES_AR: Record<string, string> = {
  'information-systems': 'نظم المعلومات',
  'computer-architecture': 'معمارية الحاسوب',
  'probability-statistics-1': 'الاحتمالات والإحصاء 1',
  'object-oriented-programming-1': 'البرمجة كائنية التوجه 1',
  'algorithms-data-structures-3': 'الخوارزميات وهياكل البيانات 3',
  'project-management': 'إدارة المشاريع',
  'numerical-methods': 'الطرق العددية',
};

export function SubjectCard({ subject, resourceCount, completedCount }: SubjectCardProps) {
  const { t, locale } = useI18n();
  const Icon = (Icons[subject.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ?? Icons.BookOpen;

  const hasCount = resourceCount !== undefined;
  const showProgress = hasCount && completedCount !== undefined && (resourceCount as number) > 0;
  const progress = resourceCount && completedCount !== undefined && resourceCount > 0
    ? Math.round((completedCount / resourceCount) * 100)
    : 0;

  const displayName =
    locale === 'ar' && SUBJECT_NAMES_AR[subject.slug]
      ? SUBJECT_NAMES_AR[subject.slug]
      : subject.name;
  const displayCode = SUBJECT_CODES[subject.slug] ?? subject.code;

  return (
    <Link
      href={`/subjects/${subject.slug}`}
      className={cn(
        'group flex h-full min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-5',
        'shadow-[0_1px_2px_rgba(16,40,70,0.06)]',
        'transition-[border-color,box-shadow] duration-base ease-brand',
        'hover:border-primary/40 hover:shadow-[0_4px_12px_rgba(16,40,70,0.08)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      {/* Identity row: icon tile at the start, subject code at the end */}
      <div className="flex items-start justify-between gap-3">
        <div
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary dark:text-blue-300"
        >
          <Icon className="h-5 w-5" />
        </div>

        {displayCode && (
          <span className="ltr-isolate inline-flex h-5 shrink-0 items-center rounded border border-border bg-muted px-1.5 text-[11px] font-semibold leading-none tracking-wide text-foreground/80">
            {displayCode}
          </span>
        )}
      </div>

      {/* Subject name */}
      <div className="min-w-0">
        <h3
          dir="auto"
          title={displayName}
          className="line-clamp-2 break-words text-start text-base font-semibold leading-snug text-foreground transition-colors duration-fast ease-brand group-hover:text-primary"
        >
          {displayName}
        </h3>
      </div>

      {/* Footer: real resource count with progress, or type shortcuts */}
      {showProgress && (
        <div className="mt-auto space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              <bdi>{resourceCount}</bdi> {t('subjects.files')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t('subjects.progress')}</span>
              <bdi className="font-semibold text-foreground">{progress}%</bdi>
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-base ease-brand"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {hasCount && !showProgress && (resourceCount as number) > 0 && (
        <div className="mt-auto border-t border-border pt-3 text-xs text-muted-foreground">
          <bdi>{resourceCount}</bdi> {t('subjects.files')}
        </div>
      )}

      {(resourceCount === undefined || resourceCount === 0) && (
        <div className="mt-auto flex flex-wrap gap-1 border-t border-border pt-3">
          {RESOURCE_TYPE_ORDER.slice(0, 4).map((type) => (
            <span
              key={type}
              className="rounded bg-secondary px-1.5 py-0.5 text-[0.65rem] font-medium uppercase text-muted-foreground"
            >
              {t(`type.${type}`)}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}