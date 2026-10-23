
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  Home,
  BookOpen,
  FileText,
  Bookmark,
  User,
  Shield,
  LogOut,
  Search,
  MessageSquareText,
  Calculator,
} from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function Header() {
  const pathname = usePathname();
  const { user, isAdmin, signOutWithResult } = useAuth();
  const { t } = useI18n();

  const handleSignOut = async () => {
    try {
      const { error } = await signOutWithResult();

      if (error) {
        toast.error(error);
      }
    } catch {
      toast.error('Unable to sign out. Please try again.');
    }
  };

  const navItems = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/subjects', label: t('nav.subjects'), icon: BookOpen },
    { href: '/exams', label: t('nav.exams'), icon: FileText },
    { href: '/bookmarks', label: t('nav.bookmarks'), icon: Bookmark },
    { href: '/search', label: t('nav.search'), icon: Search },
    { href: '/calculator', label: t('nav.calculator'), icon: Calculator },
    {
      href: '/requests',
      label: t('nav.requests'),
      icon: MessageSquareText,
    },
  ];

  if (pathname.startsWith('/login')) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          aria-label="Nibras - Home"
          className="flex shrink-0 items-center gap-2.5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>

          <span className="text-lg font-bold tracking-tight">
            Nibras
          </span>

          <span className="hidden 2xl:inline text-xs text-muted-foreground">
            {t('brand.tagline')}
          </span>
        </Link>

        {/* Main navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden min-w-0 items-center gap-1 md:flex"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors xl:px-3',
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden xl:inline whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              aria-label={t('nav.admin')}
              title={t('nav.admin')}
              aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors xl:px-3',
                pathname.startsWith('/admin')
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden xl:inline whitespace-nowrap">
                {t('nav.admin')}
              </span>
            </Link>
          )}
        </nav>

        {/* Account and preferences */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <ThemeToggle />

          {user ? (
            <>
              <Link
                href="/profile"
                aria-label={t('nav.profile')}
                title={t('nav.profile')}
                aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors',
                  pathname.startsWith('/profile')
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <User className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{t('nav.profile')}</span>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleSignOut()}
                aria-label={t('nav.signout')}
                title={t('nav.signout')}
                className="h-9 w-9"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm">
                {t('nav.signin')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
