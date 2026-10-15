'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, FileText, Download, Calendar, User, HardDrive,
  CheckCircle2, Circle, ExternalLink, Loader2, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ResourceTypeBadge } from '@/components/resource-type-badge';
import { BookmarkButton } from '@/components/bookmark-button';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState, ErrorState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import type { Resource, Subject } from '@/lib/types';
import { formatFileSize, formatDate, formatDownloadCount } from '@/lib/format';

const RESOURCES_BUCKET = 'resources';
const SIGNED_URL_TTL_SECONDS = 3600; // signed URLs expire after 1 hour
const REFRESH_MS = 50 * 60 * 1000; // refresh before expiry
const REFRESH_RETRY_MS = 30 * 1000;
const MAX_REFRESH_FAILURES = 5;

type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Returns the Storage object path (inside the `resources` bucket) for either:
 * - new records: a direct object path such as `resources/123_abc.pdf`
 * - older records: a full Supabase Storage URL (public / sign / authenticated)
 */
function getResourceObjectPath(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  if (!/^https?:\/\//i.test(raw)) {
    return raw.replace(/^\/+/, '') || null;
  }

  try {
    const { pathname } = new URL(raw);
    const match = pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/resources\/(.+)$/
    );
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Single place where signed URLs are created (preview, new-tab link, download). */
async function createResourceSignedUrl(
  fileUrl: string
): Promise<{ url: string | null; error: string | null }> {
  const path = getResourceObjectPath(fileUrl);
  if (!path) {
    return { url: null, error: 'Could not determine the Storage object path.' };
  }

  const { data, error } = await supabase.storage
    .from(RESOURCES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return { url: null, error: error?.message ?? 'No signed URL was returned.' };
  }

  return { url: data.signedUrl, error: null };
}

async function recordResourceView(resourceId: string, userId: string | null) {
  try {
    const { error } = await supabase.from('resource_views').insert({
      resource_id: resourceId,
      user_id: userId,
    });
    if (error) console.error('Failed to record resource view:', error.message);
  } catch (err) {
    console.error('Failed to record resource view:', err);
  }
}

export default function ResourceDetailPage() {
  const { id: rawId } = useParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useI18n();

  const [resource, setResource] = useState<Resource | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [related, setRelated] = useState<Resource[]>([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [signedFileUrl, setSignedFileUrl] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');
  const [previewAttempt, setPreviewAttempt] = useState(0);

  const userId = user?.id ?? null;
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;
  const viewRecordedFor = useRef<string | null>(null);
  const downloadingRef = useRef(false);
  const togglingRef = useRef(false);

  const fileUrl = resource?.file_url ?? null;

  // Small helper for messages that have no translation key yet.
  const msg = (ar: string, en: string) => (String(locale) === 'ar' ? ar : en);

  // Signed URL for preview + "open in new tab" (private bucket).
  useEffect(() => {
    if (!fileUrl) {
      setSignedFileUrl(null);
      setPreviewStatus('idle');
      return;
    }

    const currentFileUrl: string = fileUrl;
    let cancelled = false;
    let refreshing = false;
    let lastGeneratedAt = 0;
    let failures = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    setSignedFileUrl(null);
    setPreviewStatus('loading');

    function scheduleRefresh(delay: number) {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void refreshSignedUrl(true);
      }, delay);
    }

    function handleFailure(reason: unknown) {
      failures += 1;
      console.error('Failed to create signed URL:', reason);

      if (!lastGeneratedAt) {
        // Initial load failed: show the error state with a manual retry.
        setPreviewStatus('error');
        return;
      }
      // Background refresh failed: keep the current URL and retry a few times.
      if (failures < MAX_REFRESH_FAILURES) scheduleRefresh(REFRESH_RETRY_MS);
    }

    async function refreshSignedUrl(force: boolean) {
      if (cancelled || refreshing) return;

      if (
        !force &&
        lastGeneratedAt &&
        Date.now() - lastGeneratedAt < REFRESH_MS
      ) {
        return;
      }

      refreshing = true;
      try {
        const result = await createResourceSignedUrl(currentFileUrl);
        if (cancelled) return;

        if (!result.url) {
          handleFailure(result.error);
          return;
        }

        failures = 0;
        lastGeneratedAt = Date.now();
        setSignedFileUrl(result.url);
        setPreviewStatus('ready');
        scheduleRefresh(REFRESH_MS);
      } catch (err) {
        if (!cancelled) handleFailure(err);
      } finally {
        refreshing = false;
      }
    }

    void refreshSignedUrl(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshSignedUrl(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fileUrl, previewAttempt]);

  // Load the resource, its subject and related resources.
  useEffect(() => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }

    const resourceId: string = id;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);

      try {
        const { data, error: err } = await supabase
          .from('resources')
          .select('*, subject:subjects(*)')
          .eq('id', resourceId)
          .maybeSingle();

        if (cancelled) return;

        if (err || !data) {
          if (err) console.error('Failed to load resource:', err.message);
          setError(true);
          return;
        }

        const res = data as Resource;
        setResource(res);
        setSubject(res.subject || null);

        const { data: rel, error: relError } = await supabase
          .from('resources')
          .select('*, subject:subjects(*)')
          .eq('subject_id', res.subject_id)
          .eq('published', true)
          .neq('id', res.id)
          .order('created_at', { ascending: false })
          .limit(4);

        if (cancelled) return;

        if (relError) console.error('Failed to load related resources:', relError.message);
        setRelated((rel as Resource[]) || []);

        if (viewRecordedFor.current !== res.id) {
          viewRecordedFor.current = res.id;
          void recordResourceView(res.id, userIdRef.current);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Unexpected error while loading resource:', err);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Completion state for the signed-in user.
  useEffect(() => {
    if (!userId || !id) {
      setCompleted(false);
      return;
    }

    const resourceId: string = id;
    let cancelled = false;

    async function loadProgress() {
      try {
        const { data, error: err } = await supabase
          .from('progress')
          .select('completed')
          .eq('user_id', userId)
          .eq('resource_id', resourceId)
          .maybeSingle();

        if (cancelled) return;
        if (err) console.error('Failed to load progress:', err.message);
        setCompleted(data?.completed ?? false);
      } catch (err) {
        if (!cancelled) console.error('Unexpected progress error:', err);
      }
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [userId, id]);

  const toggleComplete = async () => {
    if (!user || !resource || togglingRef.current) return;

    togglingRef.current = true;
    const previous = completed;
    const next = !previous;
    setCompleted(next);

    try {
      const result = next
        ? await supabase.from('progress').upsert(
            {
              user_id: user.id,
              resource_id: resource.id,
              completed: true,
              completed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,resource_id' }
          )
        : await supabase
            .from('progress')
            .update({ completed: false, completed_at: null })
            .eq('user_id', user.id)
            .eq('resource_id', resource.id);

      if (result.error) throw result.error;
    } catch (err) {
      console.error('Failed to update progress:', err);
      setCompleted(previous);
      toast.error(msg('تعذر حفظ التقدم. حاول مرة أخرى.', 'Could not save your progress. Please try again.'));
    } finally {
      togglingRef.current = false;
    }
  };

  const handleDownload = async () => {
    if (!resource?.file_url || downloadingRef.current) return;

    downloadingRef.current = true;
    // Open the tab synchronously so the popup blocker allows it.
    const newTab = window.open('about:blank', '_blank');

    try {
      const { url, error: urlError } = await createResourceSignedUrl(resource.file_url);

      if (!url) {
        newTab?.close();
        console.error('Failed to create signed URL:', urlError);
        toast.error(
          msg(
            'تعذر فتح الملف. تحقق من صلاحيات التخزين.',
            'Could not open the file. Please try again or check storage permissions.'
          )
        );
        return;
      }

      const { error: rpcError } = await supabase.rpc('increment_download_count', {
        resource_uuid: resource.id,
      });
      if (rpcError) console.error('Failed to increment download count:', rpcError.message);

      if (newTab) {
        newTab.opener = null;
        newTab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err) {
      newTab?.close();
      console.error('Unexpected download error:', err);
      toast.error(
        msg('تعذر فتح الملف. حاول مرة أخرى.', 'Could not open the file. Please try again.')
      );
    } finally {
      downloadingRef.current = false;
    }
  };

  if (loading) return <LoadingState message={t('resource.loading')} />;
  if (error || !resource) return <ErrorState message={t('resource.notFound')} />;

  const typeLabel = t(`type.${resource.resource_type}`);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 -ml-2 text-muted-foreground rtl:ml-0 rtl:-mr-2">
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        {t('resource.back')}
      </Button>

      {/* Resource Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ResourceTypeBadge type={resource.resource_type} label={typeLabel} />
          {resource.is_important && (
            <span className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
              {t('resource.important')}
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
            {t('resource.academicYear')}
          </div>
          <p className="text-sm font-medium">{resource.academic_year || '—'}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <User className="h-3 w-3" />
            {t('resource.teacher')}
          </div>
          <p className="text-sm font-medium">{resource.teacher || '—'}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Download className="h-3 w-3" />
            {t('resource.downloads')}
          </div>
          <p className="text-sm font-medium">{formatDownloadCount(resource.download_count, locale)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <HardDrive className="h-3 w-3" />
            {t('resource.fileSize')}
          </div>
          <p className="text-sm font-medium">{resource.file_size > 0 ? formatFileSize(resource.file_size, locale) : '—'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleDownload} className="gap-2" size="lg">
          <Download className="h-4 w-4" />
          {t('resource.downloadOpen')}
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
                {t('resource.completed')}
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                {t('resource.markCompleted')}
              </>
            )}
          </Button>
        )}
      </div>

      {/* PDF Preview */}
      {resource.file_url && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t('resource.preview')}</h2>
            {previewStatus === 'ready' && signedFileUrl && (
              <a
                href={signedFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t('resource.openNewTab')}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {previewStatus === 'ready' && signedFileUrl ? (
            <div className="overflow-hidden rounded-lg border bg-card">
              <object
                data={signedFileUrl}
                type="application/pdf"
                className="h-[500px] w-full"
              >
                <div className="flex h-[500px] flex-col items-center justify-center gap-3 p-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t('resource.previewUnavailable')}
                  </p>
                  <Button onClick={handleDownload} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    {t('resource.downloadToView')}
                  </Button>
                </div>
              </object>
            </div>
          ) : previewStatus === 'error' ? (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3 rounded-lg border bg-card p-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('resource.previewUnavailable')}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={() => setPreviewAttempt((attempt) => attempt + 1)}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {msg('إعادة المحاولة', 'Retry')}
                </Button>
                <Button onClick={handleDownload} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  {t('resource.downloadToView')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center gap-2 rounded-lg border bg-card text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {msg('جارٍ تحميل المعاينة…', 'Loading preview…')}
            </div>
          )}
        </div>
      )}

      {/* Related Resources */}
      {related.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t('resource.relatedResources')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((rel) => (
              <ResourceCard key={rel.id} resource={rel} showSubject={false} typeLabel={t(`type.${rel.resource_type}`)} />
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 text-xs text-muted-foreground">
        {t('resource.addedOn', { date: formatDate(resource.created_at, locale) })}
      </div>
    </div>
  );
}