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
  type LucideIcon,
} from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}

/**
 * Desktop navigation link with an underline-style active state.
 * The underline grows from the inline-start edge (mirrors in RTL) and sits
 * flush with the header's bottom border.
 */
function NavLink({ href, label, icon: Icon, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-full shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium',
        'transition-colors duration-fast ease-brand xl:px-3',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        // Underline indicator
        'after:absolute after:bottom-0 after:inset-x-2 after:h-0.5 after:rounded-full xl:after:inset-x-3',
        'after:origin-left rtl:after:origin-right after:scale-x-0',
        'after:transition-transform after:duration-base after:ease-brand',
        active
          ? 'text-foreground after:scale-x-100 after:bg-primary'
          : 'text-muted-foreground hover:text-foreground hover:after:scale-x-100 hover:after:bg-primary/40'
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors duration-fast ease-brand',
          active && 'text-primary'
        )}
        aria-hidden="true"
      />
      <span className="hidden whitespace-nowrap xl:inline">{label}</span>
    </Link>
  );
}

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
    {
      href: '/requests',
      label: t('nav.requests'),
      icon: MessageSquareText,
    },
  ];

  if (pathname.startsWith('/login')) return null;

  const isProfileActive = pathname.startsWith('/profile');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          aria-label="FawjHub - Home"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-brand-cyan ring-1 ring-inset ring-white/10">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>

          <span className="text-lg font-bold tracking-tight text-foreground">
            FawjHub
          </span>

          <span className="ms-1 hidden border-s border-border ps-3 text-xs text-muted-foreground 2xl:inline">
            {t('brand.tagline')}
          </span>
        </Link>

        {/* Main navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden h-full min-w-0 flex-1 items-center gap-0.5 md:ms-4 md:flex lg:ms-6"
        >
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive}
              />
            );
          })}

          {isAdmin && (
            <NavLink
              href="/admin"
              label={t('nav.admin')}
              icon={Shield}
              active={pathname.startsWith('/admin')}
            />
          )}
        </nav>

        {/* Preferences and account */}
        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <ThemeToggle />

          <span
            aria-hidden="true"
            className="mx-0.5 hidden h-5 w-px bg-border sm:block"
          />

          {user ? (
            <>
              <Link
                href="/profile"
                aria-label={t('nav.profile')}
                title={t('nav.profile')}
                aria-current={isProfileActive ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-fast ease-brand',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isProfileActive
                    ? 'border-primary/40 bg-accent text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-accent hover:text-foreground'
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
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Button variant="default" size="sm" tabIndex={-1}>
                {t('nav.signin')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}