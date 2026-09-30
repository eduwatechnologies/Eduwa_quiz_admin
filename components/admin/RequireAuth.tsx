"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/admin/AuthProvider";
import SignInPanel from "@/components/admin/SignInPanel";

/**
 * Wraps every authenticated page. Renders nothing while the stored session is
 * being validated, sends anonymous visitors to /signin, and otherwise renders
 * the page. Without this, a refresh on any admin route would flash the
 * workspace and then fail on its first request.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "anonymous") router.replace("/signin");
  }, [status, router]);

  if (status === "loading") {
    return <div className="auth-screen auth-loading" role="status" aria-live="polite" />;
  }
  if (status === "anonymous") return <SignInPanel />;
  return <>{children}</>;
}
