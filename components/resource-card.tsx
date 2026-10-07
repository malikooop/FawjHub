import Link from 'next/link';
import { FileText, Download, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Resource, Subject } from '@/lib/types';
import { ResourceTypeBadge } from '@/components/resource-type-badge';
import { BookmarkButton } from '@/components/bookmark-button';
import { formatRelativeDate, formatDownloadCount, formatFileSize } from '@/lib/format';

interface ResourceCardProps {
  resource: Resource;
  subject?: Subject;
  showSubject?: boolean;
  showBookmark?: boolean;
  className?: string;
}

export function ResourceCard({ resource, subject, showSubject = false, showBookmark = true, className }: ResourceCardProps) {
  const subj = subject || resource.subject;

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/resources/${resource.id}`} className="flex items-start gap-3 min-w-0 flex-1">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {resource.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ResourceTypeBadge type={resource.resource_type} />
              {showSubject && subj && (
                <span className="text-xs text-muted-foreground">
                  {subj.name}
                </span>
              )}
            </div>
          </div>
        </Link>
        {showBookmark && <BookmarkButton resourceId={resource.id} />}
      </div>

      {resource.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {resource.description}
        </p>
      )}

      <Link href={`/resources/${resource.id}`} className="flex items-center gap-3 text-xs text-muted-foreground">
        {resource.academic_year && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {resource.academic_year}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          {formatDownloadCount(resource.download_count)}
        </span>
        {resource.file_size > 0 && (
          <span>{formatFileSize(resource.file_size)}</span>
        )}
        <span className="ml-auto">{formatRelativeDate(resource.created_at)}</span>
      </Link>
    </div>
  );
}
