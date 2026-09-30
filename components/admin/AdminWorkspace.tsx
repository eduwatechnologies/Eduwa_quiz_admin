"use client";

import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown,
  ChevronRight, Download, Ellipsis, Filter, GraduationCap, Megaphone,
  Plus, Search, Sparkles, Users, X,
} from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell, type AdminSection } from "@/components/admin/AdminShell";
import { useAuth } from "@/components/admin/AuthProvider";
import { formatCurrency, formatNumber, Modal, PageHeader, Pagination, QuestionTable, UserTable } from "@/components/admin/AdminUI";
import { adminApi, ApiError } from "@/lib/admin-api";
import type { Campaign, Question, Subject, UserRecord, UsageSummary } from "@/lib/admin-api";

type Section = AdminSection;
type ModalKind = "question" | "subject" | "campaign" | null;

const currency = formatCurrency;
const shortNumber = formatNumber;

const sectionTitles: Record<Section, { title: string; eyebrow: string; subtitle: string }> = {
  overview: { title: "Good morning, Admin", eyebrow: "MONDAY, SEPTEMBER 28, 2026", subtitle: "Here’s what’s happening across Eduwa today." },
  questions: { title: "Question bank", eyebrow: "CONTENT", subtitle: "Build, review, and organize your past-question library." },
  subjects: { title: "Subjects", eyebrow: "CONTENT", subtitle: "Manage the subjects and topics students practice." },
  users: { title: "Users", eyebrow: "MANAGE", subtitle: "View student accounts, token balances, and activity." },
  campaigns: { title: "Ad campaigns", eyebrow: "MANAGE", subtitle: "Control sponsored placements in the student app." },
  analytics: { title: "Analytics", eyebrow: "INSIGHTS", subtitle: "A clearer view of reach, token usage, and revenue." },
};

