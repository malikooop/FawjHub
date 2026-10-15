
'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { MessageSquareText, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/states';
import { toast } from 'sonner';
import type { Subject } from '@/lib/types';

type RequestType =
  | 'resource_request'
  | 'question'
  | 'suggestion'
  | 'content_issue'
  | 'technical_issue'
  | 'other';

type RequestStatus = 'open' | 'in_review' | 'answered' | 'closed';

interface StudentRequest {
  id: string;
  user_id: string;
  request_type: RequestType;
  title: string;
  description: string;
  subject_id: string | null;
  status: RequestStatus;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}

const REQUEST_TYPES: RequestType[] = [
  'resource_request',
  'question',
  'suggestion',
  'content_issue',
  'technical_issue',
  'other',
];

const inputClassName =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export default function RequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();

  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [requestType, setRequestType] =
    useState<RequestType>('resource_request');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const loadData = useCallback(async () => {
    if (!user) {
      setRequests([]);
      setSubjects([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    setLoadError(false);

    try {
      const [requestsResult, subjectsResult] = await Promise.all([
        supabase
          .from('student_requests')
          .select(
            'id, user_id, request_type, title, description, subject_id, status, admin_response, created_at, updated_at'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('subjects')
          .select('*')
          .order('sort_order', { ascending: true }),
      ]);

      if (requestsResult.error) {
        console.error('Failed to load student requests:', requestsResult.error.code);
        setLoadError(true);
      } else {
        setRequests((requestsResult.data ?? []) as StudentRequest[]);
      }

      if (subjectsResult.error) {
        console.error('Failed to load subjects:', subjectsResult.error.code);
      } else {
        setSubjects((subjectsResult.data ?? []) as Subject[]);
      }
    } catch {
      setLoadError(true);
      toast.error(t('requests.loadError'));
    } finally {
      setListLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (authLoading) return;
    void loadData();
  }, [authLoading, loadData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || submitting) return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 150) {
      toast.error(t('requests.titleValidation'));
      return;
    }

    if (cleanDescription.length < 5 || cleanDescription.length > 5000) {
      toast.error(t('requests.descriptionValidation'));
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('student_requests')
        .insert({
          user_id: user.id,
          request_type: requestType,
          title: cleanTitle,
          description: cleanDescription,
          subject_id: subjectId || null,
        });

      if (error) {
        console.error('Failed to create student request:', error.code);
        toast.error(t('requests.submitError'));
        return;
      }

      toast.success(t('requests.created'));
      setTitle('');
      setDescription('');
      setSubjectId('');
      setRequestType('resource_request');

      await loadData();
    } catch {
      toast.error(t('requests.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <LoadingState message={t('profile.loading')} />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">{t('requests.pageTitle')}</h1>
        <EmptyState
          icon={<MessageSquareText className="h-6 w-6" />}
          title={t('requests.loginRequired')}
          description={t('requests.loginRequiredDescription')}
          action={
            <Link href="/login">
              <Button>{t('nav.signin')}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('requests.pageTitle')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('requests.pageDescription')}
            </p>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('requests.formTitle')}</CardTitle>
          <CardDescription>
            {t('requests.formDescription')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="request-type">
                {t('requests.typeLabel')}
              </Label>
              <select
                id="request-type"
                value={requestType}
                onChange={(event) =>
                  setRequestType(event.target.value as RequestType)
                }
                className={inputClassName}
                disabled={submitting}
              >
                {REQUEST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`requests.types.${type}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-subject">
                {t('requests.subjectLabel')}
              </Label>
              <select
                id="request-subject"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                className={inputClassName}
                disabled={submitting}
              >
                <option value="">{t('requests.noSubject')}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-title">
                {t('requests.titleLabel')}
              </Label>
              <Input
                id="request-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={3}
                maxLength={150}
                required
                disabled={submitting}
                placeholder={t('requests.titlePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-description">
                {t('requests.descriptionLabel')}
              </Label>
              <textarea
                id="request-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                minLength={5}
                maxLength={5000}
                required
                rows={5}
                disabled={submitting}
                placeholder={t('requests.descriptionPlaceholder')}
                className={`${inputClassName} min-h-32 resize-y`}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/5000
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              <Send className="me-2 h-4 w-4" />
              {submitting
                ? t('requests.submitting')
                : t('requests.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {t('requests.myRequests')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={listLoading}
          >
            {t('requests.refresh')}
          </Button>
        </div>

        {listLoading ? (
          <LoadingState message={t('profile.loading')} />
        ) : loadError ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t('requests.loadError')}
            </CardContent>
          </Card>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t('requests.empty')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const subject = subjects.find(
                (item) => item.id === request.subject_id
              );

              return (
                <Card key={request.id}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {t(`requests.types.${request.request_type}`)}
                          {subject ? ` · ${subject.name}` : ''}
                        </p>
                        <h3 className="break-words font-semibold">
                          {request.title}
                        </h3>
                      </div>

                      <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                        {t(`requests.status.${request.status}`)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {request.description}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
                    </p>

                    {request.admin_response && (
                      <div className="space-y-1 rounded-lg border bg-muted/40 p-4">
                        <p className="text-sm font-semibold">
                          {t('requests.adminResponse')}
                        </p>
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {request.admin_response}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
