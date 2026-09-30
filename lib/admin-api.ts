export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type Question = {
  id: string; subjectId: string; topic: string; year: number; text: string; options: string[];
  correctAnswer: string; explanation: string; difficulty: string; source?: string;
};
export type Subject = { id: string; name: string; shortName: string; icon: string; color: string; topics: string[] };
export type UserStats = {
  questionsAnswered: number; averageScore: number; currentStreak: number; sessionsCompleted: number;
};
export type TokenBalance = { total: number; used: number; remaining: number };
export type UserRecord = {
  id: string; name: string; email: string; course: string; examYear: string;
  status: "active" | "blocked"; questionsAnswered: number; createdAt: string;
};
export type UserDetail = UserRecord & {
  role?: "user" | "admin";
  avatarUrl?: string | null;
  stats: UserStats;
  tokens: TokenBalance;
};
export type UserAttempt = {
  id: string; subjectName: string; topic: string | null; mode: string;
  questionsCount: number; score: number; percentage: number; completedAt: string;
};
export type Campaign = {
  id: string; placement: string; title: string; subtitle: string; cta: string;
  url: string; imageUrl: string; active: boolean; weight: number;
};
export type UsageSummary = {
  dau: number; mau: number; totalUsers: number;
  tokensSoldRevenueNGN: number; tokensPurchased: number; tokensSpent: number;
  generatedAt?: string;
};
type Session = { accessToken: string; refreshToken: string; expiresAt?: string };
type ApiErrorBody = { error?: { message?: string } };

const SESSION_KEY = "eduwa.admin.session";
const BASE_URL_KEY = "eduwa.admin.baseUrl";

let apiBaseUrl = "http://localhost:4000/api";
let session: Session | null = null;
let refreshInFlight: Promise<void> | null = null;

function readStored<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * The session lives in localStorage so a page reload or client-side
 * navigation doesn't drop the admin back to the sign-in screen. The API base
 * URL is stored alongside it for the same reason.
 */
function persist() {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* Storage can be unavailable (private mode); the in-memory session still works. */
  }
}

export function getSession(): Session | null {
  return session;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function restoreSession(): Session | null {
  if (typeof window === "undefined") return null;
  const stored = readStored<Session>(SESSION_KEY);
  if (stored?.accessToken) {
    session = stored;
    apiBaseUrl = readStored<string>(BASE_URL_KEY) || apiBaseUrl;
  }
  return session;
}

async function readError(response: Response) {
  let body: ApiErrorBody = {};
  try { body = await response.json() as ApiErrorBody; } catch { /* Keep the HTTP status message. */ }
  return new ApiError(response.status, body.error?.message ?? response.statusText ?? "Request failed.");
}

async function renewSession() {
  if (!session?.refreshToken) throw new ApiError(401, "Your admin session has expired. Sign in again.");
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: session?.refreshToken }),
      });
      if (!response.ok) { clearSession(); throw await readError(response); }
      const next = await response.json() as Session;
      session = { accessToken: next.accessToken, refreshToken: next.refreshToken, expiresAt: next.expiresAt };
      persist();
    })().finally(() => { refreshInFlight = null; });
  }
  await refreshInFlight;
}

/** Drops the local session. Used on sign-out and whenever the API rejects us. */
export function clearSession() {
  session = null;
  refreshInFlight = null;
  try { window.localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (response.status === 401 && session?.refreshToken && !retried) { await renewSession(); return request<T>(path, init, true); }
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

export type AdminUser = { id: string; name: string; email: string };

export const adminApi = {
  async signIn(baseUrl: string, email: string, password: string): Promise<AdminUser> {
    apiBaseUrl = baseUrl.replace(/\/+$/, "");
    const response = await fetch(`${apiBaseUrl}/auth/admin/signin`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw await readError(response);
    // The API nests identity under `user` and tokens under `session`; reading
    // either from the top level silently yields an empty identity.
    const data = await response.json() as { user?: Partial<AdminUser>; session?: Session };
    const next = data.session;
    if (!next?.accessToken) throw new ApiError(500, "The API did not return a session.");
    session = next;
    persist();
    try { window.localStorage.setItem(BASE_URL_KEY, apiBaseUrl); } catch { /* ignore */ }
    const id = data.user?.id ?? "";
    if (!id) throw new ApiError(500, "The API did not return your account details.");
    return { id, name: data.user?.name ?? "Eduwa Admin", email: data.user?.email ?? email };
  },

  /** Ends the server session too, but never blocks sign-out on a network failure. */
  async signOut(): Promise<void> {
    // Capture the tokens before clearing: /auth/signout sits behind requireAuth,
    // so the Bearer header has to still be on the outgoing request.
    const { accessToken, refreshToken } = session ?? {};
    clearSession();
    if (!accessToken) return;
    try {
      await fetch(`${apiBaseUrl}/auth/signout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      /* Local session is already cleared; the server session expires on its own. */
    }
  },

  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};