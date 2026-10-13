'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, FileText, Bookmark, User, Shield } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const { t } = useI18n();

  const navItems = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/subjects', label: t('nav.subjects'), icon: BookOpen },
    { href: '/exams', label: t('nav.exams'), icon: FileText },
    { href: '/bookmarks', label: t('nav.bookmarks'), icon: Bookmark },
    { href: '/profile', label: t('nav.profile'), icon: User },
  ];

  const items = isAdmin
    ? [...navItems.slice(0, 4), { href: '/admin', label: t('nav.admin'), icon: Shield }]
    : navItems;

  if (pathname.startsWith('/login') || pathname.startsWith('/admin/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around px-1 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[0.65rem] font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
