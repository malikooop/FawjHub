'use client';

import Link from 'next/link';
import { FileText, Download, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Resource, Subject } from '@/lib/types';
import { ResourceTypeBadge } from '@/components/resource-type-badge';
import { BookmarkButton } from '@/components/bookmark-button';
import { useI18n } from '@/lib/i18n';
import { formatRelativeDate, formatDownloadCount, formatFileSize } from '@/lib/format';

interface ResourceCardProps {
  resource: Resource;
  subject?: Subject;
  showSubject?: boolean;
  showBookmark?: boolean;
  className?: string;
  typeLabel?: string;
}

/* ------------------------------------------------------------------ */
/* Presentation-only helper: file format (PDF, DOCX...)                */
/* Reads optional file fields defensively. Returns null when the       */
/* record does not expose a recognizable format, so nothing is shown.  */
/* ------------------------------------------------------------------ */

const KNOWN_FORMATS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

function getFileFormat(resource: Resource): string | null {
  const record = resource as unknown as Record<string, unknown>;
  const candidates = [
    record.file_name,
    record.file_path,
    record.file_url,
    record.file_type,
  ];

  for (const value of candidates) {
    if (typeof value !== 'string' || !value) continue;

    const clean = value.split(/[?#]/)[0].toLowerCase();
    const ext = clean.includes('.') ? clean.split('.').pop() : clean;

    if (ext && KNOWN_FORMATS.includes(ext)) return ext.toUpperCase();
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Presentation-only helper: Arabic subject display names              */
/* Keyed by the real subject slug. Mirrors the homepage mapping.       */
/* Stored subject records are never modified.                          */
/* ------------------------------------------------------------------ */

const SUBJECT_NAMES_AR: Record<string, string> = {
  'information-systems': 'نظم المعلومات',
  'computer-architecture': 'معمارية الحاسوب',
  'probability-statistics-1': 'الاحتمالات والإحصاء 1',
  'object-oriented-programming-1': 'البرمجة كائنية التوجه 1',
  'algorithms-data-structures-3': 'الخوارزميات وهياكل البيانات 3',
  'project-management': 'إدارة المشاريع',
  'numerical-methods': 'الطرق العددية',
};

function getSubjectDisplayName(
  subject: Subject | null | undefined,
  locale: string
): string | null {
  if (!subject) return null;

  const record = subject as unknown as Record<string, unknown>;
  const storedName = typeof record.name === 'string' ? record.name : '';
  const slug = typeof record.slug === 'string' ? record.slug : '';

  if (locale === 'ar' && slug && SUBJECT_NAMES_AR[slug]) {
    return SUBJECT_NAMES_AR[slug];
  }

  return storedName || null;
}

export function ResourceCard({
  resource,
  subject,
  showSubject = false,
  showBookmark = true,
  className,
  typeLabel,
}: ResourceCardProps) {
  const { locale } = useI18n();
  const subj = subject || resource.subject;
  const subjectName = getSubjectDisplayName(subj, locale);
  const label = typeLabel || resource.resource_type;
  const format = getFileFormat(resource);
  const hasDownloads = typeof resource.download_count === 'number';
  const hasFileSize = resource.file_size > 0;

  return (
    <article
      className={cn(
        'group relative flex items-start gap-3.5 rounded-lg border border-border bg-card p-4',
        'shadow-[0_1px_2px_rgba(16,40,70,0.06)]',
        'transition-[border-color,box-shadow] duration-base ease-brand',
        'hover:border-primary/40 hover:shadow-[0_4px_12px_rgba(16,40,70,0.08)]',
        className
      )}
    >
      {/* Document block: file format only when the record supports it */}
      <div
        aria-hidden="true"
        className={cn(
          'flex shrink-0 flex-col items-center justify-center rounded-md bg-accent text-primary dark:text-blue-300',
          format ? 'h-12 w-11 gap-0.5' : 'h-10 w-10'
        )}
      >
        <FileText className="h-5 w-5" />
        {format && (
          <span className="ltr-isolate text-[10px] font-bold leading-none tracking-wide">
            {format}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {/* Title: the stretched link makes the whole card one click target */}
        <h3
          dir="auto"
          title={resource.title}
          className="line-clamp-2 break-words text-start text-[15px] font-semibold leading-snug text-foreground transition-colors duration-fast ease-brand group-hover:text-primary"
        >
          <Link
            href={`/resources/${resource.id}`}
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-background"
          >
            {resource.title}
          </Link>
        </h3>

        {/* Classification: resource type, then subject */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <ResourceTypeBadge type={resource.resource_type} label={label} />
          {showSubject && subjectName && (
            <span
              dir="auto"
              title={subjectName}
              className="min-w-0 max-w-full truncate text-start text-xs font-medium text-muted-foreground"
            >
              {subjectName}
            </span>
          )}
        </div>

        {resource.description && (
          <p
            dir="auto"
            className="line-clamp-1 break-words text-start text-[13px] leading-5 text-muted-foreground sm:line-clamp-2"
          >
            {resource.description}
          </p>
        )}

        {/* Secondary metadata: each item only when present */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
          {resource.academic_year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
              <bdi>{resource.academic_year}</bdi>
            </span>
          )}
          {hasDownloads && (
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3 shrink-0" aria-hidden="true" />
              <bdi>{formatDownloadCount(resource.download_count, locale)}</bdi>
            </span>
          )}
          {hasFileSize && (
            <bdi>{formatFileSize(resource.file_size, locale)}</bdi>
          )}
          {resource.created_at && (
            <span className="ms-auto">
              {formatRelativeDate(resource.created_at, locale)}
            </span>
          )}
        </div>
      </div>

      {/* Bookmark stays independent and sits above the stretched link */}
      {showBookmark && (
        <div className="relative z-10 -me-1 -mt-1 shrink-0">
          <BookmarkButton resourceId={resource.id} />
        </div>
      )}
    </article>
  );
}