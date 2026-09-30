"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, GraduationCap, Lock, Mail, ShieldCheck, Server } from "lucide-react";
import { useAuth } from "@/components/admin/AuthProvider";
import { ApiError, getApiBaseUrl } from "@/lib/admin-api";

export default function SignInPanel() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [baseUrl, setBaseUrl] = useState(getApiBaseUrl());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(baseUrl.trim(), email.trim(), password);
      router.replace("/");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not reach the API. Check the base URL and that the server is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-brand">
        <span className="brand-mark auth-mark"><GraduationCap size={22} strokeWidth={2.2} /></span>
        <h1>Eduwa<span>.</span> Admin</h1>
        <p>Content operations for the JAMB practice app — question bank, students, subjects, and campaigns.</p>
        <ul className="auth-points">
          <li><ShieldCheck size={15} />Admin-only access, enforced server-side</li>
          <li><Lock size={15} />Session tokens never leave this browser</li>
        </ul>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-heading">
            <h2>Sign in</h2>
            <p>Use the admin account created by <code>npm run seed:admin</code>.</p>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <label>
            API base URL
            <span className="auth-field">
              <Server size={15} />
              <input
                type="url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="http://localhost:4000/api"
                required
                autoComplete="url"
              />
            </span>
          </label>

          <label>
            Email
            <span className="auth-field">
              <Mail size={15} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@eduwa.app"
                required
                autoComplete="username"
              />
            </span>
          </label>

          <label>
            Password
            <span className="auth-field">
              <Lock size={15} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-reveal"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>

          <button className="button button-primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : <>Sign in <ArrowRight size={15} /></>}
          </button>

          <small className="form-note">
            The API must allow browser requests from this origin (CORS <code>CLIENT_ORIGIN</code>).
          </small>
        </form>
      </section>
    </div>
  );
}