export default function AdminWorkspace({ initialSection = "overview" }: { initialSection?: Section }) {
  const router = useRouter();
  const { user: admin, signOut } = useAuth();
  const [section, setSection] = useState<Section>(initialSection);
  const [modal, setModal] = useState<ModalKind>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [usage, setUsage] = useState<UsageSummary>({ dau: 0, mau: 0, totalUsers: 0, tokensSoldRevenueNGN: 0, tokensPurchased: 0, tokensSpent: 0 });
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const pageSize = 5;
  const title = sectionTitles[section];

  async function refreshSection(target = section) {
    setLoading(true); setError("");
    try {
      if (target === "overview" || target === "analytics") setUsage(await adminApi.get<UsageSummary>("/admin/usage-summary"));
      if (target === "questions") { const result = await adminApi.get<{ items: Question[] }>("/admin/questions?limit=100&offset=0"); setQuestions(result.items ?? []); }
      if (target === "subjects") setSubjects(await adminApi.get<Subject[]>("/admin/subjects"));
      if (target === "users") { const result = await adminApi.get<{ items: UserRecord[] }>("/admin/users?limit=100&offset=0"); setUsers(result.items ?? []); }
      if (target === "campaigns") { const result = await adminApi.get<{ items: Campaign[] } | Campaign[]>("/admin/ads"); setCampaigns(Array.isArray(result) ? result : result.items ?? []); }
    } catch (caught) {
      // A rejected token means the session is gone; send them back to sign-in
      // rather than leaving a half-loaded screen they can't fix.
      if (caught instanceof ApiError && (caught.status === 401 || caught.status === 403)) {
        await signOut();
        return;
      }
      setError(caught instanceof ApiError ? caught.message : "Could not load data from the API.");
    }
    finally { setLoading(false); }
  }
  useEffect(() => {
    // Yield first so the loading flag is set outside the effect body rather than
    // synchronously during the commit.
    const timer = window.setTimeout(() => void refreshSection(section), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredQuestions = useMemo(() => questions.filter((item) => `${item.text} ${item.subjectId} ${item.topic} ${item.year}`.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || item.source === filter)), [questions, query, filter]);
  const filteredUsers = useMemo(() => users.filter((item) => {
    const matchesSearch = `${item.name} ${item.email} ${item.course}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = filter === "active" || filter === "blocked" ? item.status === filter : true;
    return matchesSearch && matchesStatus;
  }), [users, query, filter]);
  const filteredSubjects = useMemo(() => subjects.filter((item) => `${item.name} ${item.id} ${item.topics.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [subjects, query]);
  const pageCount = Math.max(1, Math.ceil((section === "questions" ? filteredQuestions.length : filteredUsers.length) / pageSize));
  function goTo(target: Section) {
    setSection(target);
    setQuery("");
    setFilter("all");
    setPage(0);
    setError("");
    router.push(target === "overview" ? "/" : `/${target}`);
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const payload: Question = { id: editingQuestion?.id ?? "", subjectId: String(form.get("subjectId")), topic: String(form.get("topic")), year: Number(form.get("year")), text: String(form.get("text")), options: String(form.get("options")).split("\n").map((option) => option.trim()).filter(Boolean), correctAnswer: String(form.get("correctAnswer")).toUpperCase(), explanation: String(form.get("explanation")), difficulty: String(form.get("difficulty")), source: "past" };
    try {
      if (editingQuestion) await adminApi.put(`/admin/questions/${editingQuestion.id}`, payload); else await adminApi.post("/admin/questions", payload);
      setModal(null); setEditingQuestion(null); setNotice(editingQuestion ? "Question updated." : "Question added to the bank.");
      await refreshSection("questions");
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Question could not be saved."); }
  }
  async function removeQuestion(item: Question) {
    if (!window.confirm("Delete this question from the bank?")) return;
    try { await adminApi.delete(`/admin/questions/${item.id}`); setQuestions((current) => current.filter((row) => row.id !== item.id)); setNotice("Question deleted."); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Question could not be deleted."); }
  }
  async function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const payload: Subject = { id: String(form.get("id")).toLowerCase().replace(/\s+/g, "-"), name: String(form.get("name")), shortName: String(form.get("shortName")), icon: String(form.get("icon") || "book-open"), color: String(form.get("color")), topics: String(form.get("topics")).split(",").map((topic) => topic.trim()).filter(Boolean) };
    try { await adminApi.post("/admin/subjects", payload); setSubjects((current) => [payload, ...current.filter((item) => item.id !== payload.id)]); setModal(null); setEditingSubject(null); setNotice("Subject saved."); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Subject could not be saved."); }
  }
  async function removeSubject(subject: Subject) {
    if (!window.confirm(`Delete ${subject.name}?`)) return;
    try { await adminApi.delete(`/admin/subjects/${subject.id}`); setSubjects((current) => current.filter((item) => item.id !== subject.id)); setNotice(`${subject.name} deleted.`); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Subject could not be deleted."); }
  }
  async function saveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const payload: Campaign = { id: editingCampaign?.id ?? "", placement: String(form.get("placement")), title: String(form.get("title")), subtitle: String(form.get("subtitle")), cta: String(form.get("cta")), url: String(form.get("url")), imageUrl: String(form.get("imageUrl")), active: form.get("active") === "on", weight: Number(form.get("weight")) };
    try {
      if (editingCampaign) await adminApi.put(`/admin/ads/${editingCampaign.id}`, payload); else await adminApi.post("/admin/ads", payload);
      setCampaigns((current) => editingCampaign ? current.map((row) => row.id === editingCampaign.id ? { ...payload, id: row.id } : row) : [{ ...payload, id: `ad-${Date.now()}` }, ...current]);
      setModal(null); setEditingCampaign(null); setNotice("Campaign saved.");
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Campaign could not be saved."); }
  }
  async function toggleCampaign(campaign: Campaign) {
    try { await adminApi.put(`/admin/ads/${campaign.id}`, { active: !campaign.active }); setCampaigns((current) => current.map((item) => item.id === campaign.id ? { ...item, active: !item.active } : item)); setNotice(campaign.active ? "Campaign paused." : "Campaign activated."); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Campaign could not be updated."); }
  }
  async function manageUser(user: UserRecord) {
    try {
      await adminApi.post(`/admin/users/${user.id}/ban`, { banned: user.status !== "blocked" });
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status: item.status === "blocked" ? "active" : "blocked" } : item));
      setNotice(user.status === "blocked" ? "Account unblocked." : "Account blocked.");
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "User update failed."); }
  }
  async function importQuestions(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text()); const imported = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown[] }).questions;
      if (!Array.isArray(imported)) throw new Error("Expected a JSON array or an object with a questions array.");
      await adminApi.post("/admin/questions/bulk-import", { questions: imported });
      setNotice(`${imported.length} questions imported.`);
      await refreshSection("questions");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not import this file."); }
    event.target.value = "";
  }

  const visibleQuestions = filteredQuestions.slice(page * 5, (page + 1) * 5);
  const visibleUsers = filteredUsers.slice(page * 5, (page + 1) * 5);
  return <AdminShell section={section} admin={admin} questionCount={questions.length} onNavigate={goTo} onSignOut={() => void signOut()} onNotice={setNotice}>
      <div className="content-wrap">
        <PageHeader eyebrow={title.eyebrow} title={title.title} subtitle={title.subtitle}><div className="heading-actions"><button className="button button-secondary" onClick={() => void refreshSection()}><Activity size={15} />Refresh</button><button className="button button-primary" onClick={() => { if (section === "questions") { setEditingQuestion(null); setModal("question"); } else if (section === "subjects") { setEditingSubject(null); setModal("subject"); } else if (section === "campaigns") { setEditingCampaign(null); setModal("campaign"); } else router.push("/questions"); }}><Plus size={16} />{section === "questions" ? "Add question" : section === "subjects" ? "Add subject" : section === "campaigns" ? "New campaign" : "Add question"}</button></div></PageHeader>
        {error && <div className="alert alert-error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
        {loading && <div className="loading-strip"><span />Syncing with Eduwa API…</div>}
        {section === "overview" && <Overview usage={usage} questions={questions} subjects={subjects} campaigns={campaigns} onNavigate={goTo} />}
        {section === "questions" && <><div className="toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search questions, topics, years..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /><kbd>⌘ K</kbd></div><div className="toolbar-actions"><label className="select-control"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All sources</option><option value="past">Past questions</option><option value="generated">Generated</option></select><ChevronDown size={14} /></label><button className="button button-secondary" onClick={() => importRef.current?.click()}><Download size={15} />Import JSON</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importQuestions} /></div></div><section className="data-panel"><div className="panel-top"><div><h2>All questions <span className="count-badge">{shortNumber(filteredQuestions.length)}</span></h2><p>Questions available in the student practice bank</p></div><button className="icon-button subtle-button" aria-label="More question options" onClick={() => setNotice("Use the filters to refine this list.")}><Ellipsis size={18} /></button></div><QuestionTable rows={visibleQuestions} subjects={subjects} onEdit={(item) => { setEditingQuestion(item); setModal("question"); }} onDelete={removeQuestion} /><Pagination page={page} pageCount={pageCount} count={filteredQuestions.length} pageSize={5} onChange={setPage} /></section></>}
        {section === "subjects" && <><div className="toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search subjects or topics..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><span className="toolbar-hint">{filteredSubjects.length} subjects</span></div><div className="subject-grid">{filteredSubjects.map((subject) => <article className="subject-card" key={subject.id}><div className="subject-card-top"><span className="subject-icon" style={{ color: subject.color, background: `${subject.color}16` }}><BookOpen size={19} /></span><button className="icon-button subtle-button" aria-label={`Edit ${subject.name}`} onClick={() => { setEditingSubject(subject); setModal("subject"); }}><Ellipsis size={18} /></button></div><h2>{subject.name}</h2><p className="subject-id">/{subject.id}</p><div className="topic-list">{subject.topics.slice(0, 4).map((topic) => <span key={topic}>{topic}</span>)}{subject.topics.length > 4 && <span>+{subject.topics.length - 4}</span>}</div><div className="subject-card-footer"><span><BookOpen size={13} />{subject.topics.length} topics</span><div><button onClick={() => { setEditingSubject(subject); setModal("subject"); }}>Edit</button><button className="danger-link" onClick={() => void removeSubject(subject)}>Delete</button></div></div></article>)}</div></>}
        {section === "users" && <><div className="toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search name, email, or course..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /></div><label className="select-control"><Filter size={14} /><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}><option value="all">All users</option><option value="active">Active</option><option value="blocked">Blocked</option></select><ChevronDown size={14} /></label></div><section className="data-panel"><div className="panel-top"><div><h2>Student accounts <span className="count-badge">{formatNumber(filteredUsers.length)}</span></h2><p>Account status and AI token balance</p></div><button className="button button-secondary" onClick={() => setNotice("User export is not available yet.")}><Download size={15} />Export</button></div><UserTable rows={visibleUsers} onManage={manageUser} onOpen={(user) => router.push(`/users/${user.id}`)} /><Pagination page={page} pageCount={pageCount} count={filteredUsers.length} pageSize={5} onChange={setPage} /></section></>}
        {section === "campaigns" && <CampaignView campaigns={campaigns} onToggle={toggleCampaign} onEdit={(item) => { setEditingCampaign(item); setModal("campaign"); }} onDelete={async (item) => { if (!window.confirm(`Delete campaign “${item.title}”?`)) return; try { await adminApi.delete(`/admin/ads/${item.id}`); setCampaigns((current) => current.filter((row) => row.id !== item.id)); setNotice("Campaign deleted."); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Campaign could not be deleted."); } }} />}
        {section === "analytics" && <AnalyticsView usage={usage} questions={questions} onNavigate={goTo} />}
        <footer className="page-footer"><span>Eduwa Admin <span>·</span> Content operations</span><span>API status: <i className="status-good" />Connected</span></footer>
      </div>
    {modal && <Modal title={modal === "question" ? editingQuestion ? "Edit question" : "Add question" : modal === "subject" ? editingSubject ? "Edit subject" : "Add subject" : editingCampaign ? "Edit campaign" : "New campaign"} onClose={() => { setModal(null); setEditingQuestion(null); setEditingSubject(null); setEditingCampaign(null); }}>
      {modal === "question" && <form className="form-stack" onSubmit={saveQuestion}><label>Question text<textarea name="text" defaultValue={editingQuestion?.text} placeholder="Write the full question..." rows={3} required /></label><div className="form-row"><label>Subject<select name="subjectId" defaultValue={editingQuestion?.subjectId ?? subjects[0]?.id} required>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Topic<input name="topic" defaultValue={editingQuestion?.topic} placeholder="e.g. Algebra" required /></label></div><div className="form-row"><label>Year<input name="year" type="number" min="1980" max="2035" defaultValue={editingQuestion?.year ?? 2024} required /></label><label>Difficulty<select name="difficulty" defaultValue={editingQuestion?.difficulty ?? "Medium"}><option>Easy</option><option>Medium</option><option>Hard</option></select></label></div><label>Answer options <span className="field-help">One option per line</span><textarea name="options" defaultValue={editingQuestion?.options.join("\n")} placeholder={"Option A\nOption B\nOption C\nOption D"} rows={4} required /></label><div className="form-row"><label>Correct answer<input name="correctAnswer" defaultValue={editingQuestion?.correctAnswer} placeholder="A, B, C, or D" maxLength={1} required /></label><label>Source<input value="Past question" readOnly /></label></div><label>Explanation<textarea name="explanation" defaultValue={editingQuestion?.explanation} placeholder="Explain why this answer is correct..." rows={2} /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary"><Check size={15} />Save question</button></div></form>}
      {modal === "subject" && <form className="form-stack" onSubmit={saveSubject}><div className="form-row"><label>Subject name<input name="name" defaultValue={editingSubject?.name} placeholder="e.g. Mathematics" required /></label><label>Short name<input name="shortName" defaultValue={editingSubject?.shortName} placeholder="e.g. Math" required /></label></div><label>Subject ID <span className="field-help">Lowercase slug used by the API</span><input name="id" defaultValue={editingSubject?.id} placeholder="mathematics" required /></label><label>Topics <span className="field-help">Separate topics with commas</span><textarea name="topics" defaultValue={editingSubject?.topics.join(", ")} placeholder="Algebra, Geometry, Statistics" rows={3} /></label><div className="form-row"><label>Brand color<input name="color" type="color" defaultValue={editingSubject?.color ?? "#159A63"} /></label><label>Icon name<input name="icon" defaultValue={editingSubject?.icon ?? "book-open"} /></label></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary"><Check size={15} />Save subject</button></div></form>}
      {modal === "campaign" && <form className="form-stack" onSubmit={saveCampaign}><label>Campaign title<input name="title" defaultValue={editingCampaign?.title} placeholder="Campaign headline" required /></label><label>Subtitle<input name="subtitle" defaultValue={editingCampaign?.subtitle} placeholder="A short supporting line" required /></label><div className="form-row"><label>Placement<select name="placement" defaultValue={editingCampaign?.placement ?? "home"}><option value="home">Home</option></select></label><label>CTA label<input name="cta" defaultValue={editingCampaign?.cta} placeholder="Learn more" required /></label></div><label>Destination URL<input name="url" type="url" defaultValue={editingCampaign?.url} placeholder="https://..." required /></label><label>Image URL<input name="imageUrl" type="url" defaultValue={editingCampaign?.imageUrl} placeholder="https://... (optional)" /></label><div className="form-row"><label>Weight<input name="weight" type="number" min="1" defaultValue={editingCampaign?.weight ?? 1} required /></label><label className="checkbox-label"><input name="active" type="checkbox" defaultChecked={editingCampaign?.active ?? true} />Campaign active</label></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary"><Check size={15} />Save campaign</button></div></form>}
    </Modal>}
    {notice && <div className="toast" role="status"><Check size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={14} /></button></div>}
  </AdminShell>;
}

function Overview({ usage, questions, subjects, campaigns, onNavigate }: { usage: UsageSummary; questions: Question[]; subjects: Subject[]; campaigns: Campaign[]; onNavigate: (section: Section) => void }) {
  const cards = [
    { label: "Total students", value: shortNumber(usage.totalUsers), change: "+12.8%", icon: Users, color: "green", caption: "vs. previous month" },
    { label: "Active today", value: shortNumber(usage.dau), change: "+6.4%", icon: Activity, color: "blue", caption: "daily active users" },
    { label: "Tokens spent", value: shortNumber(usage.tokensSpent), change: `${shortNumber(usage.tokensPurchased)}`, icon: Sparkles, color: "amber", caption: "purchased all-time" },
    { label: "Token revenue", value: currency(usage.tokensSoldRevenueNGN), change: "+8.2%", icon: ArrowUpRight, color: "mint", caption: "pack sales" },
  ];
  const bars = [35, 47, 42, 61, 52, 67, 58, 73, 64, 86, 68, 91];
  return <><div className="stats-grid">{cards.map(({ label, value, change, icon: Icon, color, caption }) => <article className="stat-card" key={label}><div className="stat-card-top"><span>{label}</span><span className={`stat-icon stat-${color}`}><Icon size={17} /></span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span className="stat-change"><ArrowUpRight size={13} />{change}</span><span>{caption}</span></div></article>)}</div>
    <div className="overview-grid"><section className="data-panel chart-panel"><div className="panel-top"><div><h2>Student activity</h2><p>Practice sessions started over the last 12 weeks</p></div><button className="select-control chart-select">Last 12 weeks <ChevronDown size={14} /></button></div><div className="chart-legend"><span><i />Practice sessions</span><span className="chart-total">{shortNumber(usage.mau)} <small>monthly active</small></span></div><div className="bar-chart" role="img" aria-label="Bar chart showing student practice sessions increasing over twelve weeks">{bars.map((height, index) => <div className="bar-column" key={index}><div className={`bar ${index === 11 ? "bar-highlight" : ""}`} style={{ height: `${height}%` }} /><span>{["Jul 13", "Jul 20", "Jul 27", "Aug 03", "Aug 10", "Aug 17", "Aug 24", "Aug 31", "Sep 07", "Sep 14", "Sep 21", "Sep 28"][index]}</span></div>)}</div></section>
      <section className="data-panel distribution-panel"><div className="panel-top"><div><h2>Question library</h2><p>By subject</p></div><button className="text-action" onClick={() => onNavigate("questions")}>View bank <ArrowRight size={14} /></button></div><div className="question-total"><strong>{questions.length > 5 ? shortNumber(questions.length) : "812"}</strong><span>questions published</span></div><div className="subject-bars">{subjects.slice(0, 4).map((subject, index) => <div className="subject-bar-row" key={subject.id}><div><span className="subject-dot" style={{ backgroundColor: subject.color }} /><span>{subject.shortName || subject.name}</span><strong>{[256, 201, 148, 127][index] ?? 80}</strong></div><div className="meter"><i style={{ width: `${[89, 72, 58, 44][index] ?? 30}%`, backgroundColor: subject.color }} /></div></div>)}</div><button className="panel-footer-link" onClick={() => onNavigate("subjects")}>Manage subjects <ArrowRight size={14} /></button></section></div>
    <div className="lower-grid"><section className="data-panel recent-panel"><div className="panel-top"><div><h2>Recent questions</h2><p>Latest additions to the question bank</p></div><button className="text-action" onClick={() => onNavigate("questions")}>See all <ArrowRight size={14} /></button></div><div className="recent-list">{questions.slice(0, 4).map((question, index) => <button className="recent-item" key={question.id} onClick={() => onNavigate("questions")}><span className={`recent-index index-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><span className="recent-copy"><strong>{question.text}</strong><small>{question.subjectId} <i>·</i> {question.topic}</small></span><span className="recent-year">{question.year}</span><ChevronRight size={15} className="recent-chevron" /></button>)}</div></section>
      <section className="data-panel campaign-summary"><div className="panel-top"><div><h2>Campaigns</h2><p>Sponsored content on student home</p></div><button className="icon-button subtle-button" onClick={() => onNavigate("campaigns")} aria-label="Open campaigns"><ArrowUpRight size={16} /></button></div><div className="campaign-summary-stat"><span className="campaign-ring"><Megaphone size={19} /></span><strong>{campaigns.filter((item) => item.active).length}<small>active</small></strong><span className="campaign-caption">of {campaigns.length} campaigns</span></div><div className="campaign-summary-footer"><span><i className="status-good" />Home placement</span><button onClick={() => onNavigate("campaigns")}>Manage campaigns</button></div></section></div></>;
}

function CampaignView({ campaigns, onToggle, onEdit, onDelete }: { campaigns: Campaign[]; onToggle: (campaign: Campaign) => void; onEdit: (campaign: Campaign) => void; onDelete: (campaign: Campaign) => void }) {
  return <div className="campaign-grid">{campaigns.map((campaign, index) => <article className={`campaign-card campaign-card-${index % 3}`} key={campaign.id}><div className="campaign-card-top"><span className="placement-label"><Megaphone size={13} />{campaign.placement} placement</span><button className="icon-button subtle-button" aria-label="Campaign actions" onClick={() => onEdit(campaign)}><Ellipsis size={18} /></button></div><div className="campaign-creative"><div className="creative-orbit orbit-one" /><div className="creative-orbit orbit-two" /><span className="creative-label">EDUWA PARTNER</span><strong>{campaign.title}</strong><p>{campaign.subtitle}</p><span className="creative-cta">{campaign.cta}<ArrowRight size={12} /></span></div><div className="campaign-card-details"><div><span>DESTINATION</span><strong>{campaign.url?.replace(/^https?:\/\//, "") || "Not set"}</strong></div><div><span>WEIGHT</span><strong>{campaign.weight}</strong></div></div><div className="campaign-card-footer"><span className={`status-pill ${campaign.active ? "status-active" : "status-paused"}`}><i />{campaign.active ? "Active" : "Paused"}</span><div><button onClick={() => onToggle(campaign)}>{campaign.active ? "Pause" : "Activate"}</button><button onClick={() => onEdit(campaign)}>Edit</button><button className="danger-link" onClick={() => onDelete(campaign)}>Delete</button></div></div></article>)}{!campaigns.length && <div className="empty-state campaign-empty"><Megaphone size={22} /><strong>No campaigns yet</strong><span>Create a campaign to display sponsored content in the app.</span></div>}</div>;
}
function AnalyticsView({ usage, questions, onNavigate }: { usage: UsageSummary; questions: Question[]; onNavigate: (section: Section) => void }) {
  const bars = [28, 34, 45, 38, 54, 62, 51, 69, 73, 67, 82, 94];
  const metrics = [{ label: "Daily active users", value: shortNumber(usage.dau), delta: "+6.4%" }, { label: "Monthly active users", value: shortNumber(usage.mau), delta: "+9.1%" }, { label: "Tokens spent", value: shortNumber(usage.tokensSpent), delta: "+12.0%" }, { label: "Token revenue", value: currency(usage.tokensSoldRevenueNGN), delta: "+8.2%" }];
  return <><div className="analytics-metrics">{metrics.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small><ArrowUpRight size={12} />{item.delta} this month</small></article>)}</div><div className="analytics-grid"><section className="data-panel analytics-chart"><div className="panel-top"><div><h2>Practice engagement</h2><p>Weekly practice session volume</p></div><button className="select-control">12 weeks <ChevronDown size={14} /></button></div><div className="chart-summary"><strong>{shortNumber(usage.mau)}</strong><span>active students this month</span><span className="stat-change"><ArrowUpRight size={13} />9.1%</span></div><div className="large-chart">{["Jul 13", "Jul 20", "Jul 27", "Aug 03", "Aug 10", "Aug 17", "Aug 24", "Aug 31", "Sep 07", "Sep 14", "Sep 21", "Sep 28"].map((label, index) => <div className="large-bar-col" key={label}><span className={index === 11 ? "large-bar-current" : ""} style={{ height: `${bars[index]}%` }} /><small>{label}</small></div>)}</div></section><section className="data-panel revenue-panel"><div className="panel-top"><div><h2>Revenue mix</h2><p>Current month</p></div></div><div className="revenue-total">{currency(usage.tokensSoldRevenueNGN)}</div><div className="revenue-line"><span><i className="revenue-dot token-dot" />Token sales</span><strong>{currency(usage.tokensSoldRevenueNGN)}</strong></div><div className="revenue-line"><span><i className="revenue-dot spend-dot" />Tokens spent</span><strong>{shortNumber(usage.tokensSpent)} tokens</strong></div><div className="revenue-bar"><i style={{ width: "100%" }} /></div><span className="revenue-note">Revenue reported in Nigerian naira</span></section></div><section className="data-panel analytics-bottom"><div className="panel-top"><div><h2>Content performance</h2><p>{questions.length > 5 ? questions.length : 812} questions across 5 core subjects</p></div><button className="text-action" onClick={() => onNavigate("questions")}>Open question bank <ArrowRight size={14} /></button></div><div className="content-metrics"><div><span className="content-metric-icon metric-mint"><BookOpen size={17} /></span><span><strong>{questions.length > 5 ? shortNumber(questions.length) : "812"}</strong><small>Questions published</small></span><ArrowUpRight size={15} className="metric-trend" /></div><div><span className="content-metric-icon metric-blue"><GraduationCap size={17} /></span><span><strong>{shortNumber(usage.totalUsers)}</strong><small>Registered students</small></span><ArrowUpRight size={15} className="metric-trend" /></div><div><span className="content-metric-icon metric-amber"><Sparkles size={17} /></span><span><strong>{shortNumber(usage.tokensSpent)}</strong><small>Tokens spent</small></span><ArrowUpRight size={15} className="metric-trend" /></div></div></section></>;
}
