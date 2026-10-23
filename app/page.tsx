
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  ArrowRight,
  BookOpen,
  Star,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SubjectCard } from '@/components/subject-card';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState, EmptyState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import type { Subject, Resource } from '@/lib/types';
import { toast } from 'sonner';

type HomeProgressItem = {
  id: string;
  completed: boolean;
  updated_at: string;
  resource: Resource | null;
};

export default function HomePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { t, locale } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentResources, setRecentResources] = useState<Resource[]>([]);
  const [importantResources, setImportantResources] = useState<Resource[]>([]);
  const [progressData, setProgressData] = useState<HomeProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const query = searchQuery.trim();

    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  // Load the public academic content used on the homepage.
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [subjectsRes, recentRes, importantRes] = await Promise.all([
          supabase
            .from('subjects')
            .select('*')
            .order('sort_order'),

          supabase
            .from('resources')
            .select('*, subject:subjects(*)')
            .eq('published', true)
            .order('created_at', { ascending: false })
            .limit(6),

          supabase
            .from('resources')
            .select('*, subject:subjects(*)')
            .eq('published', true)
            .eq('is_important', true)
            .order('download_count', { ascending: false })
            .limit(4),
        ]);

        if (cancelled) return;

        if (subjectsRes.error) {
          console.error('Failed to load homepage subjects:', subjectsRes.error.message);
        }

        if (recentRes.error) {
          console.error('Failed to load recent resources:', recentRes.error.message);
        }

        if (importantRes.error) {
          console.error('Failed to load important resources:', importantRes.error.message);
        }

        if (subjectsRes.error || recentRes.error || importantRes.error) {
          toast.error(
            locale === 'ar'
              ? 'تعذر تحميل بعض المحتويات. حاول تحديث الصفحة.'
              : 'Some content could not be loaded. Try refreshing the page.'
          );
        }

        setSubjects((subjectsRes.data ?? []) as Subject[]);
        setRecentResources((recentRes.data ?? []) as Resource[]);
        setImportantResources((importantRes.data ?? []) as Resource[]);
      } catch (error) {
        if (cancelled) return;

        console.error('Failed to load homepage:', error);

        toast.error(
          locale === 'ar'
            ? 'تعذر تحميل محتوى الصفحة. حاول تحديث الصفحة.'
            : 'Could not load homepage content. Try refreshing the page.'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Load the current student's unfinished study items separately,
  // so the public homepage does not have to wait for them.
  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setProgressData([]);
      return;
    }

    async function loadProgress() {
      try {
        const { data, error } = await supabase
          .from('progress')
          .select(
            'id, completed, updated_at, resource:resources(*, subject:subjects(*))'
          )
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (cancelled) return;

        if (error) {
          console.error('Failed to load study progress:', error.message);
          setProgressData([]);
          return;
        }

        type HomeProgressRow = {
  id: string;
  completed: boolean;
  updated_at: string;
  resource: Resource | Resource[] | null;
};

const rows = (data ?? []) as unknown as HomeProgressRow[];

setProgressData(
  rows.map((item) => ({
    id: item.id,
    completed: item.completed,
    updated_at: item.updated_at,
    resource: Array.isArray(item.resource)
      ? item.resource[0] ?? null
      : item.resource ?? null,
  }))
);

      } catch (error) {
        if (cancelled) return;

        console.error('Failed to load study progress:', error);
        setProgressData([]);
      }
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <LoadingState message={t('common.loading')} />;
  }

  const unfinishedResources = progressData
    .filter((item) => !item.completed && item.resource)
    .slice(0, 3);

  // Avoid showing the same resource in both homepage sections.
  const recentResourceIds = new Set(
    recentResources.map((resource) => resource.id)
  );

  const additionalImportantResources = importantResources.filter(
    (resource) => !recentResourceIds.has(resource.id)
  );

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-12 py-2 sm:space-y-16">
      {/* Welcome and search */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -end-16 -top-20 h-48 w-48 rounded-full border-[24px] border-primary/5" />
        <div className="relative space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Nibras / نبراس</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {firstName
              ? t('home.welcomeBackName', { name: firstName })
              : t('home.welcome')}
          </h1>

          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {t('home.subtitle')}
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          role="search"
            className="flex max-w-4xl flex-col gap-2 sm:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <label htmlFor="home-search" className="sr-only">
              {t('home.searchPlaceholder')}
            </label>

            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3.5"
            />

            <Input
              id="home-search"
              type="search"
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 bg-background pl-10 pr-4 text-sm rtl:pl-4 rtl:pr-10 sm:h-12 sm:text-base"
            />
          </div>

          <Button type="submit" className="h-11 shrink-0 gap-2 sm:h-12">
            <span>{t('nav.search')}</span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 rtl:rotate-180"
            />
          </Button>
        </form>
        </div>
      </section>

      {/* Continue studying */}
      {user && unfinishedResources.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {t('home.inProgress')}
            </h2>

            <Link
              href="/profile"
              className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{t('nav.profile')}</span>
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 rtl:rotate-180"
              />
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {unfinishedResources.map((item) => (
              <ResourceCard
                key={item.id}
                resource={item.resource!}
                showSubject
                typeLabel={t(`type.${item.resource!.resource_type}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Subjects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            {t('home.subjects')}
          </h2>

          <Link
            href="/subjects"
            className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>{t('home.viewAll')}</span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 rtl:rotate-180"
            />
          </Link>
        </div>

        {subjects.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title={t('home.noSubjects')}
            description={t('home.noSubjectsDesc')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </section>

      {/* Recent resources and additional important resources */}
      <div
        className={
          additionalImportantResources.length > 0
            ? 'grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'
            : 'space-y-8'
        }
      >
        <section className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              {t('home.recentlyAdded')}
            </h2>

            <Link
              href="/search"
              className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>{t('home.browse')}</span>
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 rtl:rotate-180"
              />
            </Link>
          </div>

          {recentResources.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title={t('home.noResources')}
              description={t('home.noResourcesDesc')}
            />
          ) : (
            <div className="space-y-3">
              {recentResources.slice(0, 4).map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  showSubject
                  typeLabel={t(`type.${resource.resource_type}`)}
                />
              ))}
            </div>
          )}
        </section>

        {additionalImportantResources.length > 0 && (
          <section className="min-w-0 space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
              <Star
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-warning"
              />
              {t('home.importantResources')}
            </h2>

            <div className="space-y-3">
              {additionalImportantResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  showSubject
                  typeLabel={t(`type.${resource.resource_type}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Exam archive: a simple, practical shortcut */}
      <section className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 space-y-1">
            <h2 className="font-semibold">
              {t('home.examsArchive')}
            </h2>

            <p className="text-sm leading-5 text-muted-foreground">
              {t('home.examsArchiveDesc')}
            </p>
          </div>
        </div>

        <Link
          href="/exams"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
        >
          <span>{t('home.browseExams')}</span>
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 rtl:rotate-180"
          />
        </Link>
      </section>
    </main>
  );
}
