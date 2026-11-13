import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, ClipboardPlus, LayoutDashboard, Users, Route, BarChart3, Search, CheckCircle2 } from "lucide-react";
import "./styles.css";

const api = axios.create({ baseURL: "/api" });
const menu = [
  ["submit", "Submit report", ClipboardPlus],
  ["user", "User dashboard", LayoutDashboard],
  ["handler", "Handler dashboard", Users],
  ["routing", "Routing management", Route],
  ["analytics", "Analytics", BarChart3]
];

function App() {
  const [page, setPage] = useState("submit");
  const [refresh, setRefresh] = useState(0);
  return <div className="shell">
    <aside><div className="brand"><Activity size={26} /><span>Ticket<span className="accent">Router</span></span></div>
      <p className="nav-label">WORKSPACE</p>{menu.map(([id, label, Icon]) => <button className={page === id ? "nav active" : "nav"} key={id} onClick={() => setPage(id)}><Icon size={18} />{label}</button>)}
      <div className="side-note"><strong>System ready</strong><small>Validation and routing engine online</small></div>
    </aside>
    <main><header><div><p className="eyebrow">IT HELPDESK OPERATIONS</p><h1>{menu.find(([id]) => id === page)?.[1]}</h1></div><div className="online"><span /> API connected</div></header>
      {page === "submit" && <Submit onCreated={() => setRefresh((x) => x + 1)} />}
      {page === "user" && <UserDashboard refresh={refresh} />}
      {page === "handler" && <HandlerDashboard />}
      {page === "routing" && <RoutingDashboard />}
      {page === "analytics" && <Analytics />}
    </main>
  </div>;
}

function Submit({ onCreated }) {
  const [form, setForm] = useState({ identifier: "", department: "IT", code: "", description: "", urgency: "Medium", userEmail: "" });
  const [result, setResult] = useState(null); const [error, setError] = useState("");
  const update = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setError(""); setResult(null);
    try { const response = await api.post("/reports", form); setResult(response.data); onCreated(); }
    catch (err) { setError(err.response?.data?.errors?.join(" ") ?? "Unable to submit report."); }
  }
  return <section className="grid-two"><div className="card"><div className="card-title"><div><h2>New helpdesk report</h2><p>Enter a structured identifier to validate and route your ticket.</p></div><span className="badge">DFA + REGEX</span></div>
    <form onSubmit={submit}><label>Structured identifier <input value={form.identifier} onChange={update("identifier")} placeholder="DEPTIT-ISSUE123-H" /><small>Format: DEPT + 2 letters - ISSUE + 3 digits - H/M/L</small></label>
      <div className="form-row"><label>Department<select value={form.department} onChange={update("department")}><option>IT</option><option>Infrastructure</option><option>Security</option><option>General</option></select></label><label>Issue code<input value={form.code} onChange={update("code")} placeholder="NETWORK-01" /></label></div>
      <label>Description<textarea value={form.description} onChange={update("description")} placeholder="Describe the issue, affected service, and impact..." /></label>
      <div className="form-row"><label>Urgency<select value={form.urgency} onChange={update("urgency")}><option>High</option><option>Medium</option><option>Low</option></select></label><label>Your email<input type="email" value={form.userEmail} onChange={update("userEmail")} placeholder="you@organization.com" /></label></div>
      {error && <div className="error">{error}</div>}<button className="primary" type="submit">Validate and route report <Route size={17} /></button>
    </form></div><div className="card preview"><h3>Workflow</h3>{["DFA and regex validation", "Five-category classification", "Routing table lookup", "Capacity-aware assignment", "Status tracking"].map((item, index) => <div className="step" key={item}><span>{index + 1}</span><div><strong>{item}</strong><small>{index === 0 ? "Reject malformed identifiers before dispatch." : "Completed automatically after validation."}</small></div></div>)}{result && <div className="success"><CheckCircle2 size={20} /><div><strong>Report {result.reportId}</strong><small>{result.category} · {result.status} · {result.assignedHandler ?? "Queue"}</small></div></div>}</div></section>;
}

