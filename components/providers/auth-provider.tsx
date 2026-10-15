'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface AuthResult {
  /** A user-facing message, or null when the operation succeeded. */
  error: string | null;
  /** Stable machine-readable code for localization and error handling. */
  errorCode?: string;
}

export interface SignUpResult extends AuthResult {
  /** True when signup succeeded but Supabase did not create a session. */
  needsEmailConfirmation: boolean;
}

export const AUTH_ERROR_CODES = {
  invalidEmail: 'invalid_email',
  missingPassword: 'missing_password',
  missingFullName: 'missing_full_name',
  sessionMissing: 'session_missing',
  unexpected: 'unexpected_error',
} as const;

export const PROFILE_LOAD_FAILED = 'profile_load_failed' as const;

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  passwordRecovery: boolean;
  /** Non-null only when the profiles query failed; a missing row is not an error. */
  profileError: typeof PROFILE_LOAD_FAILED | null;
  loading: boolean;
  isAdmin: boolean;
  
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  /** Preserves the original signature; rejects if logout fails. */
  signOut: () => Promise<void>;
  /** Use this when the caller needs to display a logout error without catching a rejection. */
  signOutWithResult: () => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
}

const PROVIDER_ERROR_MESSAGES: Record<string, string> = {
  [AUTH_ERROR_CODES.invalidEmail]: 'Please enter a valid email address.',
  [AUTH_ERROR_CODES.missingPassword]: 'Please enter your password.',
  [AUTH_ERROR_CODES.missingFullName]: 'Please enter your full name.',
  [AUTH_ERROR_CODES.sessionMissing]: 'Your session is missing or has expired. Please request a new link.',
  [AUTH_ERROR_CODES.unexpected]: 'Something went wrong. Please try again.',
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  passwordRecovery: false,
  profileError: null,
  loading: true,
  isAdmin: false,
  signIn: async () => ({ error: 'Not implemented' }),
  signUp: async () => ({ error: 'Not implemented', needsEmailConfirmation: false }),
  signOut: async () => {},
  signOutWithResult: async () => ({ error: 'Not implemented' }),
  refreshProfile: async () => {},
  requestPasswordReset: async () => ({ error: 'Not implemented' }),
  updatePassword: async () => ({ error: 'Not implemented' }),
});

interface ProfileState {
  userId: string;
  profile: Profile | null;
  error: typeof PROFILE_LOAD_FAILED | null;
}

type ProfileResult =
  | { ok: true; seq: number; userId: string; profile: Profile | null }
  | { ok: false; seq: number; userId: string };

interface InflightProfile {
  userId: string;
  seq: number;
  promise: Promise<ProfileResult>;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_INIT_TIMEOUT_MS = 10000;
const PROFILE_TIMEOUT_MS = 15000;

function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase();
}

/** Log only non-sensitive error metadata; never log emails, credentials, or tokens. */
function logAuthError(context: string, error: unknown): void {
  if (!error || typeof error !== 'object') {
    console.error(`[auth] ${context} failed`);
    return;
  }

  const value = error as { name?: unknown; code?: unknown; status?: unknown };
  console.error(`[auth] ${context} failed`, {
    name: typeof value.name === 'string' ? value.name : undefined,
    code: typeof value.code === 'string' ? value.code : undefined,
    status: typeof value.status === 'number' ? value.status : undefined,
  });
}

function fromSupabaseError(context: string, error: AuthError): AuthResult {
  logAuthError(context, error);
  const errorCode =
    error.name === 'AuthSessionMissingError'
      ? AUTH_ERROR_CODES.sessionMissing
      : error.code;

  const result: AuthResult = {
    error: error.message || PROVIDER_ERROR_MESSAGES[AUTH_ERROR_CODES.unexpected],
  };
  if (errorCode) result.errorCode = errorCode;
  return result;
}

function providerError(code: string): AuthResult {
  return {
    error: PROVIDER_ERROR_MESSAGES[code] ?? PROVIDER_ERROR_MESSAGES[AUTH_ERROR_CODES.unexpected],
    errorCode: code,
  };
}

/**
 * Resolve/reject when the operation settles, or reject after the given timeout.
 * This does not cancel the underlying Supabase request; sequence checks prevent
 * timed-out or stale results from changing React state later.
 */
