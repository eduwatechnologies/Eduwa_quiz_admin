"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  adminApi, ApiError, clearSession, getApiBaseUrl, getSession, restoreSession,
} from "@/lib/admin-api";
import type { AdminUser } from "@/lib/admin-api";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  status: AuthStatus;
  user: AdminUser | null;
  apiBaseUrl: string;
  signIn: (baseUrl: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AdminUser | null>(null);

  // Runs once on mount: an in-memory-only session would be lost on reload, so
  // restore from storage and confirm the token still works before trusting it.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const restored = restoreSession();
      if (!restored) {
        if (!cancelled) setStatus("anonymous");
        return;
      }
      try {
        const me = await adminApi.get<AdminUser>("/users/me");
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      } catch (err) {
        if (cancelled) return;
        // A rejected token means the session is dead; don't leave the admin
        // stuck on a loading screen.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) clearSession();
        setStatus("anonymous");
      }
    }
    void bootstrap();
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (baseUrl: string, email: string, password: string) => {
    const signedIn = await adminApi.signIn(baseUrl, email, password);
    setUser(signedIn);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    await adminApi.signOut();
    setUser(null);
    setStatus("anonymous");
    router.push("/signin");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      apiBaseUrl: getApiBaseUrl(),
      signIn,
      signOut,
    }),
    [status, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export { getSession };
