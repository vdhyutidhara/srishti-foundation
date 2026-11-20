"use client";
import { useEffect, useState } from "react";
import { api, query, useResource, number, date } from "@/lib/client";
import type { Context } from "@/lib/types";
import {
  Icon,
  Status,
  Panel,
  LoadState,
  Empty,
  Dialog,
  BarList,
  Trend,
  Delivery,
  type BarRow,
  type TrendRow,
  type DeliveryRow,
} from "./ui";

interface Metric {
  id: string;
  label: string;
  value: number | null;
  hint: string;
}
interface DashProject {
  id: string;
  name: string;
  short?: string;
  color: string;
  description?: string;
  value: number;
  served: number;
  sessions: number;
  active: number;
}
interface ActionItem {
  id: string;
  personId: string;
  person: string;
  type: string;
  worker: string;
  due: string;
}
interface DashData {
  fetchedAt: string;
  metrics: Metric[];
  trend: TrendRow[];
  projects: DashProject[];
  actions: ActionItem[];
  delivery: DeliveryRow[];
  districts: BarRow[];
}

export function Overview(props: Context) {
  const { filters, revision, user, onDrill, onProject, onBeneficiary, onExport } =
    props;
  const resource = useResource<DashData>(
    "/api/dashboard?" + query(filters),
    revision,
  );
  if (!resource.data) return <LoadState resource={resource} />;
  const data = resource.data;
  return (
    <>
      <div className="overview-strip">
        <span>
          <i />
          Organization overview
        </span>
        <span>
          <Icon name="clock" size={14} />
          Fetched{" "}
          {new Date(data.fetchedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · read-only snapshot
        </span>
      </div>
      <div className="kpi-grid">
        {data.metrics.map((m, i) => (
          <button
            className={"kpi-card " + (i === 0 ? "featured" : "")}
            key={m.id}
            onClick={() => onDrill(m.id)}
            disabled={!user.details || m.value === null}
            title={
              m.hint +
              (!user.details
                ? " · Aggregate access; drill-down unavailable."
                : "")
            }
          >
            <div className="kpi-top">
              <span className="kpi-icon">
                <Icon
                  name={
                    ["people", "check", "leaf", "activity", "clock", "reports"][
                      i
                    ]
                  }
                  size={18}
                />
              </span>
              <Icon name="arrow" size={15} />
            </div>
            <strong className="kpi-number">{number(m.value)}</strong>
            <span className="kpi-label">{m.label}</span>
            <small>{i === 2 || i === 3 ? "Selected period" : "Current total"}</small>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Service delivery over time"
          subtitle="Completed sessions · last six months of context, independent of period filter"
          action={
            <span className="chart-key">
              <i />
              Completed sessions
            </span>
          }
        >
          <Trend rows={data.trend} />
          <div className="chart-foot">
            <Icon name="activity" size={15} />
            <span>
              Activities tell part of the story. Review individual progress for
              the full picture.
            </span>
          </div>
        </Panel>
        <Panel
          title="Reach across programs"
          subtitle="Registered beneficiaries · project counts may overlap"
          action={
            <button className="link-button" onClick={() => onProject("all")}>
              View all <Icon name="arrow" size={14} />
            </button>
          }
        >
          <BarList rows={data.projects} onClick={onProject} />
        </Panel>
      </div>
      <div className="dashboard-grid lower">
        <Panel
          title="A little attention makes a difference"
          subtitle="Open follow-ups overdue today"
          action={
            user.details && (
              <button
                className="link-button"
                onClick={() => onDrill("overdue")}
              >
                View all <Icon name="arrow" size={14} />
              </button>
            )
          }
        >
          {!user.details ? (
            <Empty
              title="Aggregate access"
              text="Beneficiary action lists require additional permission."
            />
          ) : data.actions.length ? (
            <div className="action-list">
              {data.actions.map((a) => (
                <button key={a.id} onClick={() => onBeneficiary(a.personId)}>
                  <span className="action-avatar">
                    <Icon
                      name={a.type === "Assessment review" ? "reports" : "clock"}
                      size={18}
                    />
                  </span>
                  <span className="action-person">
                    <strong>{a.person}</strong>
                    <small>
                      {a.type} · {a.worker}
                    </small>
                  </span>
                  <span className="action-due">
                    {date(a.due)}
                    <Status tone="amber">Overdue</Status>
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="No overdue follow-ups"
              text="No open follow-ups are overdue in this scope."
            />
          )}
        </Panel>
        <Panel
          title="Sessions this period"
          subtitle="Completed, missed and cancelled activity"
        >
          <Delivery rows={data.delivery} />
          <div className="panel-divider" />
          <div className="mini-heading">
            <strong>Where we&apos;re reaching people</strong>
            <Icon name="pin" size={17} />
          </div>
          <BarList rows={data.districts} />
        </Panel>
      </div>
      <div className="review-callout">
        <span className="review-icon">
          <Icon name="reports" size={25} />
        </span>
        <div>
          <h3>Your next review meeting, a little easier.</h3>
          <p>
            Take these filtered insights with you in a clear, ready-to-share
            report.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => onExport("overview")}
        >
          Prepare a report <Icon name="arrow" size={16} />
        </button>
      </div>
    </>
  );
}

export function Projects({ filters, revision, onProject, onDrill, onExport }: Context) {
  const resource = useResource<DashData>(
    "/api/dashboard?" + query(filters),
    revision,
  );
  if (!resource.data) return <LoadState resource={resource} />;
  return (
    <>
      <div className="section-label">
        {resource.data.projects.length} projects in your selected scope{" "}
        <span>Project figures can overlap</span>
      </div>
      <div className="project-grid">
        {resource.data.projects.map((p) => (
          <section className="project-card" key={p.id}>
            <div className="project-card-top">
              <span
                className="project-mark"
                style={{ background: p.color + "25", color: p.color }}
              >
                <Icon
                  name={
                    p.id === "farm"
                      ? "leaf"
                      : p.id === "school"
                        ? "reports"
                        : "people"
                  }
                  size={26}
                />
              </span>
              <Status>Programme</Status>
            </div>
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <div className="project-numbers">
              <div>
                <strong>{number(p.value)}</strong>
                <small>Registered</small>
              </div>
              <div>
                <strong>{number(p.served)}</strong>
                <small>Served this period</small>
              </div>
              <div>
                <strong>{number(p.sessions)}</strong>
                <small>Sessions completed</small>
              </div>
            </div>
            <div className="project-card-foot">
              <span>
                <i style={{ background: p.color }} />
                {number(p.active)} active beneficiaries
              </span>
              <button
                className="icon-button"
                aria-label={"Open " + p.name}
                onClick={() => onProject(p.id)}
              >
                <Icon name="arrow" />
              </button>
            </div>
            {filters.project === p.id && (
              <div className="project-detail-actions">
                <button
                  className="button secondary"
                  onClick={() => onDrill("total")}
                >
                  View beneficiaries
                </button>
                <button
                  className="button text"
                  onClick={() => onExport("overview")}
                >
                  Export project report
                </button>
              </div>
            )}
          </section>
        ))}
      </div>
      <div className="info-note">
        <Icon name="help" size={18} />
        <p>
          Targets and project-specific outcome indicators remain unavailable
          until their production fields and definitions are verified. We do not
          substitute estimated targets.
        </p>
      </div>
    </>
  );
}

interface BenRow {
  id: string;
  name: string;
  projects: string;
  district: string;
  worker: string;
  lastService: string;
  status: string;
  complete: boolean;
}
interface BenData {
  rows: BenRow[];
  total: number;
  page: number;
}

export function Beneficiaries({
  filters,
  revision,
  user,
  onBeneficiary,
  onExport,
  metric,
  setMetric,
  search,
  setSearch,
}: Context & {
  metric: string;
  setMetric: (m: string) => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  const [page, setPage] = useState(1),
    [input, setInput] = useState(search);
  useEffect(
    () => setPage(1),
    [JSON.stringify(filters), metric, search, user.role],
  );
  useEffect(() => setInput(search), [search]);
  const resource = useResource<BenData>(
    "/api/beneficiaries?" + query(filters, { metric, q: search, page }),
    revision,
  );
  if (!user.details)
    return (
      <Panel title="A view designed for your role">
        <Empty
          title="Your role has aggregate access"
          text="You can explore approved summaries in Reports & explore. Beneficiary records and name search require additional access."
        />
      </Panel>
    );
  return (
    <Panel
      title="Beneficiary register"
      subtitle="Read-only records · click a row to open a profile"
      action={
        <button
          className="link-button"
          onClick={() => onExport("beneficiaries")}
        >
          Export this list <Icon name="download" size={15} />
        </button>
      }
    >
      <div className="table-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(input.trim());
          }}
        >
          <Icon name="search" size={18} />
          <input
            aria-label="Search beneficiary ID or name"
            placeholder="Search by ID or name…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="button text" type="submit">
            Search
          </button>
        </form>
        <label className="compact-select">
          <span className="sr-only">Beneficiary list</span>
          <select
            aria-label="Beneficiary list"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="total">All registered</option>
            <option value="active">Active beneficiaries</option>
            <option value="new">New registrations</option>
            <option value="served">Receiving services</option>
            <option value="overdue">People overdue</option>
            <option value="incomplete">Records needing attention</option>
            <option value="noreview">Not seen in 6 months</option>
          </select>
        </label>
      </div>
      {!resource.data ? (
        <LoadState resource={resource} />
      ) : resource.data.rows.length ? (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Beneficiary</th>
                  <th>Program</th>
                  <th>District</th>
                  <th>Assigned worker</th>
                  <th>Last service</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button
                        className="person-link"
                        onClick={() => onBeneficiary(p.id)}
                      >
                        <span className="person-avatar">{p.id.slice(-2)}</span>
                        <span>
                          <strong>{p.name}</strong>
                          <small>{p.id}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <span className="program-tag">{p.projects}</span>
                    </td>
                    <td>{p.district}</td>
                    <td>{p.worker}</td>
                    <td>{date(p.lastService)}</td>
                    <td>
                      <Status tone={p.status === "Active" ? "green" : "gray"}>
                        {p.status}
                      </Status>
                      {!p.complete && (
                        <small className="incomplete-note">Incomplete</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              {(resource.data.page - 1) * 20 + 1}–
              {Math.min(resource.data.page * 20, resource.data.total)} of{" "}
              {number(resource.data.total)} beneficiaries
            </span>
            <div>
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                className="button secondary"
                disabled={page * 20 >= resource.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <Empty text="Try a different ID, project or period. Search applies when you select Search." />
      )}
    </Panel>
  );
}

const templates = [
  {
    id: "reach",
    name: "Reach & coverage",
    icon: "people",
    description: "Who are our programs reaching?",
  },
  {
    id: "services",
    name: "Service delivery",
    icon: "activity",
    description: "What support is being delivered?",
  },
  {
    id: "followups",
    name: "Follow-up review",
    icon: "clock",
    description: "Who needs our attention?",
  },
  {
    id: "quality",
    name: "Data completeness",
    icon: "reports",
    description: "Which records need a review?",
  },
  {
    id: "overview",
    name: "Management summary",
    icon: "projects",
    description: "A shared picture for your next meeting.",
  },
];

interface ReportData {
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
  asOf: string;
  generatedBy: string;
}

export function Reports({ filters, revision, onExport }: Context) {
  const [kind, setKind] = useState("reach"),
    [group, setGroup] = useState("project"),
    [metric, setMetric] = useState("total");
  const resource = useResource<ReportData>(
    "/api/report?" + query(filters, { report: kind, group, metric }),
    revision,
  );
  const groups =
    kind === "services"
      ? ["project", "month", "type"]
      : ["project", "district", "gender", "age"];
  return (
    <>
      <div className="report-steps">
        <span>
          <b>1</b>Choose a question
        </span>
        <Icon name="chevron" size={16} />
        <span>
          <b>2</b>Set your breakdown
        </span>
        <Icon name="chevron" size={16} />
        <span>
          <b>3</b>Preview &amp; export
        </span>
      </div>
      <div className="template-grid">
        {templates.map((t) => (
          <button
            className={"template-card " + (kind === t.id ? "chosen" : "")}
            key={t.id}
            onClick={() => {
              setKind(t.id);
              setGroup("project");
              setMetric("total");
            }}
          >
            <Icon name={t.icon} size={23} />
            <strong>{t.name}</strong>
            <small>{t.description}</small>
            {kind === t.id && (
              <span className="template-check">
                <Icon name="check" size={12} />
              </span>
            )}
          </button>
        ))}
      </div>
      <Panel
        title={templates.find((t) => t.id === kind)!.name}
        subtitle="Choose an approved breakdown. Your global filters apply to every result."
        action={
          <button
            className="button primary"
            onClick={() => onExport(kind as never, group, undefined, metric)}
          >
            <Icon name="download" size={16} />
            Preview export
          </button>
        }
      >
        <div className="explore-controls">
          {kind !== "overview" && (
            <label>
              <span>Break down by</span>
              <select
                aria-label="Break down by"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g === "age"
                      ? "Age group"
                      : g === "type"
                        ? "Service type"
                        : g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === "reach" && (
            <label>
              <span>Measure</span>
              <select
                aria-label="Measure"
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
              >
                <option value="total">Registered beneficiaries</option>
                <option value="active">Active beneficiaries</option>
                <option value="served">People receiving services</option>
                <option value="new">New registrations</option>
              </select>
            </label>
          )}
          <div className="explore-scope">
            <Icon name="shield" size={16} />
            <span>Approved metrics · your permitted scope</span>
          </div>
        </div>
        {!resource.data ? (
          <LoadState resource={resource} />
        ) : !resource.data.rows.length ? (
          <Empty />
        ) : (
          <div
            className={"report-result " + (kind === "overview" ? "summary" : "")}
          >
            {kind !== "overview" && (
              <div className="report-chart">
                <BarList
                  rows={resource.data.rows.map((r) => ({
                    label: r[0] as string,
                    value: r[1] as number,
                  }))}
                />
              </div>
            )}
            <div className="table-scroll">
              <ReportTable value={resource.data} />
            </div>
          </div>
        )}
        <div className="info-note">
          <Icon name="help" size={16} />
          <p>
            {kind === "services"
              ? "Counts use completed service sessions, not unique people. Dates use the selected reporting period."
              : "Each group counts distinct beneficiaries. A person can belong to multiple programs; project counts must not be added to calculate organizational reach."}
          </p>
        </div>
      </Panel>
    </>
  );
}

function ReportTable({ value, limit }: { value: ReportData; limit?: number }) {
  return (
    <table className="data-table report-table">
      <thead>
        <tr>
          {value.headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {value.rows.slice(0, limit || value.rows.length).map((row, i) => (
          <tr key={i}>
            {row.map((v, j) => (
              <td key={j}>
                {v === null ? (
                  <Status tone="gray">Suppressed</Status>
                ) : typeof v === "number" ? (
                  number(v)
                ) : (
                  v
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface Goal {
  name: string;
  total: number;
  completed: number;
}
interface Assessment {
  date: string;
  score: number;
  total: number;
  label: string;
}
interface Followup {
  id: string;
  type: string;
  due: string;
  status: string;
}
interface Service {
  id: string;
  date: string;
  type: string;
  status: string;
}
interface Profile {
  id: string;
  name: string;
  status: string;
  projects: { short: string }[];
  age: number;
  gender: string;
  district: string;
  worker: string;
  registeredAt: string;
  nextReview: string;
  complete: boolean;
  caregiver?: { mother: string; father: string; guardian: string; phone: string };
  goals: Goal[];
  assessments: Assessment[];
  followups: Followup[];
  services: Service[];
}

export function ProfileDialog({
  id,
  filters,
  revision,
  onClose,
  onExport,
}: Context & { id: string; onClose: () => void }) {
  const resource = useResource<Profile>(
    "/api/beneficiaries/" + id + "?" + query(filters),
    revision,
  );
  return (
    <Dialog title="Beneficiary profile" onClose={onClose} wide>
      {!resource.data ? (
        <LoadState resource={resource} />
      ) : (
        <>
          <div className="profile-header">
            <span className="profile-avatar">
              <Icon name="people" size={30} />
            </span>
            <div>
              <Status tone="amber">Read-only record</Status>
              <h3>{resource.data.name}</h3>
              <p>
                {resource.data.id} ·{" "}
                {resource.data.projects.map((p) => p.short).join(" / ")}
              </p>
            </div>
            <Status tone={resource.data.status === "Active" ? "green" : "gray"}>
              {resource.data.status}
            </Status>
          </div>
          <div className="profile-facts">
            {(
              [
                ["Age", resource.data.age + " years"],
                ["Gender", resource.data.gender],
                ["District", resource.data.district],
                ["Assigned worker", resource.data.worker],
                ["Registered", date(resource.data.registeredAt)],
                ["Review due", date(resource.data.nextReview)],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {resource.data.caregiver &&
            (resource.data.caregiver.mother ||
              resource.data.caregiver.father ||
              resource.data.caregiver.guardian ||
              resource.data.caregiver.phone) && (
              <div className="profile-section">
                <h3>Family / caregiver</h3>
                <div className="profile-facts">
                  {(
                    [
                      ["Mother", resource.data.caregiver.mother],
                      ["Father", resource.data.caregiver.father],
                      ["Guardian", resource.data.caregiver.guardian],
                      ["Contact", resource.data.caregiver.phone],
                    ] as [string, string][]
                  )
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label}>
                        <small>{label}</small>
                        <strong>{value}</strong>
                      </div>
                    ))}
                </div>
              </div>
            )}
          {!resource.data.complete && (
            <div className="info-note warning">
              <Icon name="alert" size={18} />
              <p>
                This registration is marked incomplete. Corrections must be made
                through the existing source application.
              </p>
            </div>
          )}
          <div className="profile-section">
            <h3>Individual goals</h3>
            <div className="goal-grid">
              {resource.data.goals.map((g) => (
                <div key={g.name}>
                  <strong>{g.name}</strong>
                  <span>
                    {g.completed} of {g.total} milestones
                  </span>
                  <progress max={g.total} value={g.completed} aria-label={g.name} />
                </div>
              ))}
            </div>
          </div>
          <div className="profile-section">
            <h3>Assessment history</h3>
            <p className="muted">
              Assessment scores drawn from the reporting database.
            </p>
            <div className="assessment-grid">
              {resource.data.assessments.map((a) => (
                <div key={a.date}>
                  <small>{date(a.date)}</small>
                  <strong>
                    {a.score}
                    <span> / {a.total}</span>
                  </strong>
                  <p>{a.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="profile-section">
            <h3>Follow-ups</h3>
            {resource.data.followups.length ? (
              <div className="followup-list">
                {resource.data.followups.map((f) => (
                  <div key={f.id}>
                    <Icon name="clock" size={18} />
                    <span>
                      <strong>{f.type}</strong>
                      <small>Due {date(f.due)}</small>
                    </span>
                    <Status
                      tone={
                        f.status === "Open" && f.due < todayISO()
                          ? "amber"
                          : "green"
                      }
                    >
                      {f.status === "Open" && f.due < todayISO()
                        ? "Overdue"
                        : f.status}
                    </Status>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No follow-ups recorded.</p>
            )}
          </div>
          <div className="profile-section">
            <h3>Service history</h3>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.services.slice(0, 12).map((s) => (
                    <tr key={s.id}>
                      <td>{date(s.date)}</td>
                      <td>{s.type}</td>
                      <td>
                        <Status
                          tone={s.status === "Completed" ? "green" : "gray"}
                        >
                          {s.status}
                        </Status>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <small className="muted">
              Latest {Math.min(12, resource.data.services.length)} of{" "}
              {resource.data.services.length} recorded services.
            </small>
          </div>
          <div className="dialog-footer">
            <span>
              <Icon name="shield" size={16} />
              Read-only profile · no source editing
            </span>
            <button
              className="button primary"
              onClick={() => onExport("profile", "project", id)}
            >
              <Icon name="download" size={16} />
              Export profile summary
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ExportDialog({
  filters,
  revision,
  report: kind,
  group,
  id,
  metric = "total",
  search = "",
  onClose,
}: Context & {
  report: string;
  group?: string;
  id?: string;
  metric?: string;
  search?: string;
  onClose: () => void;
}) {
  const params = query(filters, { report: kind, group, id, metric, q: search });
  const resource = useResource<ReportData>("/api/report?" + params, revision);
  const [downloading, setDownloading] = useState(""),
    [error, setError] = useState("");
  async function download(format: string) {
    setDownloading(format);
    setError("");
    try {
      const res = await fetch("/api/export?" + params + "&format=" + format);
      if (!res.ok) {
        const x = await res.json();
        throw new Error(x.message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sristi-" + kind + "-report." + format;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading("");
    }
  }
  return (
    <Dialog title="Preview your report" onClose={onClose} wide>
      {!resource.data ? (
        <LoadState resource={resource} />
      ) : (
        <>
          <div className="export-intro">
            <div>
              <Status tone="amber">Internal use</Status>
              <h3>{resource.data.title}</h3>
              <p>
                {date(filters.start)} to{" "}
                {date(
                  new Date(Date.parse(filters.end) - 86400000)
                    .toISOString()
                    .slice(0, 10),
                )}{" "}
                · {number(resource.data.rows.length)} report rows
              </p>
            </div>
            <Icon name="reports" size={38} />
          </div>
          <div className="export-context">
            <span>
              <strong>Project</strong>
              {filters.project === "all"
                ? "All permitted projects"
                : filters.project.toUpperCase()}
            </span>
            <span>
              <strong>District</strong>
              {filters.district === "all" ? "All districts" : filters.district}
            </span>
            <span>
              <strong>Snapshot</strong>
              {date(resource.data.asOf)}
            </span>
            <span>
              <strong>Generated by</strong>
              {resource.data.generatedBy}
            </span>
          </div>
          <div className="table-scroll preview-table">
            {resource.data.rows.length ? (
              <ReportTable value={resource.data} limit={10} />
            ) : (
              <Empty />
            )}
          </div>
          <p className="preview-note">
            Preview shows up to 10 rows. Your download includes all{" "}
            {number(resource.data.rows.length)} permitted rows, applied filters
            and report metadata.
          </p>
          {kind === "beneficiaries" || kind === "profile" ? (
            <div className="info-note warning">
              <Icon name="shield" size={17} />
              <p>
                This is a detailed record export. Personal information requires
                explicit authorization and secure handling.
              </p>
            </div>
          ) : null}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-footer">
            <button className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <div>
              <button
                className="button secondary"
                onClick={() => download("pdf")}
                disabled={!!downloading}
              >
                <Icon name="download" size={16} />
                {downloading === "pdf" ? "Preparing PDF…" : "Download PDF"}
              </button>
              <button
                className="button primary"
                onClick={() => download("xlsx")}
                disabled={!!downloading}
              >
                <Icon name="download" size={16} />
                {downloading === "xlsx" ? "Preparing Excel…" : "Download Excel"}
              </button>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}

interface ConnData {
  configured: boolean;
}
interface SchemaObject {
  schemaName: string;
  objectName: string;
  objectType: string;
}
interface SchemaColumn {
  schemaName: string;
  objectName: string;
  columnName: string;
}
interface SchemaResult {
  status: string;
  message: string;
  objects?: SchemaObject[];
  columns?: SchemaColumn[];
}

const accessMatrix = [
  [
    "Director / senior management",
    "All-project summary + approved drill-down",
    "As authorized; sensitive fields restricted",
    "Summary + detailed",
    "No",
  ],
  [
    "Project head",
    "Assigned project(s)",
    "Read/update within project",
    "Project-level",
    "No",
  ],
  [
    "Coordinator / supervisor",
    "Assigned team & caseload",
    "Operational detail for supervision",
    "Limited",
    "No",
  ],
  ["Teacher / field worker", "Own caseload only", "Assigned students only", "Own caseload only", "No"],
  ["Parent / learner", "Own record only", "Own record only", "Own summary only", "No"],
  ["Reporting officer", "Approved indicators", "Minimum necessary", "Aggregate + row-level", "No"],
  [
    "System administrator",
    "System health & config",
    "No routine content access",
    "As separately approved",
    "Yes, with audit trail",
  ],
];

export function Admin({ revision }: Context) {
  const resource = useResource<ConnData>("/api/connection", revision);
  const [result, setResult] = useState<SchemaResult | null>(null),
    [checking, setChecking] = useState(false),
    [error, setError] = useState("");
  async function inspect() {
    setChecking(true);
    setError("");
    try {
      setResult(await api<SchemaResult>("/api/schema"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  return (
    <>
      <section className="connection-hero">
        <div className="connection-art">
          <Icon name="shield" size={54} />
        </div>
        <div>
          <Status tone="amber">Administration</Status>
          <h2>System health &amp; access, not personal records.</h2>
          <p>
            Administrators keep the platform and its access rules in good order.
            Routine beneficiary content stays out of this view by design.
          </p>
        </div>
        <span className="connection-lock">
          <Icon name="shield" size={20} />
          Audited actions
        </span>
      </section>
      <div className="connection-grid">
        <Panel title="System status" subtitle="Reporting environment">
          <div className="connection-details">
            <div>
              <span>Database</span>
              <strong>sristi_foundation_tamilnadu</strong>
            </div>
            <div>
              <span>Connection settings</span>
              <Status tone={resource.data?.configured ? "green" : "gray"}>
                {resource.data?.configured ? "Configured" : "Not configured"}
              </Status>
            </div>
            <div>
              <span>Reporting source</span>
              <Status tone="green">Live reporting database</Status>
            </div>
            <div>
              <span>Data modifications</span>
              <Status>Disabled</Status>
            </div>
          </div>
          {!resource.data && <LoadState resource={resource} />}
          <p className="muted connection-copy">
            A catalog inspection reads table, column and relationship metadata
            only. It retrieves no personal records and changes nothing.
          </p>
          <button className="button primary" onClick={inspect} disabled={checking}>
            <Icon name="refresh" size={16} />
            {checking ? "Checking connection…" : "Check read-only connection"}
          </button>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          {result && (
            <div
              className={
                "connection-result " +
                (result.status === "discovered" ? "success" : "")
              }
              role="status"
            >
              <Icon
                name={result.status === "discovered" ? "check" : "alert"}
                size={20}
              />
              <div>
                <strong>
                  {result.status === "discovered"
                    ? "Catalog inspection complete"
                    : "Live connection unavailable"}
                </strong>
                <p>{result.message}</p>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Audit & governance" subtitle="What the platform records">
          <ul className="admin-governance">
            {(
              [
                ["Record views", "Each profile open is logged with a hashed subject."],
                ["Exports", "Excel and PDF downloads are recorded by role."],
                ["Role switches", "Changing persona replaces the session."],
                ["Sessions", "Opaque HttpOnly cookies · 30-minute timeout."],
              ] as [string, string][]
            ).map(([t, d]) => (
              <li key={t}>
                <Icon name="check" size={16} />
                <span>
                  <strong>{t}</strong>
                  <small>{d}</small>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Access & roles" subtitle="Who can see and do what · proposed matrix">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Dashboard</th>
                <th>Beneficiary detail</th>
                <th>Export</th>
                <th>Manage users</th>
              </tr>
            </thead>
            <tbody>
              {accessMatrix.map((r) => (
                <tr key={r[0]}>
                  <td>
                    <strong>{r[0]}</strong>
                  </td>
                  {r.slice(1).map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

export function Connection({ revision, user }: Context) {
  const resource = useResource<ConnData>("/api/connection", revision);
  const [result, setResult] = useState<SchemaResult | null>(null),
    [checking, setChecking] = useState(false),
    [error, setError] = useState("");
  async function inspect() {
    setChecking(true);
    setError("");
    try {
      setResult(await api<SchemaResult>("/api/schema"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  return (
    <>
      <section className="connection-hero">
        <div className="connection-art">
          <Icon name="connection" size={54} />
        </div>
        <div>
          <Status tone="green">Reporting environment</Status>
          <h2>Know the source. Trust the picture.</h2>
          <p>
            The application reports read-only from the production database.
            Figures are drawn live; no write operations are possible from this
            workspace.
          </p>
        </div>
        <span className="connection-lock">
          <Icon name="shield" size={20} />
          No production writes
        </span>
      </section>
      <div className="connection-grid">
        <Panel title="Production connection" subtitle="Server-side access only · SQL Server">
          <div className="connection-details">
            <div>
              <span>Database</span>
              <strong>sristi_foundation_tamilnadu</strong>
            </div>
            <div>
              <span>Connection settings</span>
              <Status tone={resource.data?.configured ? "green" : "gray"}>
                {resource.data?.configured ? "Configured on server" : "Not configured"}
              </Status>
            </div>
            <div>
              <span>Reporting source</span>
              <Status tone="green">Live reporting database</Status>
            </div>
            <div>
              <span>Mobile sync status</span>
              <strong>Unknown</strong>
            </div>
            <div>
              <span>Data modifications</span>
              <Status>Disabled</Status>
            </div>
          </div>
          {!resource.data && <LoadState resource={resource} />}
          <p className="muted connection-copy">
            Connection credentials stay on the server. A catalog inspection
            reads table, column and relationship metadata only; it does not
            retrieve personal records or change the database.
          </p>
          <button
            className="button primary"
            onClick={inspect}
            disabled={checking || user.role !== "director"}
          >
            <Icon name="refresh" size={16} />
            {checking ? "Checking connection…" : "Check read-only connection"}
          </button>
          {user.role !== "director" && (
            <p className="muted">
              Connection inspection is limited to the director role.
            </p>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          {result && (
            <div
              className={
                "connection-result " +
                (result.status === "discovered" ? "success" : "")
              }
              role="status"
            >
              <Icon
                name={result.status === "discovered" ? "check" : "alert"}
                size={20}
              />
              <div>
                <strong>
                  {result.status === "discovered"
                    ? "Catalog inspection complete"
                    : "Live connection unavailable"}
                </strong>
                <p>{result.message}</p>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Path to verified reporting" subtitle="Verify the source before presenting numbers">
          <ol className="connection-steps">
            {(
              [
                ["Connection", "Reach the production server with encrypted, read-only access."],
                ["Schema discovery", "Inspect existing objects, keys and relationships."],
                [
                  "Verified field mapping",
                  "Confirm beneficiary IDs, services, statuses and reporting dates.",
                ],
                [
                  "Access and reconciliation",
                  "Approve user permissions and compare totals against source reads.",
                ],
              ] as [string, string][]
            ).map(([title, desc], i) => (
              <li key={title}>
                <span>{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                  <small>
                    {i === 0 && resource.data?.configured
                      ? "Configured · connectivity verified at request time"
                      : i === 1 && result?.status === "discovered"
                        ? "Catalog read · mapping still pending"
                        : "Pending verification"}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      {result?.objects && (
        <Panel
          title="Discovered catalog"
          subtitle={
            result.objects.length +
            " objects · " +
            (result.columns?.length ?? 0) +
            " columns · metadata visibility depends on source permissions"
          }
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Schema</th>
                  <th>Object</th>
                  <th>Type</th>
                  <th>Columns</th>
                </tr>
              </thead>
              <tbody>
                {result.objects.map((o) => (
                  <tr key={o.schemaName + "." + o.objectName}>
                    <td>{o.schemaName}</td>
                    <td>{o.objectName}</td>
                    <td>{o.objectType}</td>
                    <td>
                      {(result.columns ?? [])
                        .filter(
                          (c) =>
                            c.schemaName === o.schemaName &&
                            c.objectName === o.objectName,
                        )
                        .map((c) => c.columnName)
                        .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}

interface WorkerRow {
  worker: string;
  caseload: number;
  visitsDone: number;
  pending: number;
  overdue: number;
  lastActivity: string;
}

export function Workers({ filters, revision }: Context) {
  const resource = useResource<{ workers: WorkerRow[] }>(
    "/api/workers?" + query(filters),
    revision,
  );
  if (!resource.data) return <LoadState resource={resource} />;
  const rows = resource.data.workers;
  return (
    <>
      <Panel
        title="Worker activity"
        subtitle="Caseload and visit activity for the selected period"
      >
        {rows.length ? (
          <>
            <div className="report-chart">
              <BarList
                rows={rows
                  .slice(0, 8)
                  .map((r) => ({ label: r.worker, value: r.caseload }))}
              />
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Caseload</th>
                    <th>Visits done</th>
                    <th>Pending</th>
                    <th>Overdue</th>
                    <th>Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.worker}>
                      <td>
                        <strong>{r.worker}</strong>
                      </td>
                      <td>{number(r.caseload)}</td>
                      <td>{number(r.visitsDone)}</td>
                      <td>{number(r.pending)}</td>
                      <td>
                        {r.overdue > 0 ? (
                          <Status tone="amber">{number(r.overdue)}</Status>
                        ) : (
                          number(r.overdue)
                        )}
                      </td>
                      <td>{date(r.lastActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Empty
            title="No worker activity"
            text="No sessions fall in the selected period and scope."
          />
        )}
      </Panel>
      <div className="info-note">
        <Icon name="help" size={18} />
        <p>
          Caseload counts distinct beneficiaries with a session in the period.
          GPS and attendance-level field tracking are shown only where the
          source platform records them.
        </p>
      </div>
    </>
  );
}

interface AlertItem {
  id: string;
  personId: string;
  person: string;
  worker?: string;
  detail?: string;
  due: string;
  days?: number;
}
interface AlertsData {
  counts: {
    overdue: number;
    assessmentsDue: number;
    incomplete: number;
    expired: number;
    noReview: number;
  };
  details: boolean;
  overdue: AlertItem[];
  assessmentsDue: AlertItem[];
  incomplete: AlertItem[];
  expired: AlertItem[];
  noReview: AlertItem[];
}

function AlertSection({
  title,
  subtitle,
  items,
  details,
  icon,
  onBeneficiary,
}: {
  title: string;
  subtitle: string;
  items: AlertItem[];
  details: boolean;
  icon: string;
  onBeneficiary: (id: string) => void;
}) {
  return (
    <Panel title={title} subtitle={subtitle}>
      {!details ? (
        <Empty
          title="Aggregate access"
          text="The count is shown above. Individual records require additional permission."
        />
      ) : items.length ? (
        <div className="action-list">
          {items.map((a) => (
            <button key={a.id} onClick={() => onBeneficiary(a.personId)}>
              <span className="action-avatar">
                <Icon name={icon} size={18} />
              </span>
              <span className="action-person">
                <strong>{a.person}</strong>
                <small>
                  {[a.detail, a.worker].filter(Boolean).join(" · ") || "—"}
                </small>
              </span>
              <span className="action-due">
                {a.due ? date(a.due) : "—"}
                {a.days !== undefined && a.days > 0 && (
                  <Status tone="amber">{a.days}d</Status>
                )}
              </span>
              <Icon name="chevron" size={16} />
            </button>
          ))}
        </div>
      ) : (
        <Empty title="Nothing here" text="No items match the current filters." />
      )}
    </Panel>
  );
}

export function Alerts({ filters, revision, onBeneficiary }: Context) {
  const resource = useResource<AlertsData>(
    "/api/alerts?" + query(filters),
    revision,
  );
  if (!resource.data) return <LoadState resource={resource} />;
  const d = resource.data;
  const tiles = [
    { label: "Follow-ups overdue", value: d.counts.overdue },
    { label: "Assessments due", value: d.counts.assessmentsDue },
    { label: "Records incomplete", value: d.counts.incomplete },
    { label: "Treatments expired", value: d.counts.expired },
    { label: "Not seen in 6 months", value: d.counts.noReview },
  ];
  return (
    <>
      <div className="kpi-grid">
        {tiles.map((t) => (
          <div className="kpi-card" key={t.label}>
            <div className="kpi-top">
              <span className="kpi-icon">
                <Icon name="alert" size={18} />
              </span>
            </div>
            <strong className="kpi-number">{number(t.value)}</strong>
            <span className="kpi-label">{t.label}</span>
          </div>
        ))}
      </div>
      <div className="dashboard-grid lower">
        <AlertSection
          title="Overdue follow-ups"
          subtitle="Open follow-ups past their due date"
          items={d.overdue}
          details={d.details}
          icon="clock"
          onBeneficiary={onBeneficiary}
        />
        <AlertSection
          title="Assessments due"
          subtitle="Evaluations assigned over 30 days ago and not completed"
          items={d.assessmentsDue}
          details={d.details}
          icon="reports"
          onBeneficiary={onBeneficiary}
        />
      </div>
      <div className="dashboard-grid lower">
        <AlertSection
          title="Records needing attention"
          subtitle="Active records missing mandatory fields"
          items={d.incomplete}
          details={d.details}
          icon="alert"
          onBeneficiary={onBeneficiary}
        />
        <AlertSection
          title="Expired treatment plans"
          subtitle="Active plans past their end date"
          items={d.expired}
          details={d.details}
          icon="clock"
          onBeneficiary={onBeneficiary}
        />
      </div>
      <AlertSection
        title="Not seen recently"
        subtitle="Active beneficiaries with no completed session in six months"
        items={d.noReview}
        details={d.details}
        icon="people"
        onBeneficiary={onBeneficiary}
      />
    </>
  );
}
