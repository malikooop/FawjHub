'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

export function LanguageToggle() {
  const { locale, toggleLocale } = useI18n();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      className="gap-1.5 px-2 text-sm font-medium"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span>{locale === 'en' ? 'ع' : 'EN'}</span>
    </Button>
  );
}
