'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ResourceCard } from '@/components/resource-card';
import { LoadingState, EmptyState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import type { Bookmark as BookmarkType } from '@/lib/types';

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth();
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

  if (authLoading || loading) return <LoadingState message="Loading bookmarks..." />;

  if (!user) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="Sign in to view bookmarks"
          description="Create an account or sign in to bookmark resources and access them here."
          action={
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
        <p className="text-muted-foreground text-sm">
          {bookmarks.length === 0
            ? 'Your saved resources will appear here.'
            : `${bookmarks.length} bookmarked resource${bookmarks.length !== 1 ? 's' : ''}.`}
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="No bookmarks yet"
          description="Browse subjects and bookmark important resources to find them quickly later."
          action={
            <Link href="/subjects">
              <Button variant="outline">Browse subjects</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((bm) => bm.resource && (
            <ResourceCard key={bm.id} resource={bm.resource} showSubject />
          ))}
        </div>
      )}
    </div>
  );
}
