'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Upload, Loader2, FileText, X, Save, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/states';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import type { Subject, ResourceType, Resource } from '@/lib/types';
import { RESOURCE_TYPE_ORDER } from '@/lib/types';
import { formatFileSize } from '@/lib/format';
import { validateFile, sanitizeFileName, ALLOWED_EXTENSIONS } from '@/lib/file-validation';
import { toast } from 'sonner';

export default function AdminUploadPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const editId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    resource_type: 'cours' as ResourceType,
    semester: '1',
    academic_year: '2024-2025',
    teacher: '',
    file_url: '',
    file_name: '',
    file_size: 0,
    file_type: 'application/pdf',
    published: true,
    is_important: false,
  });

  useEffect(() => {
    async function load() {
      const { data: subs } = await supabase.from('subjects').select('*').order('sort_order');
      setSubjects(subs as Subject[] || []);

      if (editId) {
        const { data: res } = await supabase
          .from('resources')
          .select('*')
          .eq('id', editId)
          .maybeSingle();

        if (res) {
          const r = res as Resource;
          setForm({
            title: r.title || '',
            description: r.description || '',
            subject_id: r.subject_id || '',
            resource_type: r.resource_type,
            semester: String(r.semester || 1),
            academic_year: r.academic_year || '',
            teacher: r.teacher || '',
            file_url: r.file_url || '',
            file_name: r.file_name || '',
            file_size: r.file_size || 0,
            file_type: r.file_type || 'application/pdf',
            published: r.published,
            is_important: r.is_important,
          });
        }
      }
      setLoading(false);
    }
    load();
  }, [editId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, t);
    if (!validation.valid) {
      setFileError(validation.error || t('admin.invalidFile'));
      setSelectedFile(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setForm((prev) => ({
      ...prev,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'application/pdf',
    }));

    if (!form.title) {
      setForm((prev) => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setForm((p) => ({ ...p, file_name: '', file_size: 0, file_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return form.file_url || null;
    setUploadProgress(5);

    const safeName = sanitizeFileName(selectedFile.name);
    const ext = safeName.substring(safeName.lastIndexOf('.'));
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = `resources/${fileName}`;

    setUploadProgress(20);

    const { error } = await supabase.storage
      .from('resources')
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      setUploadProgress(0);
      toast.error(t('admin.fileUploadFailed', { message: error.message }));
      return null;
    }

    setUploadProgress(80);

    const { data: urlData } = supabase.storage
      .from('resources')
      .getPublicUrl(filePath);

    setUploadProgress(100);
    return urlData.publicUrl;
  };

  const deleteUploadedFile = async (fileUrl: string) => {
    try {
      const url = new URL(fileUrl);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/resources\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('resources').remove([pathMatch[1]]);
      }
    } catch {
      // URL parsing failed — nothing to clean up
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error(t('admin.titleRequired'));
      return;
    }
    if (!form.subject_id) {
      toast.error(t('admin.subjectRequired'));
      return;
    }

    setSaving(true);

    let fileUrl = form.file_url;
    let fileWasUploaded = false;

    // Step 1: Upload file first if a new file is selected
    if (selectedFile) {
      const uploadedUrl = await uploadFile();
      if (!uploadedUrl) {
        setSaving(false);
        setUploadProgress(0);
        return; // Error already shown
      }
      fileUrl = uploadedUrl;
      fileWasUploaded = true;
    }

    setUploadProgress(0);

    // Step 2: Create/update the database record
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      subject_id: form.subject_id,
      resource_type: form.resource_type,
      semester: parseInt(form.semester),
      academic_year: form.academic_year.trim(),
      teacher: form.teacher.trim(),
      file_url: fileUrl,
      file_name: form.file_name,
      file_size: form.file_size,
      file_type: form.file_type,
      published: form.published,
      is_important: form.is_important,
      uploaded_by: user?.id ?? null,
      status: form.published ? 'published' : 'draft',
    };

    if (editId) {
      const { error } = await supabase.from('resources').update(payload).eq('id', editId);
      if (error) {
        toast.error(t('admin.updateFailed', { message: error.message }));
        if (fileWasUploaded && fileUrl) await deleteUploadedFile(fileUrl);
      } else {
        toast.success(t('admin.resourceUpdated'));
        router.push('/admin/resources');
      }
    } else {
      const { error } = await supabase.from('resources').insert(payload);
      if (error) {
        toast.error(t('admin.createFailed', { message: error.message }));
        if (fileWasUploaded && fileUrl) await deleteUploadedFile(fileUrl);
      } else {
        toast.success(t('admin.resourceUploaded'));
        router.push('/admin/resources');
      }
    }

    setSaving(false);
  };

  if (loading) return <LoadingState message={t('admin.loadingForm')} />;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {editId ? t('admin.editTitle') : t('admin.uploadTitle')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {editId ? t('admin.editDesc') : t('admin.uploadDesc')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('admin.pdfFile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fileError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-lg border bg-secondary/50 p-3">
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size, locale)}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : form.file_url ? (
              <div className="flex items-center gap-3 rounded-lg border bg-secondary/50 p-3">
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{form.file_name || t('admin.existingFile')}</p>
                  <p className="text-xs text-muted-foreground">{t('admin.currentlyLinked')}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {t('admin.replace')}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium">{t('admin.clickToUpload')}</span>
                <span className="text-xs">{t('admin.acceptedFormats', { formats: ALLOWED_EXTENSIONS.join(', ') })}</span>
              </button>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{t('admin.uploading', { percent: uploadProgress })}</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('admin.details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('admin.titleLabel')}</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t('admin.titlePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('admin.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('admin.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subject">{t('admin.subjectLabel')}</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger id="subject">
                    <SelectValue placeholder={t('admin.selectSubject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t('admin.typeLabel')}</Label>
                <Select value={form.resource_type} onValueChange={(v) => setForm({ ...form, resource_type: v as ResourceType })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPE_ORDER.map((type) => (
                      <SelectItem key={type} value={type}>{t(`type.${type}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="semester">{t('admin.semester')}</Label>
                <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                  <SelectTrigger id="semester">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('admin.semester1')}</SelectItem>
                    <SelectItem value="2">{t('admin.semester2')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">{t('admin.academicYear')}</Label>
                <Input
                  id="year"
                  value={form.academic_year}
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                  placeholder="2024-2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher">{t('admin.teacherLabel')}</Label>
                <Input
                  id="teacher"
                  value={form.teacher}
                  onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                  placeholder={t('admin.teacherPlaceholder')}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.published}
                  onCheckedChange={(checked) => setForm({ ...form, published: checked })}
                  id="published"
                />
                <Label htmlFor="published" className="cursor-pointer">{t('admin.published')}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_important}
                  onCheckedChange={(checked) => setForm({ ...form, is_important: checked })}
                  id="important"
                />
                <Label htmlFor="important" className="cursor-pointer">{t('admin.markImportant')}</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/resources')}>
            {t('admin.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}
            {editId ? t('admin.saveChanges') : t('admin.uploadResource')}
          </Button>
        </div>
      </form>
    </div>
  );
}
