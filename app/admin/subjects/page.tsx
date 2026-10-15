'use client';

import { useEffect, useState } from 'react';
import { Plus, BookOpen, Trash2, Edit3, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import type { Subject } from '@/lib/types';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/confirm-dialog';
import { useI18n } from '@/lib/i18n';

const ICON_OPTIONS = ['BookOpen', 'Binary', 'Cpu', 'BarChart3', 'Code', 'Monitor', 'Database', 'FunctionSquare', 'Brain', 'Calculator', 'Network', 'FlaskConical'];

const COLOR_OPTIONS = ['#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#4f46e5'];

export default function AdminSubjectsPage() {
  const { t } = useI18n();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    code: '',
    semester: '1',
    color: '#2563eb',
    icon: 'BookOpen',
    sort_order: '0',
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('sort_order');
    setSubjects(data as Subject[] || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', code: '', semester: '1', color: '#2563eb', icon: 'BookOpen', sort_order: String(subjects.length + 1) });
    setDialogOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditing(subject);
    setForm({
      name: subject.name,
      slug: subject.slug,
      description: subject.description,
      code: subject.code,
      semester: String(subject.semester),
      color: subject.color,
      icon: subject.icon,
      sort_order: String(subject.sort_order),
    });
    setDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error(t('admin.nameRequired'));
      return;
    }

    setSaving(true);
    const slug = form.slug || generateSlug(form.name);
    const payload = {
      name: form.name,
      slug,
      description: form.description,
      code: form.code,
      semester: parseInt(form.semester),
      color: form.color,
      icon: form.icon,
      sort_order: parseInt(form.sort_order) || 0,
    };

    if (editing) {
      const { error } = await supabase.from('subjects').update(payload).eq('id', editing.id);
      if (error) {
        toast.error(t('admin.failedUpdate', { message: error.message }));
      } else {
        toast.success(t('admin.subjectUpdated'));
        setDialogOpen(false);
        loadSubjects();
      }
    } else {
      const { error } = await supabase.from('subjects').insert(payload);
      if (error) {
        toast.error(t('admin.failedCreate', { message: error.message }));
      } else {
        toast.success(t('admin.subjectCreated'));
        setDialogOpen(false);
        loadSubjects();
      }
    }
    setSaving(false);
  };

  const handleDelete = (id: string, name: string) => {
    confirm({
      title: t('confirm.deleteSubject'),
      description: t('confirm.deleteSubjectDesc', { name }),
      confirmLabel: t('admin.delete'),
      destructive: true,
      onConfirm: async () => {
        const { error } = await supabase.from('subjects').delete().eq('id', id);
        if (error) {
          toast.error(t('admin.failedDelete', { message: error.message }));
        } else {
          toast.success(t('admin.subjectDeleted'));
          setSubjects(subjects.filter((s) => s.id !== id));
        }
      },
    });
  };

  if (loading) return <LoadingState message={t('subjects.loading')} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {dialog}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin.subjects')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.manageSubjects', { count: subjects.length })}</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('admin.newSubject')}
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={t('admin.noSubjects')}
          description={t('admin.noSubjectsDesc')}
          action={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> {t('admin.newSubject')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
                    >
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{subject.name}</h3>
                      {subject.code && <p className="text-xs text-muted-foreground">{subject.code}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(subject)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(subject.id, subject.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {subject.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{subject.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-secondary px-1.5 py-0.5">{t('admin.semesterShort', { n: subject.semester })}</span>
                  <span dir="ltr">/{subject.slug}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('admin.editSubject') : t('admin.newSubject')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subj-name">{t('admin.nameLabel')}</Label>
              <Input
                id="subj-name"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value, slug: editing ? form.slug : generateSlug(e.target.value) });
                }}
                placeholder={t('admin.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subj-slug">{t('admin.slug')}</Label>
              <Input
                id="subj-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="algorithms"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subj-desc">{t('admin.subjectDesc')}</Label>
              <Textarea
                id="subj-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('admin.subjectDescPlaceholder')}
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="subj-code">{t('admin.code')}</Label>
                <Input
                  id="subj-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="INF301"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subj-sem">{t('admin.semester')}</Label>
                <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                  <SelectTrigger id="subj-sem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('admin.semesterShort', { n: 1 })}</SelectItem>
                    <SelectItem value="2">{t('admin.semesterShort', { n: 2 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subj-order">{t('admin.sortOrder')}</Label>
                <Input
                  id="subj-order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.color')}</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`h-8 w-8 rounded-lg transition-all ${form.color === color ? 'ring-2 ring-ring ring-offset-2' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('admin.icon')}</Label>
              <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('admin.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {editing ? t('admin.save') : t('admin.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
