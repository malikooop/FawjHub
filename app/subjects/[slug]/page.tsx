'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, BookOpen, FileText, ArrowUpDown, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResourceCard } from '@/components/resource-card';
import { ResourceTypeBadge } from '@/components/resource-type-badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import type { Subject, Resource, ResourceType, Progress } from '@/lib/types';
import { RESOURCE_TYPE_ORDER } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import * as Icons from 'lucide-react';

type SortOption = 'newest' | 'oldest' | 'downloads' | 'title';

export default function SubjectDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeType, setActiveType] = useState<ResourceType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    async function load() {
      const { data: subj, error: subjErr } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', slug as string)
        .maybeSingle();

      if (subjErr || !subj) {
        setError(true);
        setLoading(false);
        return;
      }

      setSubject(subj as Subject);

      const { data: res } = await supabase
        .from('resources')
        .select('*, subject:subjects(*)')
        .eq('subject_id', subj.id)
        .eq('published', true)
        .order('created_at', { ascending: false });

      setResources(res as Resource[] || []);
      setLoading(false);
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (!user || resources.length === 0) return;
    supabase
      .from('progress')
      .select('resource_id, completed')
      .eq('user_id', user.id)
      .in('resource_id', resources.map((r) => r.id))
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        (data || []).forEach((p) => {
          map[(p as { resource_id: string }).resource_id] = (p as { completed: boolean }).completed;
        });
        setProgressMap(map);
      });
  }, [user, resources]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach((r) => {
      counts[r.resource_type] = (counts[r.resource_type] || 0) + 1;
    });
    return counts;
  }, [resources]);

  const filteredResources = useMemo(() => {
    let result = activeType === 'all' ? resources : resources.filter((r) => r.resource_type === activeType);
    result = [...result];
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'downloads':
        result.sort((a, b) => b.download_count - a.download_count);
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return result;
  }, [resources, activeType, sortBy]);

  const completedCount = Object.values(progressMap).filter(Boolean).length;
  const progress = resources.length > 0 ? Math.round((completedCount / resources.length) * 100) : 0;

  if (loading) return <LoadingState message={t('subjects.loadingOne')} />;
  if (error || !subject) return <ErrorState message={t('subjects.notFound')} />;

  const Icon = (Icons[subject.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>) ?? Icons.BookOpen;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/subjects')} className="gap-1 -ml-2 text-muted-foreground rtl:ml-0 rtl:-mr-2">
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        {t('nav.subjects')}
      </Button>

      {/* Subject Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{subject.name}</h1>
              {subject.code && (
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {subject.code}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{subject.description}</p>
          </div>
        </div>

        {/* Progress bar */}
        {user && resources.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{t('subjects.yourProgress')}</span>
                <span className="font-medium">{t('subjects.completedLabel', { completed: completedCount, total: resources.length, percent: progress })}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, backgroundColor: subject.color }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resource Type Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveType('all')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeType === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          {t('subjects.all')} ({resources.length})
        </button>
        {RESOURCE_TYPE_ORDER.map((type) => {
          const count = typeCounts[type] || 0;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {t(`type.${type}`)} ({count})
            </button>
          );
        })}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredResources.length === 1
            ? t('subjects.resourceSingular', { count: 1 })
            : t('subjects.resources', { count: filteredResources.length })}
        </p>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[160px] h-9">
            <ArrowUpDown className="me-2 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('subjects.newestFirst')}</SelectItem>
            <SelectItem value="oldest">{t('subjects.oldestFirst')}</SelectItem>
            <SelectItem value="downloads">{t('subjects.mostDownloaded')}</SelectItem>
            <SelectItem value="title">{t('subjects.titleAz')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resources */}
      {filteredResources.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={t('subjects.noResourcesHere')}
          description={
            activeType !== 'all'
              ? t('subjects.noResourcesHereDesc', { type: t(`type.${activeType}`) })
              : t('subjects.noResourcesAllDesc')
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} typeLabel={t(`type.${resource.resource_type}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
