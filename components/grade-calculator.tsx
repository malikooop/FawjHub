'use client';

import { useMemo, useState } from 'react';
import { Calculator, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';

type ModuleRow = { id: number; name: string; grade: string; coefficient: string };
const initialRows: ModuleRow[] = [
  { id: 1, name: '', grade: '', coefficient: '1' },
  { id: 2, name: '', grade: '', coefficient: '1' },
];

export function GradeCalculator() {
  const { t } = useI18n();
  const [rows, setRows] = useState<ModuleRow[]>(initialRows);
  const [nextId, setNextId] = useState(3);

  const result = useMemo(() => {
    const parsed = rows.map((row) => ({
      ...row,
      grade: Number(row.grade),
      coefficient: Number(row.coefficient),
    }));
    const invalid = parsed.some(
      (row) =>
        row.grade < 0 ||
        row.grade > 20 ||
        row.coefficient < 0 ||
        !Number.isFinite(row.grade) ||
        !Number.isFinite(row.coefficient)
    );
    const incomplete = rows.some((row) => row.grade.trim() === '' || row.coefficient.trim() === '');
    const totalCoefficient = parsed.reduce((sum, row) => sum + row.coefficient, 0);
    const weightedTotal = parsed.reduce((sum, row) => sum + row.grade * row.coefficient, 0);
    const hasWeight = totalCoefficient > 0 && Number.isFinite(totalCoefficient);
    return { invalid, incomplete, totalCoefficient, weightedTotal, average: hasWeight ? weightedTotal / totalCoefficient : null };
  }, [rows]);

  const updateRow = (id: number, field: keyof Omit<ModuleRow, 'id'>, value: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = () => {
    setRows((current) => [...current, { id: nextId, name: '', grade: '', coefficient: '1' }]);
    setNextId((id) => id + 1);
  };

  const reset = () => {
    setRows(initialRows);
    setNextId(3);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t('calculator.modules')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('calculator.modulesHint')}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={reset} aria-label={t('calculator.reset')} title={t('calculator.reset')}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-end">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t('calculator.module')} {index + 1}</span>
                <Input value={row.name} onChange={(event) => updateRow(row.id, 'name', event.target.value)} placeholder={t('calculator.modulePlaceholder')} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t('calculator.grade')}</span>
                <Input type="number" min="0" max="20" step="0.01" value={row.grade} onChange={(event) => updateRow(row.id, 'grade', event.target.value)} placeholder="0–20" inputMode="decimal" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t('calculator.coefficient')}</span>
                <Input type="number" min="0" step="0.01" value={row.coefficient} onChange={(event) => updateRow(row.id, 'coefficient', event.target.value)} inputMode="decimal" />
              </label>
              <Button type="button" variant="ghost" size="icon" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} disabled={rows.length === 1} aria-label={t('calculator.remove')} title={t('calculator.remove')}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" className="mt-5 gap-2" onClick={addRow}>
          <Plus className="h-4 w-4" aria-hidden="true" /> {t('calculator.addModule')}
        </Button>
      </section>

      <aside className="h-fit rounded-xl border border-primary/20 bg-primary/[0.05] p-5">
        <div className="flex items-center gap-2 text-primary"><Calculator className="h-5 w-5" aria-hidden="true" /><h2 className="font-semibold">{t('calculator.result')}</h2></div>
        {result.invalid ? (
          <p className="mt-5 text-sm text-destructive">{t('calculator.invalid')}</p>
        ) : result.incomplete ? (
          <p className="mt-5 text-sm text-muted-foreground">{t('calculator.incomplete')}</p>
        ) : result.average !== null ? (
          <p className="mt-4 text-4xl font-semibold tracking-tight">
            {result.average.toFixed(2)}
            <span className="ms-2 text-base font-normal text-muted-foreground">/ 20</span>
          </p>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">{t('calculator.zeroTotal')}</p>
        )}
        <div className="mt-5 border-t border-primary/10 pt-4 text-sm text-muted-foreground"><p>{t('calculator.formula')}</p>{result.totalCoefficient > 0 && <p className="mt-2">{t('calculator.included', { count: rows.filter((row) => row.grade !== '').length })}</p>}</div>
      </aside>
    </div>
  );
}
