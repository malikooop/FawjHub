'use client';

import { Calculator as CalculatorIcon } from 'lucide-react';
import { GradeCalculator } from '@/components/grade-calculator';
import { useI18n } from '@/lib/i18n';

export default function CalculatorPage() {
  const { t } = useI18n();
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 py-2">
      <header className="max-w-2xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary"><CalculatorIcon className="h-4 w-4" aria-hidden="true" />{t('calculator.eyebrow')}</div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('calculator.title')}</h1>
        <p className="text-base leading-7 text-muted-foreground">{t('calculator.description')}</p>
      </header>
      <GradeCalculator />
      <p className="text-sm leading-6 text-muted-foreground">{t('calculator.disclaimer')}</p>
    </main>
  );
}
