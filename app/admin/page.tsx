'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, BookOpen, Download, Upload, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import type { Resource } from '@/lib/types';
import { formatDownloadCount } from '@/lib/format';

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ subjects: 0, resources: 0, downloads: 0, published: 0 });
  const [recentUploads, setRecentUploads] = useState<Resource[]>([]);
  const [topDownloaded, setTopDownloaded] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [subjectsRes, resourcesRes, recentRes, topRes] = await Promise.all([
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('resources').select('id, download_count, published', { count: 'exact' }),
        supabase
          .from('resources')
          .select('*, subject:subjects(*)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('resources')
          .select('*, subject:subjects(*)')
          .order('download_count', { ascending: false })
          .limit(5),
      ]);

      const allResources = (resourcesRes.data || []) as { download_count: number; published: boolean }[];
      setStats({
        subjects: subjectsRes.count || 0,
        resources: resourcesRes.count || 0,
        downloads: allResources.reduce((sum, r) => sum + r.download_count, 0),
        published: allResources.filter((r) => r.published).length,
      });
      setRecentUploads(recentRes.data as Resource[] || []);
      setTopDownloaded(topRes.data as Resource[] || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LoadingState message={t('common.loading')} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin.dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.dashboardSubtitle')}</p>
        </div>
        <Link href="/admin/upload">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            {t('admin.uploadResource')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.subjects}</p>
              <p className="text-xs text-muted-foreground">{t('nav.subjects')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resources}</p>
              <p className="text-xs text-muted-foreground">{t('admin.resources')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatDownloadCount(stats.downloads)}</p>
              <p className="text-xs text-muted-foreground">{t('home.downloads')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.published}</p>
              <p className="text-xs text-muted-foreground">{t('admin.published')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Uploads */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('home.recentlyAdded')}</h2>
            <Link href="/admin/resources">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                {t('admin.resources')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentUploads.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} showSubject showBookmark={false} typeLabel={t(`type.${resource.resource_type}`)} />
            ))}
          </div>
        </section>

        {/* Top Downloaded */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t('subjects.mostDownloaded')}</h2>
          <div className="space-y-3">
            {topDownloaded.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} showSubject showBookmark={false} typeLabel={t(`type.${resource.resource_type}`)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
