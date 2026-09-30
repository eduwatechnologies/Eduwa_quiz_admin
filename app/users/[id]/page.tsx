"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ShieldCheck, Users, X } from "lucide-react";
import RequireAuth from "@/components/admin/RequireAuth";
import { useAuth } from "@/components/admin/AuthProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatNumber, PageHeader, UserDetailView } from "@/components/admin/AdminUI";
import { adminApi, ApiError } from "@/lib/admin-api";
import type { UserAttempt, UserDetail } from "@/lib/admin-api";

function UserDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? "";
  const { user: admin, signOut } = useAuth();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [attempts, setAttempts] = useState<UserAttempt[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Derived rather than stored: avoids a setState-in-effect while still
  // covering the first load and any refetch after the id changes.
  const loading = !user && !error;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function run() {
      try {
        const [detail, history] = await Promise.all([
          adminApi.get<UserDetail>(`/admin/users/${userId}`),
          adminApi.get<{ items: UserAttempt[] }>(`/admin/users/${userId}/attempts?limit=20&offset=0`),
        ]);
        if (cancelled) return;
        setUser(detail);
        setAttempts(history.items ?? []);
        setError("");
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof ApiError ? caught.message : "Could not load this user.");
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function toggleBan() {
    if (!user) return;
    try {
      const banned = user.status !== "blocked";
      await adminApi.post(`/admin/users/${user.id}/ban`, { banned });
      setUser({ ...user, status: banned ? "blocked" : "active" });
      setNotice(banned ? "Account blocked." : "Account unblocked.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update this account.");
    }
  }

  async function refundTokens(amount: number) {
    if (!user) return;
    try {
      const result = await adminApi.post<{ newTotal: number; newRemaining: number }>(
        `/admin/users/${user.id}/refund-tokens`,
        { amount, reason: "Admin token credit" },
      );
      setUser({ ...user, tokens: { total: result.newTotal, used: user.tokens.used, remaining: result.newRemaining } });
      setNotice(`${formatNumber(amount)} tokens added.`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not credit tokens.");
    }
  }

  return <AdminShell
    section="users"
    admin={admin}
    questionCount={0}
    onNavigate={(target) => router.push(target === "overview" ? "/" : `/${target}`)}
    onSignOut={() => void signOut()}
    onNotice={setNotice}
  >
    <div className="content-wrap">
      <PageHeader eyebrow="MANAGE" title="Student profile" subtitle="Account details, token balance, and practice history.">
        <div className="heading-actions">
          <button className="button button-secondary" onClick={() => router.push("/users")}>
            <ArrowLeft size={15} />All users
          </button>
          {user && <button
            className={user.status === "blocked" ? "button button-primary" : "button button-danger"}
            onClick={() => void toggleBan()}
          >
            <ShieldCheck size={15} />{user.status === "blocked" ? "Unblock account" : "Block account"}
          </button>}
        </div>
      </PageHeader>

      {error && <div className="alert alert-error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
      {loading && <div className="loading-strip"><span />Loading student…</div>}

      {!loading && !user && !error && (
        <section className="data-panel"><div className="empty-state"><Users size={22} /><strong>Student not found</strong><span>This account may have been removed.</span></div></section>
      )}

      {user && <UserDetailView user={user} attempts={attempts} onRefund={(amount) => void refundTokens(amount)} />}
    </div>
    {notice && <div className="toast" role="status"><Check size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={14} /></button></div>}
  </AdminShell>;
}

export default function UserDetailPage() {
  return (
    <RequireAuth>
      <UserDetailContent />
    </RequireAuth>
  );
}
