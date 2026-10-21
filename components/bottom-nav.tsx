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
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 md:hidden',
        'border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85',
        'pb-[env(safe-area-inset-bottom)]'
      )}
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-14 w-full min-w-0 flex-col items-center justify-center gap-1 px-1',
                  'transition-colors duration-fast ease-brand',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  isActive
                    ? 'text-primary dark:text-blue-300'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Active marker: a shape cue, so state never depends on color alone */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary dark:bg-blue-300',
                    'transition-opacity duration-fast ease-brand',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Icon
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0"
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                <span
                  className={cn(
                    'block max-w-full truncate text-[11px] leading-none',
                    isActive ? 'font-semibold' : 'font-medium'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}