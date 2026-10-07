'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, FileText, Download, Calendar, User, HardDrive,
  Eye, CheckCircle2, Circle, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ResourceTypeBadge } from '@/components/resource-type-badge';
import { BookmarkButton } from '@/components/bookmark-button';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState, ErrorState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import type { Resource, Subject } from '@/lib/types';
import { formatFileSize, formatDate, formatDownloadCount } from '@/lib/format';

export default function ResourceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [resource, setResource] = useState<Resource | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [related, setRelated] = useState<Resource[]>([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const recordView = useCallback(async () => {
    if (!id) return;
    // Only insert the resource_id — user_id is determined server-side
    // The RLS policy WITH CHECK(true) allows the insert, and user_id
    // should be set by a database default, not sent from the client
    await supabase.from('resource_views').insert({
      resource_id: id as string,
      user_id: user?.id ?? null,
    });
  }, [id, user]);

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('resources')
        .select('*, subject:subjects(*)')
        .eq('id', id as string)
        .maybeSingle();

      if (err || !data) {
        setError(true);
        setLoading(false);
        return;
      }

      const res = data as Resource;
      setResource(res);
      setSubject(res.subject || null);

      // Load related resources
      const { data: rel } = await supabase
        .from('resources')
        .select('*, subject:subjects(*)')
        .eq('subject_id', res.subject_id)
        .eq('published', true)
        .neq('id', res.id)
        .order('created_at', { ascending: false })
        .limit(4);

      setRelated(rel as Resource[] || []);
      setLoading(false);
      recordView();
    }
    load();
  }, [id, recordView]);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('progress')
      .select('completed')
      .eq('user_id', user.id)
      .eq('resource_id', id as string)
      .maybeSingle()
      .then(({ data }) => {
        setCompleted(data?.completed ?? false);
      });
  }, [user, id]);

  const toggleComplete = async () => {
    if (!user || !resource) return;
    const newCompleted = !completed;
    setCompleted(newCompleted);

    if (newCompleted) {
      await supabase
        .from('progress')
        .upsert({
          user_id: user.id,
          resource_id: resource.id,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,resource_id' });
    } else {
      await supabase
        .from('progress')
        .update({ completed: false, completed_at: null })
        .eq('user_id', user.id)
        .eq('resource_id', resource.id);
    }
  };

  const handleDownload = async () => {
    if (!resource) return;
    await supabase.rpc('increment_download_count', { resource_uuid: resource.id });
    if (resource.file_url) {
      window.open(resource.file_url, '_blank');
    }
  };

  if (loading) return <LoadingState message="Loading resource..." />;
  if (error || !resource) return <ErrorState message="Resource not found" />;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 -ml-2 text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Resource Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ResourceTypeBadge type={resource.resource_type} />
          {resource.is_important && (
            <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
              Important
            </span>
          )}
          {subject && (
            <Link href={`/subjects/${subject.slug}`}>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
                {subject.name}
              </span>
            </Link>
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{resource.title}</h1>

        {resource.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{resource.description}</p>
        )}
      </div>

      {/* Meta Info Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Calendar className="h-3 w-3" />
            Academic Year
          </div>
          <p className="text-sm font-medium">{resource.academic_year || '—'}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <User className="h-3 w-3" />
            Teacher
          </div>
          <p className="text-sm font-medium">{resource.teacher || '—'}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Download className="h-3 w-3" />
            Downloads
          </div>
          <p className="text-sm font-medium">{formatDownloadCount(resource.download_count)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <HardDrive className="h-3 w-3" />
            File Size
          </div>
          <p className="text-sm font-medium">{resource.file_size > 0 ? formatFileSize(resource.file_size) : '—'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleDownload} className="gap-2" size="lg">
          <Download className="h-4 w-4" />
          Download / Open
        </Button>
        <BookmarkButton resourceId={resource.id} variant="default" />
        {user && (
          <Button
            variant={completed ? 'secondary' : 'outline'}
            size="lg"
            onClick={toggleComplete}
            className="gap-2"
          >
            {completed ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                Completed
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                Mark as completed
              </>
            )}
          </Button>
        )}
      </div>

      {/* PDF Preview */}
      {resource.file_url && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Preview</h2>
            <a
              href={resource.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open in new tab
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <object
              data={resource.file_url}
              type="application/pdf"
              className="h-[500px] w-full"
            >
              <div className="flex h-[500px] flex-col items-center justify-center gap-3 p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  PDF preview is not available in your browser.
                </p>
                <Button onClick={handleDownload} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download to view
                </Button>
              </div>
            </object>
          </div>
        </div>
      )}

      {/* Related Resources */}
      {related.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Related Resources</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((rel) => (
              <ResourceCard key={rel.id} resource={rel} showSubject={false} />
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 text-xs text-muted-foreground">
        Added on {formatDate(resource.created_at)}
      </div>
    </div>
  );
}
