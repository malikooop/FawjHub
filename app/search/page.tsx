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
import type { Resource, ResourceType } from '@/lib/types';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPE_ORDER } from '@/lib/types';

// Sanitize search input to prevent PostgREST filter injection
function sanitizeSearchTerm(input: string): string {
  return input
    .replace(/[%_\\()*]/g, ' ')  // Remove PostgREST/ilike special chars
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100); // Limit length
}

export default function SearchPage() {
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
      // No valid search term — show all published resources
      const { data } = await supabase
        .from('resources')
        .select('*, subject:subjects(*)')
        .eq('published', true)
        .order('download_count', { ascending: false })
        .limit(50);
      setResources(data as Resource[] || []);
    } else {
      // Use the safe RPC function for search
      const { data, error } = await supabase.rpc('search_resources', { search_term: sanitized });
      if (error) {
        setResources([]);
      } else {
        // Map RPC result to Resource[] with nested subject
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
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>

        <form onSubmit={handleSearch} className="relative max-w-2xl">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search resources, subjects, teachers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-10 pr-10 text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ResourceType | 'all')}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {RESOURCE_TYPE_ORDER.filter((t) => t !== 'other').map((type) => (
                <SelectItem key={type} value={type}>{RESOURCE_TYPE_LABELS[type]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {years.length > 0 && (
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
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
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <LoadingState message="Searching..." />
      ) : !hasSearched ? (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" />}
          title="Start searching"
          description="Search across all resources by title, description, subject, or teacher."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" />}
          title="No results found"
          description={query ? `No resources match "${query}".` : 'Try a different search term.'}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            {query && ` for "${query}"`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} showSubject />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
