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
  MessageSquareText,
  ChevronRight,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

/* ------------------------------------------------------------------ */
/* Local presentation helpers (no behavior, no data access)            */
/* ------------------------------------------------------------------ */

/**
 * Presentation-only display data for the seven official subjects, keyed by
 * their real slugs. Navigation always uses the slug returned by Supabase;
 * this map only supplies the short code and the Arabic display name.
 */
const SUBJECT_DISPLAY: Record<string, { code: string; ar: string }> = {
  'information-systems': { code: 'IS', ar: 'نظم المعلومات' },
  'computer-architecture': { code: 'ADO', ar: 'معمارية الحاسوب' },
  'probability-statistics-1': { code: 'PS1', ar: 'الاحتمالات والإحصاء 1' },
  'object-oriented-programming-1': {
    code: 'OOP 1',
    ar: 'البرمجة كائنية التوجه 1',
  },
  'algorithms-data-structures-3': {
  code: 'ASD 3',
  ar: 'الخوارزميات وهياكل البيانات 3',

  },
  'project-management': { code: 'PM', ar: 'إدارة المشاريع' },
  'numerical-methods': { code: 'NM', ar: 'الطرق العددية' },
};

function getSubjectCode(subject: Subject): string | null {
  const mapped = SUBJECT_DISPLAY[subject.slug]?.code;
  if (mapped) return mapped;

  // Fallback: use a stored code only if the record happens to have one.
  const stored = (subject as unknown as { code?: string | null }).code;
  return stored && stored.trim() ? stored.trim() : null;
}

function getSubjectName(subject: Subject, locale: string): string {
  if (locale === 'ar') {
    return SUBJECT_DISPLAY[subject.slug]?.ar ?? subject.name;
  }
  return subject.name;
}

