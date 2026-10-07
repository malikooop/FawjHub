'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { LoadingState } from '@/components/states';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isAdmin) {
      router.push('/');
      return;
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !user || !isAdmin) {
    return <LoadingState message="Checking access..." />;
  }

  return <>{children}</>;
}
