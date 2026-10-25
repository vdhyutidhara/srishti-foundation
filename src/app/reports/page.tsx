"use client";
import { useState } from "react";

const REPORTS = [
  {
    type: "beneficiaries", title: "Beneficiary Register", icon: "👥",
    desc: "All registered beneficiaries with demographic details, program, status, and assigned worker.",
    freq: "Monthly", audience: "Program Managers", params: [],
  },
  {
    type: "sessions", title: "Service Sessions", icon: "🗓",
    desc: "All task/session records — date, activity, status, worker, check-in/out times.",
    freq: "Weekly", audience: "Field Supervisors", params: ["year"],
  },
  {
    type: "treatments", title: "Treatment Goals", icon: "🎯",
    desc: "All treatment plans with goals, targets, achievement, therapist, and cycle.",
    freq: "Quarterly", audience: "Clinical Team", params: [],
  },
  {
    type: "assessments", title: "Assessment Records", icon: "📊",
    desc: "All evaluation records with assigned date, evaluation date, score, and status.",
    freq: "Quarterly", audience: "Clinical Team", params: [],
  },
  {
    type: "alerts", title: "Overdue Follow-ups", icon: "🔔",
    desc: "All pending tasks past due date — beneficiary, activity, worker, days overdue.",
    freq: "Weekly", audience: "Supervisors", params: [],
  },
  {
    type: "project-performance", title: "Project Performance", icon: "📈",
    desc: "Enrollment, sessions completed, goal achievement rate per project for the period.",
    freq: "Monthly", audience: "Management", params: ["year"],
  },
  {
    type: "data-quality", title: "Data Quality Report", icon: "✅",
    desc: "Missing fields, duplicate records, outdated contacts, and inconsistent date entries.",
    freq: "Monthly", audience: "Data Team", params: [],
  },
  {
    type: "quarterly-outcomes", title: "Quarterly Outcomes", icon: "📋",
    desc: "Goal progress by domain, milestone achievement rates, assessment completion rates.",
    freq: "Quarterly", audience: "Donors / Board", params: ["year"],
  },
];

const SECTIONS = [
  { id: "beneficiaries", label: "Beneficiary List" },
  { id: "sessions", label: "Session Summary" },
  { id: "treatments", label: "Treatment Goals" },
  { id: "assessments", label: "Assessments" },
  { id: "alerts", label: "Overdue Items" },
];

const PROGRAMS = ["", "MTP", "EIC", "Sristi Village", "Special School", "Jeevan Vikas", "Fellowship"];
const YEARS = ["2025", "2024", "2023", "2022"];

export default function ReportsPage() {
  const [year, setYear] = useState("2025");
  const [program, setProgram] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>(["beneficiaries", "sessions"]);
  const [customFrom, setCustomFrom] = useState("2025-01-01");
  const [customTo, setCustomTo] = useState("2025-12-31");

  function download(type: string) {
    setDownloading(type);
    const params = new URLSearchParams({ type, year });
    if (program) params.set("program", program);
    const a = document.createElement("a");
    a.href = `/api/reports?${params}`;
    a.click();
    setTimeout(() => setDownloading(null), 1500);
  }

  function toggleSection(id: string) {
    setSelectedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  function generateCustom(format: "pdf" | "excel") {
    if (!selectedSections.length) { alert("Select at least one section"); return; }
    alert(`Custom ${format.toUpperCase()} report generation coming soon.\nSections: ${selectedSections.join(", ")}\nPeriod: ${customFrom} → ${customTo}`);
  }

  return (
    <>
      <div className="fbar" style={{ borderTop: "none" }}>
        <span className="flabel">Year:</span>
        {YEARS.map(y => <div key={y} className={`chip${year===y?" on":""}`} onClick={() => setYear(y)}>{y}</div>)}
        <div className="fsep" />
        <span className="flabel">Program:</span>
        <select className="tsel" value={program} onChange={e => setProgram(e.target.value)}>
          {PROGRAMS.map(p => <option key={p} value={p}>{p || "All Programs"}</option>)}
        </select>
      </div>

      <div className="content">
        <div className="notebar">
          Reports export as CSV. Open in Excel or Google Sheets. Data reflects the live database at export time.
        </div>

        {/* Standard report cards */}
        <div className="card-title" style={{ padding: "0 0 8px" }}>Standard Reports</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
          {REPORTS.map((r) => (
            <div key={r.type} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{r.icon}</span>
                <div>
                  <div className="card-title">{r.title}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", display: "flex", gap: 6, marginTop: 2 }}>
                    <span className="badge badge-b">{r.freq}</span>
                    <span style={{ color: "var(--muted)" }}>{r.audience}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--ink2)", lineHeight: 1.5, flex: 1 }}>{r.desc}</div>
              {r.params.includes("year") && (
                <div style={{ fontSize: 10, color: "var(--muted)" }}>Year: {year}{program ? ` · ${program}` : ""}</div>
              )}
              <button
                className="btn btn-p"
                style={{ alignSelf: "flex-start", marginTop: 2 }}
                onClick={() => download(r.type)}
                disabled={downloading === r.type}
              >
                {downloading === r.type ? "⏳ Downloading…" : "⬇ Download CSV"}
              </button>
            </div>
          ))}
        </div>

        {/* Custom Report Builder */}
        <div className="card-title" style={{ padding: "0 0 8px" }}>Custom Report Builder</div>
        <div className="card">
          <div className="card-sub" style={{ marginBottom: 14 }}>Select sections and date range, then export as PDF or Excel.</div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>Sections to include</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SECTIONS.map(s => (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(s.id)}
                      onChange={() => toggleSection(s.id)}
                      style={{ accentColor: "var(--accent)", width: 14, height: 14 }}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>Date range</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>From</div>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    style={{ fontSize: 12, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--s1)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 3 }}>To</div>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    style={{ fontSize: 12, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--s1)" }} />
                </div>
              </div>
            </div>
            <div style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-p" onClick={() => generateCustom("pdf")}>Generate PDF</button>
              <button className="btn btn-g" onClick={() => generateCustom("excel")}>Generate Excel</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
