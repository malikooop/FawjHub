'use client';

import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  resourceId: string;
  variant?: 'default' | 'icon';
  className?: string;
}

export function BookmarkButton({ resourceId, variant = 'icon', className }: BookmarkButtonProps) {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('resource_id', resourceId)
      .maybeSingle()
      .then(({ data }) => {
        setBookmarked(!!data);
        setLoading(false);
      });
  }, [user, resourceId]);

  const toggle = async () => {
    if (!user) return;
    setLoading(true);

    if (bookmarked) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('resource_id', resourceId);
      setBookmarked(false);
    } else {
      await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, resource_id: resourceId });
      setBookmarked(true);
    }
    setLoading(false);
  };

  if (!user) return null;

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        disabled={loading}
        aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        className={cn('h-8 w-8', className)}
      >
        {bookmarked ? (
          <BookmarkCheck className="h-4 w-4 text-primary" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={bookmarked ? 'secondary' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={cn('gap-2', className)}
    >
      {bookmarked ? (
        <>
          <BookmarkCheck className="h-4 w-4 text-primary" />
          Bookmarked
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" />
          Bookmark
        </>
      )}
    </Button>
  );
}
