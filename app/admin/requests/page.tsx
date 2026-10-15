'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquareText,
  RefreshCw,
  Save,
  Loader2,
  UserRound,
  Trash2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/states';
import { toast } from 'sonner';

type RequestType =
  | 'resource_request'
  | 'question'
  | 'suggestion'
  | 'content_issue'
  | 'technical_issue'
  | 'other';

type RequestStatus =
  | 'open'
  | 'in_review'
  | 'answered'
  | 'closed';

interface StudentRequest {
  id: string;
  user_id: string;
  request_type: RequestType;
  title: string;
  description: string;
  subject_id: string | null;
  status: RequestStatus;
  admin_response: string | null;
  handled_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RequestSubject {
  id: string;
  name: string;
}

interface RequestProfile {
  id: string;
  full_name: string | null;
}

interface RequestDraft {
  status: RequestStatus;
  response: string;
}

const statuses: RequestStatus[] = [
  'open',
  'in_review',
  'answered',
  'closed',
];

const requestTypes: RequestType[] = [
  'resource_request',
  'question',
  'suggestion',
  'content_issue',
  'technical_issue',
  'other',
];

export default function AdminRequestsPage() {
  const { t, locale } = useI18n();

  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [subjects, setSubjects] = useState<RequestSubject[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, RequestDraft>>({});

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isBusy = savingId !== null || deletingId !== null;

  const [statusFilter, setStatusFilter] =
    useState<RequestStatus | 'all'>('all');

  const [typeFilter, setTypeFilter] =
    useState<RequestType | 'all'>('all');

  // Load requests, subjects, and requester names.
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const [requestsResult, subjectsResult] = await Promise.all([
        supabase
          .from('student_requests')
          .select(
            'id, user_id, request_type, title, description, subject_id, status, admin_response, handled_by, created_at, updated_at'
          )
          .order('created_at', { ascending: false }),

        supabase
          .from('subjects')
          .select('id, name')
          .order('sort_order', { ascending: true }),
      ]);

      if (requestsResult.error) {
        console.error(
          'Failed to load admin requests:',
          requestsResult.error.code
        );

        setLoadError(true);
        toast.error(t('requests.adminLoadError'));
        return;
      }

      const rows = (requestsResult.data ?? []) as StudentRequest[];

      setRequests(rows);

      setDrafts(
        Object.fromEntries(
          rows.map((request) => [
            request.id,
            {
              status: request.status,
              response: request.admin_response ?? '',
            },
          ])
        )
      );

      if (subjectsResult.error) {
        console.error(
          'Failed to load request subjects:',
          subjectsResult.error.code
        );
      } else {
        setSubjects(
          (subjectsResult.data ?? []) as RequestSubject[]
        );
      }

      const userIds = Array.from(
        new Set(rows.map((request) => request.user_id))
      );

      if (userIds.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (error) {
          console.error(
            'Failed to load request profiles:',
            error.code
          );

          setProfiles({});
        } else {
          const profileRows = (data ?? []) as RequestProfile[];

          setProfiles(
            Object.fromEntries(
              profileRows.map((profile) => [
                profile.id,
                profile.full_name?.trim() || '',
              ])
            )
          );
        }
      } else {
        setProfiles({});
      }
    } catch {
      setLoadError(true);
      toast.error(t('requests.adminLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  // Update the unsaved status or response of a request.
  const updateDraft = (
    id: string,
    changes: Partial<RequestDraft>
  ) => {
    setDrafts((previous) => {
      const request = requests.find((item) => item.id === id);

      if (!request) return previous;

      return {
        ...previous,
        [id]: {
          status: previous[id]?.status ?? request.status,
          response:
            previous[id]?.response ??
            request.admin_response ??
            '',
          ...changes,
        },
      };
    });
  };

  // Save an administrator's response and status.
  const saveRequest = async (request: StudentRequest) => {
    const draft = drafts[request.id];

    if (!draft || isBusy) return;

    const response = draft.response.trim();

    if (response.length > 5000) {
      toast.error(t('requests.adminResponseTooLong'));
      return;
    }

    setSavingId(request.id);

    try {
      const { data, error } = await supabase
        .from('student_requests')
        .update({
          status: draft.status,
          admin_response: response || null,
        })
        .eq('id', request.id)
        .select(
          'id, status, admin_response, handled_by, updated_at'
        )
        .maybeSingle();

      if (error || !data) {
        console.error(
          'Failed to update student request:',
          error?.code ?? 'no_row_updated'
        );

        toast.error(t('requests.adminUpdateError'));
        return;
      }

      setRequests((previous) =>
        previous.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: data.status as RequestStatus,
                admin_response: data.admin_response,
                handled_by: data.handled_by,
                updated_at: data.updated_at,
              }
            : item
        )
      );

      setDrafts((previous) => ({
        ...previous,
        [request.id]: {
          status: data.status as RequestStatus,
          response: data.admin_response ?? '',
        },
      }));

      toast.success(t('requests.adminUpdateSuccess'));
    } catch {
      toast.error(t('requests.adminUpdateError'));
    } finally {
      setSavingId(null);
    }
  };

  // Permanently delete a request after administrator confirmation.
  const deleteRequest = async (request: StudentRequest) => {
    if (isBusy) return;

    const confirmed = window.confirm(
      t('requests.adminDeleteConfirm')
    );

    if (!confirmed) return;

    setDeletingId(request.id);

    try {
      const { data, error } = await supabase
        .from('student_requests')
        .delete()
        .eq('id', request.id)
        .select('id')
        .maybeSingle();

      if (error || !data) {
        console.error(
          'Failed to delete student request:',
          error?.code ?? 'no_row_deleted'
        );

        toast.error(t('requests.adminDeleteError'));
        return;
      }

      // Remove the request from the interface only after
      // Supabase confirms that the row was deleted.
      setRequests((previous) =>
        previous.filter((item) => item.id !== request.id)
      );

      setDrafts((previous) => {
        const next = { ...previous };
        delete next[request.id];
        return next;
      });

      toast.success(t('requests.adminDeleteSuccess'));
    } catch {
      toast.error(t('requests.adminDeleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  // Apply both filters without modifying the stored requests.
  const filteredRequests = requests.filter((request) => {
    if (
      statusFilter !== 'all' &&
      request.status !== statusFilter
    ) {
      return false;
    }

    if (
      typeFilter !== 'all' &&
      request.request_type !== typeFilter
    ) {
      return false;
    }

    return true;
  });

  if (loading) {
    return <LoadingState message={t('common.loading')} />;
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page heading */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {t('requests.adminTitle')}
          </h1>

          <p className="text-sm text-muted-foreground">
            {t('requests.adminDescription')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadRequests()}
          disabled={loading || isBusy}
        >
          <RefreshCw className="me-2 h-4 w-4" />
          {t('requests.refresh')}
        </Button>
      </header>

      {/* Request statistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {t('requests.adminTotal')}
            </p>

            <p className="mt-1 text-2xl font-bold">
              {requests.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {t('requests.adminOpen')}
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                requests.filter(
                  (request) => request.status === 'open'
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {t('requests.adminWaiting')}
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                requests.filter(
                  (request) => request.status === 'in_review'
                ).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          aria-label={t('requests.adminStatusFilter')}
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as RequestStatus | 'all'
            )
          }
          className="h-10 min-w-40 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">
            {t('requests.adminAllStatuses')}
          </option>

          {statuses.map((status) => (
            <option key={status} value={status}>
              {t(`requests.status.${status}`)}
            </option>
          ))}
        </select>

        <select
          aria-label={t('requests.adminTypeFilter')}
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(
              event.target.value as RequestType | 'all'
            )
          }
          className="h-10 min-w-48 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">
            {t('requests.adminAllTypes')}
          </option>

          {requestTypes.map((type) => (
            <option key={type} value={type}>
              {t(`requests.types.${type}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Loading errors and filtered results */}
      {loadError ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t('requests.adminLoadError')}
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="h-6 w-6" />}
          title={t('requests.adminEmpty')}
          description={t('requests.adminEmptyDescription')}
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const draft = drafts[request.id] ?? {
              status: request.status,
              response: request.admin_response ?? '',
            };

            const subject = subjects.find(
              (item) => item.id === request.subject_id
            );

            const profileName = profiles[request.user_id];

            const requester =
              profileName || request.user_id.slice(0, 8);

            const isDeleting = deletingId === request.id;
            const isSaving = savingId === request.id;

            return (
              <Card key={request.id}>
                <CardContent className="space-y-5 p-5">
                  {/* Request details */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t(`requests.types.${request.request_type}`)}
                        {subject ? ` · ${subject.name}` : ''}
                      </p>

                      <h2 className="break-words text-lg font-semibold">
                        {request.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UserRound
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          {requester}
                        </span>

                        <span>
                          {new Date(
                            request.created_at
                          ).toLocaleString(
                            locale === 'ar' ? 'ar-DZ' : 'en-US'
                          )}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                      {t(`requests.status.${request.status}`)}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                    {request.description}
                  </p>

                  {/* Status and administrator response */}
                  <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor={`status-${request.id}`}
                        className="text-sm font-medium"
                      >
                        {t('requests.adminStatusLabel')}
                      </label>

                      <select
                        id={`status-${request.id}`}
                        value={draft.status}
                        onChange={(event) =>
                          updateDraft(request.id, {
                            status: event.target.value as RequestStatus,
                          })
                        }
                        disabled={isBusy}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {t(`requests.status.${status}`)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`response-${request.id}`}
                        className="text-sm font-medium"
                      >
                        {t('requests.adminResponse')}
                      </label>

                      <textarea
                        id={`response-${request.id}`}
                        value={draft.response}
                        onChange={(event) =>
                          updateDraft(request.id, {
                            response: event.target.value,
                          })
                        }
                        maxLength={5000}
                        rows={4}
                        disabled={isBusy}
                        placeholder={t(
                          'requests.adminResponsePlaceholder'
                        )}
                        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      />

                      <p className="text-end text-xs text-muted-foreground">
                        {draft.response.length}/5000
                      </p>
                    </div>
                  </div>

                  {/* Save and delete actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void deleteRequest(request)}
                      disabled={isBusy}
                    >
                      {isDeleting ? (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="me-2 h-4 w-4" />
                      )}

                      {isDeleting
                        ? t('requests.adminDeleting')
                        : t('requests.adminDelete')}
                    </Button>

                    <Button
                      onClick={() => void saveRequest(request)}
                      disabled={isBusy}
                    >
                      {isSaving ? (
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="me-2 h-4 w-4" />
                      )}

                      {isSaving
                        ? t('requests.adminSaving')
                        : t('requests.adminSave')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}