function withTimeout<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason: unknown) => {
        clearTimeout(timer);
        reject(reason);
      }
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
const [authReady, setAuthReady] = useState(false);
const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [profileState, setProfileState] = useState<ProfileState | null>(null);

  // Refs represent the latest auth truth and invalidate stale asynchronous work.
  const mountedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const latestSeqRef = useRef(0);
  const inflightRef = useRef<InflightProfile | null>(null);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  /* --------------------------- session management ------------------------- */

  const applySession = useCallback((nextSession: Session | null) => {
    if (!mountedRef.current) return;

    const nextUserId = nextSession?.user?.id ?? null;

if (nextUserId === null) {
  setPasswordRecovery(false);
}

if (userIdRef.current !== nextUserId) {
      // Invalidate every request started for the previous identity. This also
      // covers A -> signed out -> A, where the user ID eventually repeats.
      userIdRef.current = nextUserId;
      latestSeqRef.current += 1;
      inflightRef.current = null;
      setProfileState(null);
    }

    setSession(nextSession);
    setAuthReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    let deliveredAuthEvent = false;

    mountedRef.current = true;

   const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((event, nextSession) => {
  if (!active) return;

  deliveredAuthEvent = true;

  if (event === 'PASSWORD_RECOVERY') {
    setPasswordRecovery(true);
  } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    setPasswordRecovery(false);
  }

  applySession(nextSession);
});
    // Fallback in case INITIAL_SESSION has not reached the listener. A session
    // event always wins over this potentially older read.
    withTimeout(supabase.auth.getSession(), SESSION_INIT_TIMEOUT_MS)
      .then(({ data, error }) => {
        if (!active || deliveredAuthEvent) return;
        if (error) {
          logAuthError('getSession', error);
          setAuthReady(true);
          return;
        }
        applySession(data.session);
      })
      .catch((error: unknown) => {
        if (!active || deliveredAuthEvent) return;
        logAuthError('getSession', error);
        // End the initial loading state. A later auth event can still restore
        // the session if the request only timed out.
        setAuthReady(true);
      });

    return () => {
      active = false;
      mountedRef.current = false;
      latestSeqRef.current += 1;
      inflightRef.current = null;
      subscription.unsubscribe();
    };
  }, [applySession]);

  /* ---------------------------- profile loading --------------------------- */

  /**
   * Starts a request, or joins the matching current request unless forced.
   * Every request resolves to a result object; callers do not receive rejections.
   */
  const requestProfile = useCallback(
    (targetUserId: string, force: boolean): Promise<ProfileResult> => {
      const existing = inflightRef.current;
      if (
        !force &&
        existing &&
        existing.userId === targetUserId &&
        existing.seq === latestSeqRef.current
      ) {
        return existing.promise;
      }

      const seq = ++latestSeqRef.current;
      const promise = (async (): Promise<ProfileResult> => {
        try {
          const { data, error } = await withTimeout(
            supabase.from('profiles').select('*').eq('id', targetUserId).maybeSingle(),
            PROFILE_TIMEOUT_MS
          );

          if (error) {
            console.error('[auth] Profile fetch failed', { code: error.code });
            return { ok: false, seq, userId: targetUserId };
          }

          return {
            ok: true,
            seq,
            userId: targetUserId,
            profile: (data as Profile | null) ?? null,
          };
        } catch (error) {
          logAuthError('profile fetch', error);
          return { ok: false, seq, userId: targetUserId };
        }
      })();

      const entry: InflightProfile = { userId: targetUserId, seq, promise };
      inflightRef.current = entry;
      void promise.then(() => {
        if (inflightRef.current === entry) inflightRef.current = null;
      });
      return promise;
    },
    []
  );

  /** Apply only the latest result for the currently authenticated user. */
  const commitProfile = useCallback((result: ProfileResult) => {
    if (
      !mountedRef.current ||
      result.seq !== latestSeqRef.current ||
      result.userId !== userIdRef.current
    ) {
      return;
    }

    // Check again inside the updater because React may process a queued update
    // after the active user or request sequence has changed.
    setProfileState((previous) => {
      if (
        !mountedRef.current ||
        result.seq !== latestSeqRef.current ||
        result.userId !== userIdRef.current
      ) {
        return previous;
      }

      if (result.ok) {
        return { userId: result.userId, profile: result.profile, error: null };
      }

      // Keep ordinary profile display data after a failed refresh, but the
      // derived administrator status below fails closed while profileError is set.
      const previousProfile =
        previous?.userId === result.userId ? previous.profile : null;
      return {
        userId: result.userId,
        profile: previousProfile,
        error: PROFILE_LOAD_FAILED,
      };
    });
  }, []);

  // Set up this effect after the session effect above. It runs only when the
  // identity changes; token refreshes do not trigger a duplicate profile fetch.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    void requestProfile(userId, false).then((result) => {
      if (!cancelled) commitProfile(result);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, requestProfile, commitProfile]);

  /* ------------------------------- actions -------------------------------- */

  const refreshProfile = useCallback(async () => {
    const currentUserId = userIdRef.current;
    if (!currentUserId || !mountedRef.current) return;

    const result = await requestProfile(currentUserId, true);
    commitProfile(result);
  }, [requestProfile, commitProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const normalizedEmail = normalizeEmail(email);
      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        return providerError(AUTH_ERROR_CODES.invalidEmail);
      }
      if (!password) return providerError(AUTH_ERROR_CODES.missingPassword);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) return fromSupabaseError('signIn', error);
        if (!data.session) return providerError(AUTH_ERROR_CODES.unexpected);
        return { error: null };
      } catch (error) {
        logAuthError('signIn', error);
        return providerError(AUTH_ERROR_CODES.unexpected);
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
      const normalizedEmail = normalizeEmail(email);
      const normalizedFullName = (fullName ?? '').trim();

      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        return {
          ...providerError(AUTH_ERROR_CODES.invalidEmail),
          needsEmailConfirmation: false,
        };
      }
      if (!password) {
        return {
          ...providerError(AUTH_ERROR_CODES.missingPassword),
          needsEmailConfirmation: false,
        };
      }
      if (!normalizedFullName) {
        return {
          ...providerError(AUTH_ERROR_CODES.missingFullName),
          needsEmailConfirmation: false,
        };
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: normalizedFullName } },
        });

        if (error) {
          return {
            ...fromSupabaseError('signUp', error),
            needsEmailConfirmation: false,
          };
        }
        if (data.session) {
          return { error: null, needsEmailConfirmation: false };
        }
        if (data.user) {
          // A generic confirmation message is appropriate; Supabase deliberately
          // avoids exposing whether an email is already registered in this flow.
          return { error: null, needsEmailConfirmation: true };
        }

        return {
          ...providerError(AUTH_ERROR_CODES.unexpected),
          needsEmailConfirmation: false,
        };
      } catch (error) {
        logAuthError('signUp', error);
        return {
          ...providerError(AUTH_ERROR_CODES.unexpected),
          needsEmailConfirmation: false,
        };
      }
    },
    []
  );

  const signOutWithResult = useCallback(async (): Promise<AuthResult> => {
    const startedAs = userIdRef.current;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) return fromSupabaseError('signOut', error);

      // SIGNED_OUT normally applies this state first. This fallback is guarded
      // so a delayed logout cannot clear a newer account's session.
      if (mountedRef.current && userIdRef.current === startedAs) {
        applySession(null);
      }
      return { error: null };
    } catch (error) {
      logAuthError('signOut', error);
      return providerError(AUTH_ERROR_CODES.unexpected);
    }
  }, [applySession]);

  const signOut = useCallback(async (): Promise<void> => {
    const result = await signOutWithResult();
    if (result.error) {
      const error = new Error(result.error) as Error & { code?: string };
      error.code = result.errorCode;
      throw error;
    }
  }, [signOutWithResult]);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return providerError(AUTH_ERROR_CODES.invalidEmail);
    }
    if (typeof window === 'undefined') {
      return providerError(AUTH_ERROR_CODES.unexpected);
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return fromSupabaseError('requestPasswordReset', error);
      return { error: null };
    } catch (error) {
      logAuthError('requestPasswordReset', error);
      return providerError(AUTH_ERROR_CODES.unexpected);
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!password) return providerError(AUTH_ERROR_CODES.missingPassword);

    try {
      // Supabase validates the active session and the configured password policy.
     const { error } = await supabase.auth.updateUser({ password });

if (error) {
  return fromSupabaseError('updatePassword', error);
}

setPasswordRecovery(false);
return { error: null };
    } catch (error) {
      logAuthError('updatePassword', error);
      return providerError(AUTH_ERROR_CODES.unexpected);
    }
  }, []);

  /* ----------------------------- derived values --------------------------- */

  const currentProfileState =
    userId !== null && profileState?.userId === userId ? profileState : null;

  const profile = currentProfileState?.profile ?? null;
  const profileError = currentProfileState?.error ?? null;

  // Initial loading ends after auth initialization and the current user's profile
  // request has settled, whether that request succeeded or failed.
  const loading = !authReady || (userId !== null && currentProfileState === null);

  // Fail closed for admin UI while the profile query is in an error state. The
  // actual authorization boundary must still be enforced by Supabase RLS/server code.
  const isAdmin =
    profileError === null &&
    currentProfileState !== null &&
    profile?.is_admin === true;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      passwordRecovery,
      profile,
      profileError,
      loading,
      isAdmin,
      signIn,
      signUp,
      signOut,
      signOutWithResult,
      refreshProfile,
      requestPasswordReset,
      updatePassword,
    }),
    [
      user,
      session,
      passwordRecovery,
      profile,
      profileError,
      loading,
      isAdmin,
      signIn,
      signUp,
      signOut,
      signOutWithResult,
      refreshProfile,
      requestPasswordReset,
      updatePassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
