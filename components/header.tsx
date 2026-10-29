'use client';

import { useEffect, useRef, useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* Presentation-only labels for strings that have no translation key yet. */
const UI_LABELS = {
  menu: { en: 'Menu', ar: 'القائمة' },
  main: { en: 'Main navigation', ar: 'التنقل الرئيسي' },
} as const;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy';

export function Header() {
  const pathname = usePathname();
  const { user, isAdmin, signOutWithResult } = useAuth();
  const { t, locale } = useI18n();
  const isAr = locale === 'ar';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the menu after any navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes the menu and returns focus to its button.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // The menu is for narrower widths; close it when the desktop nav takes over.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1280px)');
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

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

  const allItems = isAdmin
    ? [...navItems, { href: '/admin', label: t('nav.admin'), icon: Shield }]
    : navItems;

  const isRouteActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  if (pathname.startsWith('/login')) return null;

  const profileActive = pathname.startsWith('/profile');
  const lang = isAr ? 'ar' : 'en';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-navy-foreground/10 bg-navy text-navy-foreground">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Menu button: below xl, where the full navigation does not fit */}
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={UI_LABELS.menu[lang]}
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-navy-muted xl:hidden',
            'transition-colors duration-fast ease-brand hover:bg-navy-foreground/10 hover:text-navy-foreground',
            focusRing
          )}
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {/* Brand */}
        <Link
          href="/"
          aria-label={`${isAr ? 'نبراس' : 'Nibras'} - ${t('nav.home')}`}
          className={cn('flex shrink-0 items-center gap-2.5 rounded-md', focusRing)}
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-foreground/15 bg-navy-foreground/5 text-navy-accent"
          >
            <GraduationCap className="h-5 w-5" />
          </span>

          <span className="text-lg font-bold leading-none tracking-tight rtl:tracking-normal">
            {isAr ? 'نبراس' : 'Nibras'}
          </span>

          <span className="hidden border-s border-navy-foreground/20 ps-2.5 text-xs text-navy-muted 2xl:inline">
            {t('brand.tagline')}
          </span>
        </Link>

        {/* Main navigation: xl and up */}
        <nav
          aria-label={UI_LABELS.main[lang]}
          className="ms-4 hidden min-w-0 items-stretch gap-0.5 xl:flex"
        >
          {allItems.map((item) => {
            const active = isRouteActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-16 shrink-0 items-center whitespace-nowrap px-2.5 text-sm font-medium',
                  'transition-colors duration-fast ease-brand',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-accent',
                  active
                    ? 'text-navy-foreground'
                    : 'text-navy-muted hover:text-navy-foreground'
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-2.5 bottom-0 h-0.5 rounded-t-full bg-navy-accent',
                    'transition-opacity duration-fast ease-brand',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* Account and preferences */}
        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <ThemeToggle />

          {user ? (
            <>
              <Link
                href="/profile"
                aria-label={t('nav.profile')}
                title={t('nav.profile')}
                aria-current={profileActive ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-fast ease-brand',
                  focusRing,
                  profileActive
                    ? 'border-navy-foreground/30 bg-navy-foreground/10 text-navy-foreground'
                    : 'border-navy-foreground/20 text-navy-muted hover:bg-navy-foreground/10 hover:text-navy-foreground'
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
                className={cn(
                  'hidden h-9 w-9 text-navy-muted hover:bg-navy-foreground/10 hover:text-navy-foreground sm:inline-flex',
                  focusRing
                )}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Link
              href="/login"
              className={cn(
                'inline-flex h-9 items-center rounded-md bg-navy-accent px-3.5 text-sm font-semibold text-navy-deep',
                'transition-colors duration-fast ease-brand hover:bg-navy-accent/90',
                focusRing
              )}
            >
              {t('nav.signin')}
            </Link>
          )}
        </div>
      </div>

      {/* Menu panel: below xl */}
      {menuOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-0 bg-navy-deep/60 xl:hidden"
          />
          <div
            id="site-menu"
            className="absolute inset-x-0 top-full z-10 max-h-[calc(100dvh-8rem)] overflow-y-auto border-b border-navy-foreground/10 bg-navy-deep xl:hidden"
          >
            <nav
              aria-label={UI_LABELS.menu[lang]}
              className="mx-auto max-w-7xl px-2 py-2 sm:px-4"
            >
              <ul className="space-y-0.5">
                {allItems.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex h-12 items-center gap-3 rounded-md border-s-2 px-3 text-[15px] font-medium',
                          'transition-colors duration-fast ease-brand',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-accent',
                          active
                            ? 'border-navy-accent bg-navy-foreground/10 text-navy-foreground'
                            : 'border-transparent text-navy-muted hover:bg-navy-foreground/5 hover:text-navy-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}

                {user && (
                  <li className="mt-1 border-t border-navy-foreground/10 pt-1 sm:hidden">
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className={cn(
                        'flex h-12 w-full items-center gap-3 rounded-md border-s-2 border-transparent px-3 text-start text-[15px] font-medium text-navy-muted',
                        'transition-colors duration-fast ease-brand hover:bg-navy-foreground/5 hover:text-navy-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-accent'
                      )}
                    >
                      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 truncate">{t('nav.signout')}</span>
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}