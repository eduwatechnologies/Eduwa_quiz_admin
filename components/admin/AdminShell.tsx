"use client";

import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type { AdminUser } from "@/lib/admin-api";

export type AdminSection = "overview" | "questions" | "subjects" | "users" | "campaigns" | "analytics";

const navItems: { id: AdminSection; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { id: "questions", label: "Question bank", icon: FileQuestion, group: "CONTENT" },
  { id: "subjects", label: "Subjects", icon: BookOpen, group: "CONTENT" },
  { id: "users", label: "Users", icon: Users, group: "MANAGE" },
  { id: "campaigns", label: "Ad campaigns", icon: Megaphone, group: "MANAGE" },
  { id: "analytics", label: "Analytics", icon: Activity, group: "INSIGHTS" },
];

type AdminShellProps = {
  section: AdminSection;
  admin: AdminUser | null;
  questionCount: number;
  children: ReactNode;
  onNavigate: (section: AdminSection) => void;
  onSignOut: () => void;
  onNotice: (message: string) => void;
};

export function AdminShell({ section, admin, questionCount, children, onNavigate, onSignOut, onNotice }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeNav = navItems.find((item) => item.id === section);
  const adminName = admin?.name || "Eduwa Admin";
  const adminInitial = adminName.split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  function navigate(target: AdminSection) {
    onNavigate(target);
    setMobileNavOpen(false);
  }

  return <div className="admin-shell">
    {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
    <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
      <button type="button" className="brand" onClick={() => navigate("overview")}>
        <span className="brand-mark"><GraduationCap size={21} strokeWidth={2.2} /></span>
        <span className="brand-word">Eduwa<span>.</span></span><span className="brand-tag">ADMIN</span>
      </button>
      <div className="workspace-switch"><div className="workspace-symbol"><Command size={15} /></div><div className="workspace-copy"><strong>Eduwa Quiz</strong><span>Content workspace</span></div><ChevronDown size={15} className="workspace-chevron" /></div>
      <nav className="primary-nav" aria-label="Admin navigation">{(["WORKSPACE", "CONTENT", "MANAGE", "INSIGHTS"] as const).map((group) => <div className="nav-group" key={group}><p className="nav-heading">{group}</p>{navItems.filter((item) => item.group === group).map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${section === id ? "nav-link-active" : ""}`} onClick={() => navigate(id)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{id === "questions" && <span className="nav-count">{new Intl.NumberFormat("en").format(questionCount)}</span>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><button className="nav-link" onClick={() => onNotice("Help center is coming soon.")}><CircleHelp size={17} /><span>Help center</span><ArrowUpRight size={13} className="nav-external" /></button><div className="sidebar-rule" /><div className="profile-switch"><span className="profile-avatar">{adminInitial}</span><span className="profile-meta"><strong>{adminName}</strong><small>{admin?.email || "Signed in"}</small></span><button className="icon-button" onClick={onSignOut} aria-label="Sign out" title="Sign out"><LogOut size={15} /></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumbs"><span>Eduwa</span><ChevronRight size={14} /><strong>{activeNav?.label}</strong></div></div><div className="topbar-actions"><span className="connection-pill connection-live"><i />Live API</span><button className="icon-button" aria-label="Notifications" onClick={() => onNotice("You’re all caught up.")}><Bell size={17} /><i className="notification-dot" /></button><button className="topbar-avatar" onClick={onSignOut} aria-label="Sign out" title="Sign out">{adminInitial}</button></div></header>
      {children}
    </main>
  </div>;
}