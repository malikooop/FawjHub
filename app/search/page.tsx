'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search as SearchIcon, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState, EmptyState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import type { Resource, ResourceType } from '@/lib/types';
import { RESOURCE_TYPE_ORDER } from '@/lib/types';

function sanitizeSearchTerm(input: string): string {
  return input
    .replace(/[%_\\()*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

export default function SearchPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const years = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => r.academic_year && set.add(r.academic_year));
    return Array.from(set).sort().reverse();
  }, [resources]);

  useEffect(() => {
    if (!initialQuery) return;
    performSearch(initialQuery);
  }, [initialQuery]);

  const performSearch = async (q: string) => {
    setLoading(true);
    setHasSearched(true);

    const sanitized = sanitizeSearchTerm(q);

    if (!sanitized) {
      const { data } = await supabase
        .from('resources')
        .select('*, subject:subjects(*)')
        .eq('published', true)
        .order('download_count', { ascending: false })
        .limit(50);
      setResources(data as Resource[] || []);
    } else {
      const { data, error } = await supabase.rpc('search_resources', { search_term: sanitized });
      if (error) {
        setResources([]);
      } else {
        const mapped = (data || []).map((row: Record<string, unknown>) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          subject_id: row.subject_id,
          resource_type: row.resource_type,
          semester: row.semester,
          academic_year: row.academic_year,
          teacher: row.teacher,
          file_url: row.file_url,
          file_name: row.file_name,
          file_size: row.file_size,
          file_type: row.file_type,
          published: row.published,
          is_important: row.is_important,
          download_count: row.download_count,
          uploaded_by: row.uploaded_by,
          sha256: row.sha256,
          status: row.status,
          corrects_resource_id: row.corrects_resource_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          subject: row.subject_id_1 ? {
            id: row.subject_id_1,
            name: row.subject_name,
            slug: row.subject_slug,
            description: row.subject_description,
            code: row.subject_code,
            semester: row.subject_semester,
            color: row.subject_color,
            icon: row.subject_icon,
            sort_order: row.subject_sort_order,
            created_at: row.subject_created_at,
            updated_at: row.subject_updated_at,
          } : undefined,
        })) as Resource[];
        setResources(mapped);
      }
    }

    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search');
    performSearch(trimmed);
  };

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (typeFilter !== 'all' && r.resource_type !== typeFilter) return false;
      if (yearFilter !== 'all' && r.academic_year !== yearFilter) return false;
      return true;
    });
  }, [resources, typeFilter, yearFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('search.title')}</h1>

        <form onSubmit={handleSearch} className="relative max-w-2xl">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3.5" />
          <Input
            type="search"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-10 pr-10 text-base rtl:pl-10 rtl:pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rtl:right-auto rtl:left-3"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* Filters */}
      {hasSearched && resources.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('search.filter')}</span>
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ResourceType | 'all')}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder={t('search.allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.allTypes')}</SelectItem>
              {RESOURCE_TYPE_ORDER.filter((tp) => tp !== 'other').map((type) => (
                <SelectItem key={type} value={type}>{t(`type.${type}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {years.length > 0 && (
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder={t('search.allYears')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('search.allYears')}</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(typeFilter !== 'all' || yearFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setTypeFilter('all'); setYearFilter('all'); }}
              className="text-muted-foreground"
            >
              {t('search.clearFilters')}
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <LoadingState message={t('search.searching')} />
      ) : !hasSearched ? (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" />}
          title={t('search.startSearching')}
          description={t('search.startSearchingDesc')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" />}
          title={t('search.noResults')}
          description={query ? t('search.noResultsDesc', { query }) : t('search.tryDifferent')}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('search.resultsFor', { count: filtered.length, query })}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} showSubject typeLabel={t(`type.${resource.resource_type}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
