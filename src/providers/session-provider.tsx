import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { env } from '@/config/env';
import {
  authControllerRefresh,
  authControllerSignOut,
  catalogControllerCurrentLegal,
  meControllerMe,
  profilesControllerConsents,
  profilesControllerOnboardingProgress,
  trustControllerRestrictions,
} from '@/generated/api/sdk.gen';
import type { AuthSessionResponse } from '@/generated/api/types.gen';
import { accessTokenMemory } from '@/services/api/access-token';
import { refreshBypassHeader } from '@/services/api/api-client';
import { registerRefreshAction } from '@/services/api/refresh-coordinator';
import { unwrap } from '@/services/api/result';
import { authStorage } from '@/services/auth-storage.service';
import { realtimeLifecycle } from '@/services/realtime-lifecycle';
import { useAccountStore } from '@/stores/account.store';
import { useNavigationStore } from '@/stores/navigation.store';

import { resolveGate, type BootstrapSnapshot, type Gate } from './bootstrap';
import { isTerminalSessionError } from './session-policy';

type SessionStatus = 'booting' | 'ready' | 'offline' | 'error';
type SessionContextValue = {
  status: SessionStatus;
  gate: Gate;
  snapshot: BootstrapSnapshot | null;
  error: Error | null;
  acceptSession: (session: AuthSessionResponse) => Promise<void>;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('booting');
  const [snapshot, setSnapshot] = useState<BootstrapSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const accountIdRef = useRef<string | null>(null);

  const clearLocalSession = useCallback(async () => {
    accessTokenMemory.clear();
    refreshTokenRef.current = null;
    setSnapshot(null);
    useAccountStore.getState().reset();
    useNavigationStore.getState().clear();
    realtimeLifecycle.disconnect();
    queryClient.cancelQueries();
    queryClient.clear();
    await authStorage.clear(
      env.EXPO_PUBLIC_APP_ENV,
      accountIdRef.current ?? undefined,
    );
    accountIdRef.current = null;
  }, [queryClient]);

  const loadSnapshot = useCallback(async () => {
    const [user, restrictions, currentLegal, consents, onboarding] =
      await Promise.all([
        meControllerMe().then(unwrap),
        trustControllerRestrictions().then(unwrap),
        catalogControllerCurrentLegal().then(unwrap),
        profilesControllerConsents().then(unwrap),
        profilesControllerOnboardingProgress().then(unwrap),
      ]);
    const next = {
      user,
      restrictions,
      currentLegal,
      consents: consents as BootstrapSnapshot['consents'],
      onboarding,
    };
    accountIdRef.current = user.id;
    useAccountStore.getState().setRoleId(user.currentRoleId ?? null);
    setSnapshot(next);
    setError(null);
    setStatus('ready');
  }, []);

  const persistSession = useCallback(async (session: AuthSessionResponse) => {
    accessTokenMemory.set(session.accessToken);
    refreshTokenRef.current = session.refreshToken;
    accountIdRef.current = session.user.id;
    await authStorage.write(
      env.EXPO_PUBLIC_APP_ENV,
      session.user.id,
      session.refreshToken,
    );
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    const refreshToken = refreshTokenRef.current;
    if (!refreshToken) return null;
    try {
      const session = unwrap(
        await authControllerRefresh({
          body: { refreshToken },
          headers: refreshBypassHeader,
        }),
      );
      await persistSession(session);
      return session.accessToken;
    } catch (caught) {
      if (isTerminalSessionError(caught)) {
        await clearLocalSession();
        return null;
      }
      throw caught;
    }
  }, [clearLocalSession, persistSession]);

  useEffect(() => {
    registerRefreshAction(refresh);
    return () => registerRefreshAction(null);
  }, [refresh]);

  const reload = useCallback(async () => {
    setStatus('booting');
    try {
      if (!accessTokenMemory.get()) {
        if (!refreshTokenRef.current || !(await refresh())) {
          setSnapshot(null);
          setStatus('ready');
          return;
        }
      }
      await loadSnapshot();
    } catch (caught) {
      const resolved =
        caught instanceof Error ? caught : new Error('Bootstrap failed');
      setError(resolved);
      setStatus(resolved.message.includes('Network') ? 'offline' : 'error');
    }
  }, [loadSnapshot, refresh]);

  const acceptSession = useCallback(
    async (session: AuthSessionResponse) => {
      setStatus('booting');
      await persistSession(session);
      await loadSnapshot();
    },
    [loadSnapshot, persistSession],
  );

  const signOut = useCallback(async () => {
    try {
      if (accessTokenMemory.get()) await authControllerSignOut();
    } finally {
      await clearLocalSession();
      setStatus('ready');
    }
  }, [clearLocalSession]);

  useEffect(() => {
    void (async () => {
      const active = await authStorage.readActive(env.EXPO_PUBLIC_APP_ENV);
      if (!active) {
        setStatus('ready');
        return;
      }
      accountIdRef.current = active.accountId;
      refreshTokenRef.current = active.refreshToken;
      try {
        const token = await refresh();
        if (token) await loadSnapshot();
        else setStatus('ready');
      } catch (caught) {
        const resolved =
          caught instanceof Error ? caught : new Error('Bootstrap failed');
        setError(resolved);
        setStatus('offline');
      }
    })();
  }, [loadSnapshot, refresh]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      gate: resolveGate(snapshot),
      snapshot,
      error,
      acceptSession,
      reload,
      signOut,
    }),
    [acceptSession, error, reload, signOut, snapshot, status],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
}
