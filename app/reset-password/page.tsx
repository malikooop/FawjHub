'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  GraduationCap,
  Loader2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingState } from '@/components/states';
import {
  AUTH_ERROR_CODES,
  useAuth,
} from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const {
    session,
    passwordRecovery,
    loading: authLoading,
    updatePassword,
  } = useAuth();

  const { t } = useI18n();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session || !passwordRecovery) {
      toast.error(t('auth.resetLinkInvalid'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('auth.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);

    try {
      const { error, errorCode } = await updatePassword(password);

      if (error) {
        toast.error(
          errorCode === AUTH_ERROR_CODES.sessionMissing
            ? t('auth.resetLinkInvalid')
            : error
        );
        return;
      }

      setUpdated(true);
      setPassword('');
      setConfirmPassword('');
      toast.success(t('auth.passwordUpdated'));
    } catch {
      toast.error(t('auth.resetLinkInvalid'));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <LoadingState message={t('profile.loading')} />;
  }

  if (updated) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle>{t('auth.passwordUpdated')}</CardTitle>
            <CardDescription>
              {t('auth.passwordUpdated')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Link href="/profile" className="block">
              <Button className="w-full">
                {t('nav.profile')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !passwordRecovery) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
            <CardDescription>
              {t('auth.resetLinkInvalid')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full">
                {t('auth.returnToLogin')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Lock className="h-6 w-6" />
          </div>

          <div>
            <CardTitle className="text-xl">
              {t('auth.resetPasswordTitle')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('auth.resetPasswordSubtitle')}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">
                {t('auth.newPassword')}
              </Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                disabled={submitting}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {t('auth.confirmPassword')}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
                disabled={submitting}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              {t('auth.updatePassword')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              {t('auth.returnToLogin')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}