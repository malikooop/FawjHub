'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState, EmptyState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import type { Bookmark as BookmarkType } from '@/lib/types';

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from('bookmarks')
      .select('*, resource:resources(*, subject:subjects(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBookmarks(data as BookmarkType[] || []);
        setLoading(false);
      });
  }, [user]);

  if (authLoading || loading) return <LoadingState message={t('bookmarks.loading')} />;

  if (!user) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">{t('bookmarks.title')}</h1>
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title={t('bookmarks.signIn')}
          description={t('bookmarks.signInDesc')}
          action={
            <Link href="/login">
              <Button>{t('nav.signin')}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('bookmarks.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {bookmarks.length === 0
            ? t('bookmarks.subtitleEmpty')
            : t('bookmarks.subtitleCount', { count: bookmarks.length })}
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title={t('bookmarks.none')}
          description={t('bookmarks.noneDesc')}
          action={
            <Link href="/subjects">
              <Button variant="outline">{t('common.browseSubjects')}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((bm) => bm.resource && (
            <ResourceCard key={bm.id} resource={bm.resource} showSubject typeLabel={t(`type.${bm.resource.resource_type}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