function useReports(refresh, userEmail) { const [data, setData] = useState([]); useEffect(() => { api.get("/reports", { params: userEmail ? { userEmail } : {} }).then((response) => setData(response.data)).catch(() => setData([])); }, [refresh, userEmail]); return data; }
function UserDashboard({ refresh }) { const reports = useReports(refresh); return <Dashboard title="Your reports" reports={reports} />;
}
function Dashboard({ title, reports }) { const [query, setQuery] = useState(""); const counts = { total: reports.length, pending: reports.filter((r) => ["Pending", "Queued"].includes(r.status)).length, assigned: reports.filter((r) => ["Assigned", "In Progress"].includes(r.status)).length, resolved: reports.filter((r) => r.status === "Resolved").length }; const filtered = reports.filter((r) => r.reportId.toLowerCase().includes(query.toLowerCase())); return <><div className="stats">{Object.entries(counts).map(([name, value]) => <div className="stat" key={name}><small>{name.toUpperCase()}</small><strong>{value}</strong></div>)}</div><div className="card"><div className="card-title"><div><h2>{title}</h2><p>Search by report ID and follow the current assignment.</p></div><div className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search report ID" /></div></div><ReportTable reports={filtered} /></div></>; }
function ReportTable({ reports }) { return reports.length ? <div className="table-wrap"><table><thead><tr><th>Report ID</th><th>Category</th><th>Zone</th><th>Priority</th><th>Status</th><th>Submitted</th></tr></thead><tbody>{reports.map((r) => <tr key={r.reportId}><td className="mono">{r.reportId}</td><td>{r.category}</td><td>{r.route?.zone ?? "Fallback"}</td><td><span className={`priority ${r.identifier?.at(-1)}`}>{r.identifier?.at(-1)}</span></td><td><span className={`status ${r.status.replace(" ", "-").toLowerCase()}`}>{r.status}</span></td><td>{new Date(r.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="empty">No reports yet. Submit a report to see it here.</div>; }
function HandlerDashboard() { const [data, setData] = useState({ handlers: [], reports: [] }); useEffect(() => { api.get("/dashboard/summary").then((r) => setData(r.data)); }, []); return <><div className="card"><div className="card-title"><div><h2>Zone capacity</h2><p>Zones 1–5 are capped at 8 open tickets; Zone 5 is Level-2.</p></div></div><div className="handler-grid">{data.handlers.map((h) => <div className="handler" key={h.handlerId}><div><strong>{h.name}</strong><small>{h.handlerId} · {h.openTickets}/{h.capacity} open tickets</small></div><button className={h.available ? "toggle on" : "toggle"} onClick={() => api.patch(`/handlers/${h.handlerId}`, { available: !h.available }).then(() => setData((old) => ({ ...old, handlers: old.handlers.map((x) => x.handlerId === h.handlerId ? { ...x, available: !x.available } : x) })))}>{h.available ? "Available" : "Unavailable"}</button></div>)}</div></div><div className="card assigned-card"><h2>Assigned reports</h2><ReportTable reports={data.reports.filter((report) => report.assignedTeam)} /></div></>; }
function RoutingDashboard() { const [summary, setSummary] = useState({ queuedReports: [], escalatedReports: [] }); useEffect(() => { api.get("/dashboard/summary").then((r) => setSummary(r.data)); }, []); return <><div className="card"><div className="card-title"><div><h2>Explicit zone routing table</h2><p>Each primary zone handles two issue types. Zone 5 is the Level-2 fallback.</p></div></div><table><thead><tr><th>Zone</th><th>Issue types</th><th>Team</th><th>Capacity rule</th></tr></thead><tbody>{[["Z1", "Hardware, Software", "Zone 1 Support"], ["Z2", "Software, Password", "Zone 2 Support"], ["Z3", "Password, Network", "Zone 3 Support"], ["Z4", "Network, Other", "Zone 4 Support"], ["Z5", "All issue types", "Level-2 Escalation"]].map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}<td>8 tickets / team</td></tr>)}</tbody></table></div><div className="grid-two queue-panels"><div className="card"><h2>Queued reports</h2><p>Deterministic order: high, medium, then low priority.</p><ReportTable reports={summary.queuedReports} /></div><div className="card"><h2>Escalated reports</h2><p>Zone 5 handles primary-zone overflow.</p><ReportTable reports={summary.escalatedReports} /></div></div></>; }
function Analytics() { const [summary, setSummary] = useState({ categoryDistribution: [], zoneDistribution: [], counts: {} }); useEffect(() => { api.get("/dashboard/summary").then((r) => setSummary(r.data)); }, []); return <><div className="stats">{Object.entries(summary.counts ?? {}).map(([name, value]) => <div className="stat" key={name}><small>{name.toUpperCase()}</small><strong>{value}</strong></div>)}</div><section className="charts"><div className="card chart"><h2>Category distribution</h2><ResponsiveContainer width="100%" height={260}><BarChart data={summary.categoryDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#6d5dfc" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="card chart"><h2>Zone distribution</h2><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={summary.zoneDistribution} dataKey="value" nameKey="name" outerRadius={90} label>{summary.zoneDistribution.map((entry, index) => <Cell key={entry.name} fill={["#6d5dfc", "#1db88a", "#f0a64f", "#e66d91", "#39a0db"][index % 5]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></section></>; }
createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
