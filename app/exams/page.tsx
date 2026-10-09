'use client';

import { useEffect, useState, useMemo } from 'react';
import { FileText, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState, EmptyState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import type { Resource, Subject } from '@/lib/types';

export default function ExamsPage() {
  const { t } = useI18n();
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      const [examsRes, subjectsRes] = await Promise.all([
        supabase
          .from('resources')
          .select('*, subject:subjects(*)')
          .eq('published', true)
          .in('resource_type', ['exam', 'correction'])
          .order('academic_year', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').order('sort_order'),
      ]);

      setResources(examsRes.data as Resource[] || []);
      setSubjects(subjectsRes.data as Subject[] || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (subjectFilter !== 'all' && r.subject_id !== subjectFilter) return false;
      if (typeFilter !== 'all' && r.resource_type !== typeFilter) return false;
      return true;
    });
  }, [resources, subjectFilter, typeFilter]);

  if (loading) return <LoadingState message={t('exams.loading')} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('exams.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('exams.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder={t('nav.subjects')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('exams.allSubjects')}</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('search.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('exams.allTypes')}</SelectItem>
            <SelectItem value="exam">{t('exams.exams')}</SelectItem>
            <SelectItem value="correction">{t('exams.corrections')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={t('exams.noResults')}
          description={t('exams.noResultsDesc')}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('subjects.resources', { count: filtered.length })}
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
