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

export function SubjectCard({ subject, resourceCount, completedCount }: SubjectCardProps) {
  const { t } = useI18n();
  const Icon = (Icons[subject.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ?? Icons.BookOpen;
  const progress = resourceCount && completedCount !== undefined && resourceCount > 0
    ? Math.round((completedCount / resourceCount) * 100)
    : 0;

  return (
    <Link
      href={`/subjects/${subject.slug}`}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {resourceCount !== undefined ? `${resourceCount} ${t('subjects.files')}` : subject.code}
        </span>
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {subject.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {subject.description}
        </p>
      </div>

      {resourceCount !== undefined && completedCount !== undefined && resourceCount > 0 && (
        <div className="mt-auto space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('subjects.progress')}</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: subject.color }}
            />
          </div>
        </div>
      )}

      {(resourceCount === undefined || resourceCount === 0) && (
        <div className="mt-auto flex flex-wrap gap-1">
          {RESOURCE_TYPE_ORDER.slice(0, 4).map((type) => (
            <span key={type} className="rounded bg-secondary px-1.5 py-0.5 text-[0.65rem] font-medium uppercase text-muted-foreground">
              {t(`type.${type}`)}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
