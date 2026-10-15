'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SubjectCard } from '@/components/subject-card';
import { LoadingState, EmptyState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import type { Subject } from '@/lib/types';

export default function SubjectsPage() {
  const { t } = useI18n();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filtered, setFiltered] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      const [{ data: subs }, { data: res }] = await Promise.all([
        supabase.from('subjects').select('*').order('sort_order'),
        supabase.from('resources').select('subject_id').eq('published', true),
      ]);

      const subjectList = subs as Subject[] || [];
      setSubjects(subjectList);

      const countMap: Record<string, number> = {};
      (res || []).forEach((r) => {
        const sid = (r as { subject_id: string }).subject_id;
        countMap[sid] = (countMap[sid] || 0) + 1;
      });
      setCounts(countMap);

      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(subjects);
    } else {
      setFiltered(
        subjects.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q)
        )
      );
    }
  }, [search, subjects]);

  if (loading) return <LoadingState message={t('subjects.loading')} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('subjects.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('subjects.subtitle', { count: subjects.length })}
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            placeholder={t('subjects.filterPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rtl:pl-3 rtl:pr-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={search ? t('subjects.noMatch') : t('subjects.noSubjects')}
          description={search ? t('subjects.noMatchDesc') : t('subjects.noSubjectsDesc')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} resourceCount={counts[subject.id] || 0} />
          ))}
        </div>
      )}
    </div>
  );
}
