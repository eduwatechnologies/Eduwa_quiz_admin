"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, ChevronLeft, ChevronRight, Coins, Ellipsis, FileQuestion, GraduationCap, Settings2, TrendingUp, Users, X, Zap } from "lucide-react";
import type { Question, Subject, UserAttempt, UserDetail, UserRecord } from "@/lib/admin-api";

export function formatNumber(value = 0) {
  return new Intl.NumberFormat("en", { notation: value > 9999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

export function formatCurrency(value = 0) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

export function initials(name = "Eduwa Admin") {
  return name.split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

export function PageHeader({ title, eyebrow, subtitle, children }: {
  title: string;
  eyebrow: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return <section className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{children}</section>;
}

export function QuestionTable({ rows, subjects, onEdit, onDelete }: {
  rows: Question[];
  subjects: Subject[];
  onEdit: (row: Question) => void;
  onDelete: (row: Question) => void;
}) {
  return <div className="table-scroll"><table className="admin-table"><thead><tr><th>QUESTION</th><th>SUBJECT</th><th>YEAR</th><th>DIFFICULTY</th><th>SOURCE</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><div className="question-cell"><span className="table-check"><FileQuestion size={15} /></span><div><strong>{item.text}</strong><small>{item.topic} <i>·</i> {item.id}</small></div></div></td><td><span className="subject-tag">{subjects.find((subject) => subject.id === item.subjectId)?.shortName ?? item.subjectId}</span></td><td>{item.year}</td><td><span className={`difficulty difficulty-${item.difficulty?.toLowerCase()}`}>{item.difficulty}</span></td><td><span className="source-pill">{item.source ?? "past"}</span></td><td><div className="row-actions"><button onClick={() => onEdit(item)} aria-label="Edit question"><Settings2 size={15} /></button><button onClick={() => onDelete(item)} aria-label="Delete question"><X size={15} /></button></div></td></tr>)}{!rows.length && <tr><td colSpan={6}><div className="empty-state"><FileQuestion size={22} /><strong>No questions found</strong><span>Try changing your search or add a question to the bank.</span></div></td></tr>}</tbody></table></div>;
}

export function UserTable({ rows, onManage, onOpen }: {
  rows: UserRecord[];
  onManage: (user: UserRecord) => void;
  onOpen: (user: UserRecord) => void;
}) {
  const colors = ["#E6F5EC", "#EAF2FE", "#FFF4E3", "#FCECEE", "#EBF6F4"];
  return <div className="table-scroll"><table className="admin-table user-table"><thead><tr><th>STUDENT</th><th>COURSE</th><th>ACTIVITY</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((user, index) => <tr key={user.id} onClick={() => onOpen(user)} className="row-clickable"><td><div className="user-cell"><span className="user-avatar" style={{ backgroundColor: colors[index % colors.length] }}>{initials(user.name)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td>{user.course}</td><td><strong>{formatNumber(user.questionsAnswered ?? 0)}</strong><small className="table-subline">questions answered</small></td><td><span className={`status-pill ${user.status === "blocked" ? "status-blocked" : "status-active"}`}><i />{user.status}</span></td><td onClick={(event) => event.stopPropagation()}><details className="row-menu"><summary aria-label="User actions"><Ellipsis size={17} /></summary><div><button onClick={() => onOpen(user)}>View profile</button><button className="danger-link" onClick={() => onManage(user)}>{user.status === "blocked" ? "Unblock account" : "Block account"}</button></div></details></td></tr>)}{!rows.length && <tr><td colSpan={5}><div className="empty-state"><Users size={22} /><strong>No students found</strong><span>Try a different name, email, or course.</span></div></td></tr>}</tbody></table></div>;
}

export function UserDetailView({ user, attempts, onRefund }: {
  user: UserDetail;
  attempts: UserAttempt[];
  onRefund: (amount: number) => void;
}) {
  const colors = ["#E6F5EC", "#EAF2FE", "#FFF4E3"];
  const [amount, setAmount] = useState(500);
  const stats = user.stats;
  const tokens = user.tokens ?? { total: 0, used: 0, remaining: 0 };
  const usedRatio = tokens.total ? Math.min(tokens.used / tokens.total, 1) : 0;
  const averageAttempts = attempts.length
    ? Math.round(attempts.reduce((sum, item) => sum + item.percentage, 0) / attempts.length)
    : 0;

  const statCards = [
    { label: "Questions answered", value: formatNumber(stats.questionsAnswered), icon: FileQuestion, tone: "mint" },
    { label: "Average score", value: `${stats.averageScore}%`, icon: TrendingUp, tone: "blue" },
    { label: "Sessions", value: formatNumber(stats.sessionsCompleted), icon: Activity, tone: "amber" },
    { label: "Day streak", value: formatNumber(stats.currentStreak), icon: Zap, tone: "mint" },
  ];

  return <>
    <section className="profile-hero">
      <span className="user-avatar profile-avatar-lg" style={{ backgroundColor: colors[0] }}>{initials(user.name)}</span>
      <div className="profile-hero-copy">
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <div className="profile-tags">
          <span className="subject-tag"><GraduationCap size={12} />{user.course}</span>
          <span className="subject-tag">JAMB {user.examYear}</span>
          {user.role ? <span className="subject-tag">{user.role}</span> : null}
          <span className={`status-pill ${user.status === "blocked" ? "status-blocked" : "status-active"}`}><i />{user.status}</span>
        </div>
      </div>
    </section>

    <div className="detail-grid">
      <div className="detail-main">
        <div className="content-metrics detail-metrics">
          {statCards.map(({ label, value, icon: Icon, tone }) => <div key={label}>
            <span className={`content-metric-icon metric-${tone}`}><Icon size={15} /></span>
            <span><strong>{value}</strong><small>{label}</small></span>
          </div>)}
        </div>

        <section className="data-panel">
          <div className="panel-top"><div><h2>Recent attempts</h2><p>Latest practice sessions for this student</p></div></div>
          <div className="table-scroll"><table className="admin-table"><thead><tr><th>SUBJECT</th><th>TOPIC</th><th>MODE</th><th>SCORE</th><th>DATE</th></tr></thead><tbody>
            {attempts.map((item) => <tr key={item.id}>
              <td><strong>{item.subjectName}</strong></td>
              <td>{item.topic || "—"}</td>
              <td><span className="source-pill">{item.mode}</span></td>
              <td><strong>{item.percentage}%</strong><small className="table-subline">{item.score}/{item.questionsCount}</small></td>
              <td>{new Date(item.completedAt).toLocaleDateString()}</td>
            </tr>)}
            {!attempts.length && <tr><td colSpan={5}><div className="empty-state"><FileQuestion size={22} /><strong>No attempts yet</strong><span>This student has not completed a practice session.</span></div></td></tr>}
          </tbody></table></div>
        </section>
      </div>

      <aside className="detail-side">
        <section className="data-panel token-panel">
          <div className="panel-top"><div><h2>AI tokens</h2><p>Balance available for Smart Practice and the coach</p></div></div>
          <div className="token-balance"><strong>{formatNumber(tokens.remaining)}</strong><span>remaining of {formatNumber(tokens.total)}</span></div>
          <div className="token-track"><i style={{ width: `${usedRatio * 100}%` }} /></div>
          <div className="token-stats">
            <div><span>Purchased</span><strong>{formatNumber(tokens.total)}</strong></div>
            <div><span>Spent</span><strong>{formatNumber(tokens.used)}</strong></div>
          </div>
          <label className="token-credit-label">
            Credit tokens
            <select value={amount} onChange={(event) => setAmount(Number(event.target.value))}>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
            </select>
          </label>
          <button className="button button-primary button-full" onClick={() => onRefund(amount)} disabled={amount <= 0}>
            <Coins size={15} />Credit {formatNumber(amount)} tokens
          </button>
        </section>

        <section className="data-panel">
          <div className="panel-top"><div><h2>Account</h2></div></div>
          <dl className="detail-list">
            <div><dt>Student ID</dt><dd>{user.id}</dd></div>
            <div><dt>Joined</dt><dd>{new Date(user.createdAt).toLocaleDateString()}</dd></div>
            <div><dt>Recent average</dt><dd>{attempts.length ? `${averageAttempts}%` : "—"}</dd></div>
            <div><dt>Status</dt><dd className="capitalize">{user.status}</dd></div>
          </dl>
        </section>
      </aside>
    </div>
  </>;
}

export function Pagination({ page, pageCount, count, pageSize, onChange }: {
  page: number;
  pageCount: number;
  count: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const start = count === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, count);
  return <div className="pagination"><span>Showing <strong>{start}–{end}</strong> of <strong>{count}</strong></span><div><button disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><span>Page {page + 1} of {pageCount}</span><button disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div></div>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><div><span className="eyebrow">EDUWA ADMIN</span><h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header><div className="modal-content">{children}</div></section></div>;
}