'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, CheckCircle2, Clock, BookOpen, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState, EmptyState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import type { Resource, Progress as ProgressType, ResourceView, Subject } from '@/lib/types';
import { RESOURCE_TYPE_LABELS } from '@/lib/types';

export default function ProfilePage() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [progressItems, setProgressItems] = useState<ProgressType[]>([]);
  const [recentViews, setRecentViews] = useState<ResourceView[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      if (!user) return;
      const [progressRes, viewsRes, subjectsRes] = await Promise.all([
        supabase
          .from('progress')
          .select('*, resource:resources(*, subject:subjects(*))')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('resource_views')
          .select('*, resource:resources(*, subject:subjects(*))')
          .eq('user_id', user.id)
          .order('viewed_at', { ascending: false })
          .limit(10),
        supabase.from('subjects').select('*').order('sort_order'),
      ]);

      setProgressItems(progressRes.data as ProgressType[] || []);
      setRecentViews(viewsRes.data as ResourceView[] || []);
      setSubjects(subjectsRes.data as Subject[] || []);
      setLoading(false);
    }
    load();
  }, [user]);

  if (authLoading || loading) return <LoadingState message="Loading profile..." />;

  if (!user) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Sign in to track your progress"
          description="Create an account to bookmark resources, track completion, and view your study history."
          action={
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const completed = progressItems.filter((p) => p.completed).length;
  const inProgress = progressItems.length - completed;

  // Group progress by subject
  const bySubject: Record<string, { total: number; completed: number; subject: Subject }> = {};
  progressItems.forEach((p) => {
    if (!p.resource) return;
    const sid = p.resource.subject_id;
    const subj = p.resource.subject || subjects.find((s) => s.id === sid);
    if (!bySubject[sid]) {
      bySubject[sid] = { total: 0, completed: 0, subject: subj as Subject };
    }
    bySubject[sid].total++;
    if (p.completed) bySubject[sid].completed++;
  });

  // Type breakdown
  const byType: Record<string, number> = {};
  progressItems.forEach((p) => {
    if (!p.resource) return;
    byType[p.resource.resource_type] = (byType[p.resource.resource_type] || 0) + 1;
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
            {(profile?.full_name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile?.full_name || 'Student'}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{progressItems.length}</p>
              <p className="text-xs text-muted-foreground">Total Tracked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress by Subject */}
      {Object.keys(bySubject).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Progress by Subject
          </h2>
          <div className="space-y-3">
            {Object.entries(bySubject).map(([sid, data]) => {
              const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
              return (
                <Card key={sid}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Link href={`/subjects/${data.subject?.slug}`} className="font-medium text-sm hover:text-primary">
                        {data.subject?.name || 'Unknown'}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {data.completed}/{data.total} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      {recentViews.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Recently Accessed</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentViews.slice(0, 6).map((view) => view.resource && (
              <ResourceCard key={view.id} resource={view.resource} showSubject />
            ))}
          </div>
        </section>
      )}

      {/* Currently In Progress */}
      {progressItems.filter((p) => !p.completed && p.resource).length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Continue Studying</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {progressItems.filter((p) => !p.completed).slice(0, 4).map((p) => p.resource && (
              <ResourceCard key={p.id} resource={p.resource} showSubject />
            ))}
          </div>
        </section>
      )}

      {progressItems.length === 0 && recentViews.length === 0 && (
        <EmptyState
          icon={<TrendingUp className="h-6 w-6" />}
          title="No activity yet"
          description="Start exploring subjects and mark resources as completed to track your progress here."
          action={
            <Link href="/subjects">
              <Button variant="outline">Browse subjects</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
