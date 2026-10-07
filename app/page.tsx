'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, FileText, TrendingUp, ArrowRight, BookOpen, Star, Clock, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubjectCard } from '@/components/subject-card';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState, EmptyState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import type { Subject, Resource, Progress } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentResources, setRecentResources] = useState<Resource[]>([]);
  const [importantResources, setImportantResources] = useState<Resource[]>([]);
  const [progressData, setProgressData] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    async function loadData() {
      const [subjectsRes, recentRes, importantRes] = await Promise.all([
        supabase.from('subjects').select('*').order('sort_order'),
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

      setSubjects(subjectsRes.data as Subject[] || []);
      setRecentResources(recentRes.data as Resource[] || []);
      setImportantResources(importantRes.data as Resource[] || []);
      setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('progress')
      .select('*, resource:resources(*, subject:subjects(*))')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setProgressData(data as Progress[] || []));
  }, [user]);

  if (loading) {
    return <LoadingState message="Loading your study hub..." />;
  }

  const completedCount = progressData.filter((p) => p.completed).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero / Search */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Welcome to FawjHub'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your university's academic resources, organized in one place.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for a course, TD, TP, exam..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-10 pr-4 text-base"
          />
        </form>
      </section>

      {/* Progress Quick Stats */}
      {user && progressData.length > 0 && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{subjects.length}</p>
                <p className="text-xs text-muted-foreground">Subjects</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progressData.length}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {recentResources.reduce((sum, r) => sum + r.download_count, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Downloads</p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Subjects Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Subjects</h2>
          <Link href="/subjects">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              View all
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {subjects.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title="No subjects yet"
            description="Subjects will appear here once they're added."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recently Added */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recently Added</h2>
            <Link href="/search">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                Browse
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {recentResources.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No resources yet"
              description="New resources will appear here."
            />
          ) : (
            <div className="space-y-3">
              {recentResources.slice(0, 4).map((resource) => (
                <ResourceCard key={resource.id} resource={resource} showSubject />
              ))}
            </div>
          )}
        </section>

        {/* Important Resources */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Star className="h-4 w-4 text-warning" />
              Important Resources
            </h2>
          </div>
          {importantResources.length === 0 ? (
            <EmptyState
              icon={<Star className="h-6 w-6" />}
              title="No important resources"
              description="Key resources will be highlighted here."
            />
          ) : (
            <div className="space-y-3">
              {importantResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} showSubject />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick Access to Exams */}
      <section>
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Previous Exams Archive</h3>
                <p className="text-sm text-muted-foreground">
                  Access past exams and corrections across all subjects.
                </p>
              </div>
            </div>
            <Link href="/exams">
              <Button className="gap-2">
                Browse Exams
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