function SectionHeader({
  title,
  href,
  linkLabel,
  icon,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {icon}
        {title}
      </h2>

      {href && linkLabel && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-md text-sm font-medium text-primary transition-colors duration-fast ease-brand hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span>{linkLabel}</span>
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform duration-base ease-brand group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}

function SubjectIndexItem({
  slug,
  name,
  code,
}: {
  slug: string;
  name: string;
  code: string | null;
}) {
  return (
    <Link
      href={`/subjects/${slug}`}
      className="group flex min-h-[72px] items-center gap-3 rounded-lg border border-border bg-card p-3.5 shadow-[0_1px_2px_rgba(16,40,70,0.06)] transition-[border-color,transform,box-shadow] duration-base ease-brand hover:-translate-y-px hover:border-primary/40 hover:shadow-[0_4px_12px_rgba(16,40,70,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex h-11 min-w-[2.75rem] shrink-0 items-center justify-center rounded-md bg-accent px-2 text-primary">
        {code ? (
          <span className="ltr-isolate whitespace-nowrap text-[13px] font-bold tracking-wide">
            {code}
          </span>
        ) : (
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        )}
      </span>

      <span
        dir="auto"
        className="min-w-0 flex-1 text-start text-[15px] font-semibold leading-snug text-foreground"
      >
        {name}
      </span>

      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-base ease-brand group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
      />
    </Link>
  );
}

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
    <div className="mx-auto w-full max-w-7xl space-y-12 sm:space-y-14">
      {/* ------------------------------------------------------------ */}
      {/* Hero: image-free navy panel                                   */}
      {/* ------------------------------------------------------------ */}
      <section
        aria-labelledby="home-heading"
        className="animate-fade-in overflow-hidden rounded-xl border border-white/5 bg-gradient-to-b from-navy-deep to-navy text-navy-foreground"
      >
        <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12 lg:px-10 lg:py-12">
          {/* Search column */}
          <div className="min-w-0 space-y-6">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-brand-cyan">
                <span
                  aria-hidden="true"
                  className="h-px w-6 bg-brand-cyan/70"
                />
                {t('brand.tagline')}
              </p>

              <h1
                id="home-heading"
                className="text-balance text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl rtl:leading-[1.35]"
              >
                {firstName
                  ? t('home.welcomeBackName', { name: firstName })
                  : t('home.welcome')}
              </h1>

              <p className="max-w-xl text-base leading-7 text-navy-muted rtl:leading-8">
                {t('home.subtitle')}
              </p>
            </div>

            <form
              onSubmit={handleSearch}
              role="search"
              className="flex max-w-2xl flex-col gap-2 sm:flex-row"
            >
              <div className="relative min-w-0 flex-1">
                <label htmlFor="home-search" className="sr-only">
                  {t('home.searchPlaceholder')}
                </label>

                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                />

                <Input
                  id="home-search"
                  type="search"
                  placeholder={t('home.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 border-transparent bg-card pe-4 ps-12 text-base text-foreground shadow-sm focus-visible:ring-brand-cyan sm:h-14"
                />
              </div>

              <Button
                type="submit"
                className="h-12 shrink-0 gap-2 px-6 text-base transition-colors duration-fast ease-brand focus-visible:ring-brand-cyan sm:h-14"
              >
                <span>{t('nav.search')}</span>
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 rtl:rotate-180"
                />
              </Button>
            </form>

            {/* Subject shortcuts (below lg; the index panel replaces them on lg+) */}
            {subjects.length > 0 && (
              <div className="space-y-2 lg:hidden">
                <p className="text-xs font-medium text-navy-muted">
                  {t('home.subjects')}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {subjects.map((subject) => {
                    const code = getSubjectCode(subject);
                    const name = getSubjectName(subject, locale);
                    return (
                      <li key={subject.id}>
                        <Link
                          href={`/subjects/${subject.slug}`}
                          title={name}
                          aria-label={name}
                          className="inline-flex min-h-[36px] items-center rounded-md border border-white/20 px-3 text-sm font-medium text-white/90 transition-colors duration-fast ease-brand hover:border-white/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
                        >
                          <span
                            dir="auto"
                            className={
                              code ? 'ltr-isolate whitespace-nowrap' : undefined
                            }
                          >
                            {code ?? name}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Subject index panel (lg+) */}
          {subjects.length > 0 && (
            <nav
              aria-label={t('home.subjects')}
              className="hidden border-white/10 lg:block lg:border-s lg:ps-10"
            >
              <p className="mb-3 text-xs font-medium text-navy-muted">
                {t('home.subjects')}
              </p>
              <ul className="space-y-0.5">
                {subjects.map((subject) => {
                  const code = getSubjectCode(subject);
                  const name = getSubjectName(subject, locale);
                  return (
                    <li key={subject.id}>
                      <Link
                        href={`/subjects/${subject.slug}`}
                        className="group flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors duration-fast ease-brand hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-cyan"
                      >
                        <span className="ltr-isolate w-14 shrink-0 whitespace-nowrap text-sm font-semibold text-brand-cyan">
                          {code ?? '—'}
                        </span>
                        <span
                          dir="auto"
                          className="min-w-0 flex-1 truncate text-start text-sm text-white/85 group-hover:text-white"
                        >
                          {name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Continue studying (signed-in, real progress only)             */}
      {/* ------------------------------------------------------------ */}
      {user && unfinishedResources.length > 0 && (
        <section className="space-y-5">
          <SectionHeader
            title={t('profile.continueStudying')}
            href="/profile"
            linkLabel={t('nav.profile')}
          />

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

      {/* ------------------------------------------------------------ */}
      {/* Subject catalogue: all subjects visible, no carousel          */}
      {/* ------------------------------------------------------------ */}
      <section className="space-y-5">
        <SectionHeader
          title={t('home.subjects')}
          href="/subjects"
          linkLabel={t('home.viewAll')}
        />

        {subjects.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title={t('home.noSubjects')}
            description={t('home.noSubjectsDesc')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subjects.map((subject) => (
              <SubjectIndexItem
                key={subject.id}
                slug={subject.slug}
                name={getSubjectName(subject, locale)}
                code={getSubjectCode(subject)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Recent resources and additional important resources           */}
      {/* ------------------------------------------------------------ */}
      <div
        className={
          additionalImportantResources.length > 0
            ? 'grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'
            : 'space-y-8'
        }
      >
        <section className="min-w-0 space-y-5">
          <SectionHeader
            title={t('home.recentlyAdded')}
            href="/search"
            linkLabel={t('home.browse')}
          />

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
          <section className="min-w-0 space-y-5">
            <SectionHeader
              title={t('home.importantResources')}
              icon={
                <Star
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-warning"
                />
              }
            />

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

      {/* ------------------------------------------------------------ */}
      {/* Supporting area: exams archive + student requests             */}
      {/* ------------------------------------------------------------ */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Exams archive */}
        <div className="flex flex-col justify-between gap-5 rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,40,70,0.06)] sm:p-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {t('home.examsArchive')}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {t('home.examsArchiveDesc')}
              </p>
            </div>
          </div>

          <Link
            href="/exams"
            className="group inline-flex w-fit items-center gap-2 rounded-md text-sm font-semibold text-primary transition-colors duration-fast ease-brand hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <span>{t('home.browseExams')}</span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-base ease-brand group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
            />
          </Link>
        </div>

        {/* Student requests */}
        <div className="flex flex-col justify-between gap-5 rounded-xl border border-white/5 bg-gradient-to-b from-navy-deep to-navy p-5 text-navy-foreground sm:p-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white/10 text-brand-cyan">
              <MessageSquareText className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-white">
                {t('requests.pageTitle')}
              </h2>
              <p className="text-sm leading-6 text-navy-muted">
                {t('requests.pageDescription')}
              </p>
            </div>
          </div>

          <Link
            href="/requests"
            className="group inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors duration-fast ease-brand hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            <span>{t('requests.submit')}</span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 rtl:rotate-180"
            />
          </Link>
        </div>
      </section>
    </div>
  );
}