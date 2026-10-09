'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Upload, FileText, Trash2, Edit3, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResourceTypeBadge } from '@/components/resource-type-badge';
import { LoadingState, EmptyState } from '@/components/states';
import { useConfirmDialog } from '@/components/confirm-dialog';
import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import type { Resource, Subject, ResourceType } from '@/lib/types';
import { RESOURCE_TYPE_ORDER } from '@/lib/types';
import { formatRelativeDate, formatDownloadCount, formatFileSize } from '@/lib/format';
import { toast } from 'sonner';

export default function AdminResourcesPage() {
  const { t } = useI18n();
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const { confirm, dialog } = useConfirmDialog();

  useEffect(() => {
    async function load() {
      const [resRes, subjRes] = await Promise.all([
        supabase
          .from('resources')
          .select('*, subject:subjects(*)')
          .order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').order('sort_order'),
      ]);
      setResources(resRes.data as Resource[] || []);
      setSubjects(subjRes.data as Subject[] || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (typeFilter !== 'all' && r.resource_type !== typeFilter) return false;
      if (subjectFilter !== 'all' && r.subject_id !== subjectFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return r.title.toLowerCase().includes(q) || (r.teacher || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [resources, typeFilter, subjectFilter, search]);

  const handleDelete = (id: string, title: string) => {
    confirm({
      title: t('confirm.deleteResource'),
      description: t('confirm.deleteResourceDesc', { title }),
      confirmLabel: t('admin.delete'),
      destructive: true,
      onConfirm: async () => {
        const { error } = await supabase.from('resources').delete().eq('id', id);
        if (error) {
          toast.error('Failed to delete resource');
        } else {
          toast.success('Resource deleted');
          setResources(resources.filter((r) => r.id !== id));
        }
      },
    });
  };

  const togglePublished = async (resource: Resource) => {
    const { error } = await supabase
      .from('resources')
      .update({ published: !resource.published, status: !resource.published ? 'published' : 'draft' })
      .eq('id', resource.id);
    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success(resource.published ? t('admin.unpublish') : t('admin.publish'));
      setResources(resources.map((r) => r.id === resource.id ? {
        ...r,
        published: !r.published,
        status: !r.published ? 'published' : 'draft',
      } : r));
    }
  };

  if (loading) return <LoadingState message={t('admin.loadingResources')} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {dialog}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin.resources')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.manageAll', { count: resources.length })}</p>
        </div>
        <Link href="/admin/upload">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            {t('admin.upload')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            placeholder={t('admin.searchResources')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rtl:pl-3 rtl:pr-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ResourceType | 'all')}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder={t('search.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allTypes')}</SelectItem>
            {RESOURCE_TYPE_ORDER.map((type) => (
              <SelectItem key={type} value={type}>{t(`type.${type}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder={t('nav.subjects')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.allSubjects')}</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resource List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={t('admin.noResources')}
          description={t('admin.noResourcesDesc')}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/resources/${resource.id}`} className="text-sm font-medium hover:text-primary line-clamp-1">
                    {resource.title}
                  </Link>
                  {!resource.published && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                      {t('admin.draft')}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <ResourceTypeBadge type={resource.resource_type} label={t(`type.${resource.resource_type}`)} />
                  {resource.subject && <span>{resource.subject.name}</span>}
                  <span>{formatDownloadCount(resource.download_count)} {t('resource.downloads').toLowerCase()}</span>
                  {resource.file_size > 0 && <span>{formatFileSize(resource.file_size)}</span>}
                  <span>{formatRelativeDate(resource.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => togglePublished(resource)}
                  title={resource.published ? t('admin.unpublish') : t('admin.publish')}
                >
                  {resource.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Link href={`/admin/upload?id=${resource.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title={t('admin.edit')}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(resource.id, resource.title)}
                  title={t('admin.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
