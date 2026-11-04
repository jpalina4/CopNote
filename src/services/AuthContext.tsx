/**
 * Authentication state shared by the whole app via React Context.
 *
 * Context lets any screen call `useAuth()` to read the signed-in officer or
 * call login/logout, without passing props through every component.
 *
 * It also implements the INACTIVITY LOCK:
 *  - every touch or keystroke calls reportActivity() which records the time;
 *  - a timer checks every 10 s whether INACTIVITY_TIMEOUT_MS has passed;
 *  - when the app returns from the background we check the same rule.
 * When locked, the officer stays signed in (their unsaved form is kept) but
 * the lock screen covers everything until the correct PIN is entered.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as authService from './authService';
import { clearSession, loadSession, saveSession } from './sessionStore';
import { INACTIVITY_TIMEOUT_MS } from '../utils/constants';
import type { Officer } from '../types';
import type { LoginInput, RegistrationInput } from '../utils/validation';

export interface AuthContextValue {
  officer: Officer | null;
  locked: boolean;
  restoring: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  register: (details: Omit<RegistrationInput, 'confirmPin'>) => Promise<void>;
  unlock: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  lockNow: () => void;
  reportActivity: () => void;
}

/** What screens get from useAuth(): only used while signed in, so officer is never null. */
export type SignedInAuth = AuthContextValue & { officer: Officer };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [locked, setLocked] = useState(false);
  const [restoring, setRestoring] = useState(true);

  // useRef holds a value that changes often WITHOUT causing a re-render.
  // It is set to "now" whenever a session starts or the app is unlocked.
  const lastActivity = useRef(0);

  // Restore a previous session on start-up. The app opens LOCKED so the PIN
  // is always needed after a restart.
  useEffect(() => {
    (async () => {
      const id = await loadSession();
      const saved = id ? await authService.getOfficer(db, id) : null;
      if (saved) {
        setOfficer(saved);
        setLocked(true);
      }
      setRestoring(false);
    })();
  }, [db]);

  const reportActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  const startSession = useCallback(async (signedIn: Officer) => {
    await saveSession(signedIn.id);
    lastActivity.current = Date.now();
    setOfficer(signedIn);
    setLocked(false);
  }, []);

  const login = useCallback(async (credentials: LoginInput) => startSession(await authService.login(db, credentials)), [db, startSession]);

  const register = useCallback(async (details: Omit<RegistrationInput, 'confirmPin'>) => startSession(await authService.registerOfficer(db, details)), [db, startSession]);

  const unlock = useCallback(
    async (pin: string) => {
      if (!officer) return;
      await authService.unlock(db, officer.id, pin); // throws on a wrong PIN
      lastActivity.current = Date.now();
      setLocked(false);
    },
    [db, officer],
  );

  const logout = useCallback(async () => {
    await clearSession();
    setLocked(false);
    setOfficer(null);
  }, []);

  const lockNow = useCallback(() => setLocked(true), []);

  // In a browser, moving the mouse or scrolling also counts as activity.
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const events = ['mousemove', 'keydown', 'wheel'];
    events.forEach((name) => window.addEventListener(name, reportActivity, { passive: true }));
    return () => events.forEach((name) => window.removeEventListener(name, reportActivity));
  }, [reportActivity]);

  // Inactivity timer — only runs while signed in and unlocked.
  useEffect(() => {
    if (!officer || locked) return undefined;
    const isIdle = () => Date.now() - lastActivity.current > INACTIVITY_TIMEOUT_MS;

    const timer = setInterval(() => isIdle() && setLocked(true), 10000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isIdle()) setLocked(true);
    });
    // Cleanup function: React calls this when the effect re-runs or unmounts.
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [officer, locked]);

  // useMemo keeps the same object between renders unless something changed,
  // so components using the context do not re-render needlessly.
  const value = useMemo<AuthContextValue>(
    () => ({ officer, locked, restoring, login, register, unlock, logout, lockNow, reportActivity }),
    [officer, locked, restoring, login, register, unlock, logout, lockNow, reportActivity],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook: a short, safe way for screens to use the auth context.
 * Typed as signed in for convenience, because most callers are protected
 * screens. Anything that can run while signed out (root layout, login,
 * register) must check `officer` before using it.
 */
export function useAuth(): SignedInAuth {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context as SignedInAuth;
}

/** Like useAuth, but returns null outside the provider (used by shared components). */
export const useOptionalAuth = (): AuthContextValue | null => useContext(AuthContext);
