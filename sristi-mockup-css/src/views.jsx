import { useEffect, useState } from "react";
import { api, query, useResource, number, date } from "./api.js";
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
} from "./ui.jsx";

export function Overview(props) {
  const {
    filters,
    revision,
    user,
    onDrill,
    onProject,
    onBeneficiary,
    onExport,
  } = props;
  const resource = useResource("/api/dashboard?" + query(filters), revision);
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
          · fictional snapshot
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
            <small>
              {i === 2 || i === 3 ? "Selected period" : "As of 30 Oct 2026"}
            </small>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Service delivery over time"
          subtitle="Completed sessions · May–Oct 2026 context, independent of period filter"
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
          subtitle="Open follow-ups overdue at the demo snapshot"
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
                      name={
                        a.type === "Assessment review" ? "reports" : "clock"
                      }
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
            <strong>Where we're reaching people</strong>
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
export function Projects({ filters, revision, onProject, onDrill, onExport }) {
  const resource = useResource("/api/dashboard?" + query(filters), revision);
  if (!resource.data) return <LoadState resource={resource} />;
  return (
    <>
      <div className="section-label">
        {resource.data.projects.length} programs in your selected scope{" "}
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
              <Status>Demo program</Status>
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
}) {
  const [page, setPage] = useState(1),
    [input, setInput] = useState(search);
  useEffect(
    () => setPage(1),
    [JSON.stringify(filters), metric, search, user.role],
  );
  useEffect(() => setInput(search), [search]);
  const resource = useResource(
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
      subtitle="Fictional records · click a row to open a read-only profile"
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
            aria-label="Search beneficiary ID or demo name"
            placeholder="Search by ID or demo name…"
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
export function Reports({ filters, revision, onExport }) {
  const [kind, setKind] = useState("reach"),
    [group, setGroup] = useState("project"),
    [metric, setMetric] = useState("total");
  const resource = useResource(
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
          <b>3</b>Preview & export
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
        title={templates.find((t) => t.id === kind).name}
        subtitle="Choose an approved breakdown. Your global filters apply to every result."
        action={
          <button
            className="button primary"
            onClick={() => onExport(kind, group, undefined, metric)}
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
            className={
              "report-result " + (kind === "overview" ? "summary" : "")
            }
          >
            {kind !== "overview" && (
              <div className="report-chart">
                <BarList
                  rows={resource.data.rows.map((r) => ({
                    label: r[0],
                    value: r[1],
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
function ReportTable({ value, limit }) {
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
export function ProfileDialog({ id, filters, revision, onClose, onExport }) {
  const resource = useResource(
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
              <Status tone="amber">Fictional demo record</Status>
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
            {[
              ["Age", resource.data.age + " years"],
              ["Gender", resource.data.gender],
              ["District", resource.data.district],
              ["Assigned worker", resource.data.worker],
              ["Registered", date(resource.data.registeredAt)],
              ["Review due", date(resource.data.nextReview)],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {!resource.data.complete && (
            <div className="info-note warning">
              <Icon name="alert" size={18} />
              <p>
                This demo registration is marked incomplete. Corrections must be
                made through the existing source application.
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
                  <progress
                    max={g.total}
                    value={g.completed}
                    aria-label={g.name}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="profile-section">
            <h3>Assessment history</h3>
            <p className="muted">
              Synthetic checklist results for demonstration. This is not a
              verified clinical instrument.
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
                        f.status === "Open" && f.due < "2026-10-30"
                          ? "amber"
                          : "green"
                      }
                    >
                      {f.status === "Open" && f.due < "2026-10-30"
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
export function ExportDialog({
  filters,
  revision,
  report: kind,
  group,
  id,
  metric = "total",
  search = "",
  onClose,
}) {
  const params = query(filters, { report: kind, group, id, metric, q: search });
  const resource = useResource("/api/report?" + params, revision);
  const [downloading, setDownloading] = useState(""),
    [error, setError] = useState("");
  async function download(format) {
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
      a.download = "sristi-" + kind + "-demo." + format;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
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
              <Status tone="amber">Demo data · internal use</Status>
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
            and report metadata. Every file is labelled as demo data.
          </p>
          {kind === "beneficiaries" || kind === "profile" ? (
            <div className="info-note warning">
              <Icon name="shield" size={17} />
              <p>
                This is a detailed record export. In live use, personal
                information requires explicit authorization and secure handling.
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
function familyStatus(f) {
  return f.status === "Open" && f.due < "2026-10-30" ? "Overdue" : f.status;
}
export function MyProgress({ user, revision, filters, onExport }) {
  const resource = useResource("/api/me?" + query(filters), revision);
  if (!resource.data) return <LoadState resource={resource} />;
  const p = resource.data.profile;
  const self = user.role === "student";
  const possessive = self ? "your" : p.name.split(" ").slice(-1)[0] + "'s";
  const upcoming = p.followups
    .filter((f) => f.status === "Open")
    .sort((a, b) => a.due.localeCompare(b.due));
  const totalMilestones = p.goals.reduce((n, g) => n + g.total, 0);
  const doneMilestones = p.goals.reduce((n, g) => n + g.completed, 0);
  const latest = p.assessments[p.assessments.length - 1];
  const baseline = p.assessments[0];
  return (
    <>
      <section className="family-hero">
        <span className="family-hero-art">
          <Icon name="heart" size={30} />
        </span>
        <div>
          <Status tone="amber">Fictional demo record</Status>
          <h2>{self ? "Your progress" : p.name}</h2>
          <p>
            {p.id} · {p.projects.map((x) => x.short).join(" / ")} · {p.district}
          </p>
        </div>
        <div className="family-hero-stat">
          <strong>
            {doneMilestones}
            <span>/{totalMilestones}</span>
          </strong>
          <small>milestones reached</small>
        </div>
      </section>
      <div className="dashboard-grid lower">
        <Panel
          title={self ? "Your goals" : "Goals we're working on together"}
          subtitle="Small steps, tracked over time"
        >
          <div className="goal-grid">
            {p.goals.map((g) => (
              <div key={g.name}>
                <strong>{g.name}</strong>
                <span>
                  {g.completed} of {g.total} milestones
                </span>
                <progress
                  max={g.total}
                  value={g.completed}
                  aria-label={g.name}
                />
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="How things have changed"
          subtitle="Baseline compared with the latest demo check-in"
        >
          <div className="progress-compare">
            <div>
              <small>{date(baseline.date)}</small>
              <strong>
                {baseline.score}
                <span> / {baseline.total}</span>
              </strong>
              <p>Baseline</p>
            </div>
            <Icon name="arrow" size={22} />
            <div className="progress-latest">
              <small>{date(latest.date)}</small>
              <strong>
                {latest.score}
                <span> / {latest.total}</span>
              </strong>
              <p>
                Latest
                {latest.score > baseline.score && (
                  <Status tone="green">+{latest.score - baseline.score}</Status>
                )}
              </p>
            </div>
          </div>
          <div className="chart-foot">
            <Icon name="activity" size={15} />
            <span>
              Demo checklist for illustration only — not a verified clinical
              instrument.
            </span>
          </div>
        </Panel>
      </div>
      <Panel
        title="What's coming up"
        subtitle={"Next planned follow-ups in " + possessive + " plan"}
      >
        {upcoming.length ? (
          <div className="followup-list">
            {upcoming.map((f) => (
              <div key={f.id}>
                <Icon name="clock" size={18} />
                <span>
                  <strong>{f.type}</strong>
                  <small>Due {date(f.due)}</small>
                </span>
                <Status tone={familyStatus(f) === "Overdue" ? "amber" : "green"}>
                  {familyStatus(f)}
                </Status>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Nothing scheduled right now"
            text="There are no open follow-ups in this demo record."
          />
        )}
      </Panel>
      <div className="review-callout">
        <span className="review-icon">
          <Icon name="download" size={25} />
        </span>
        <div>
          <h3>Keep a copy for {self ? "yourself" : "your records"}.</h3>
          <p>A simple, ready-to-read summary of {possessive} progress.</p>
        </div>
        <button
          className="button secondary"
          onClick={() => onExport("profile", "project", p.id)}
        >
          Download summary <Icon name="arrow" size={16} />
        </button>
      </div>
    </>
  );
}
export function MySessions({ user, revision, filters }) {
  const resource = useResource("/api/me?" + query(filters), revision);
  if (!resource.data) return <LoadState resource={resource} />;
  const p = resource.data.profile;
  const self = user.role === "student";
  const counts = ["Completed", "Missed", "Cancelled"].map((label) => ({
    label,
    value: p.services.filter((s) => s.status === label).length,
  }));
  return (
    <>
      <div className="dashboard-grid lower">
        <Panel
          title={self ? "Your sessions" : "Session attendance"}
          subtitle="Completed, missed and cancelled activity in this demo record"
        >
          <Delivery rows={counts} />
        </Panel>
        <Panel title="At a glance" subtitle="Across the recorded demo history">
          <div className="profile-facts">
            <div>
              <small>Total sessions</small>
              <strong>{number(p.services.length)}</strong>
            </div>
            <div>
              <small>Completed</small>
              <strong>{number(counts[0].value)}</strong>
            </div>
            <div>
              <small>Assigned worker</small>
              <strong>{p.worker}</strong>
            </div>
            <div>
              <small>Review due</small>
              <strong>{date(p.nextReview)}</strong>
            </div>
          </div>
        </Panel>
      </div>
      <Panel
        title="Session history"
        subtitle={
          "Most recent sessions first · " + p.services.length + " recorded"
        }
      >
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
              {p.services.slice(0, 30).map((s) => (
                <tr key={s.id}>
                  <td>{date(s.date)}</td>
                  <td>{s.type}</td>
                  <td>
                    <Status tone={s.status === "Completed" ? "green" : "gray"}>
                      {s.status}
                    </Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
export function MyCaseload({
  revision,
  filters,
  onBeneficiary,
  onExport,
}) {
  const resource = useResource("/api/me?" + query(filters), revision);
  if (!resource.data) return <LoadState resource={resource} />;
  const { rows, worker } = resource.data;
  const active = rows.filter((r) => r.status === "Active").length;
  const needsAttention = rows.filter((r) => !r.complete).length;
  return (
    <>
      <section className="caseload-hero">
        <span className="family-hero-art">
          <Icon name="people" size={28} />
        </span>
        <div>
          <Status tone="amber">Demo caseload</Status>
          <h2>Your students</h2>
          <p>
            {worker} · {rows.length} assigned · {active} active
          </p>
        </div>
        <div className="caseload-hero-actions">
          <button
            className="button secondary"
            onClick={() => onExport("beneficiaries")}
          >
            <Icon name="download" size={16} />
            Export list
          </button>
        </div>
      </section>
      {needsAttention > 0 && (
        <div className="info-note warning">
          <Icon name="alert" size={18} />
          <p>
            {needsAttention} record{needsAttention > 1 ? "s" : ""} in your
            caseload {needsAttention > 1 ? "are" : "is"} marked incomplete.
            Corrections are made in the source application.
          </p>
        </div>
      )}
      <Panel
        title="My students"
        subtitle="Click a student to open their read-only demo profile"
      >
        {rows.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Program</th>
                  <th>District</th>
                  <th>Last service</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
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
        ) : (
          <Empty
            title="No students assigned"
            text="This demo caseload is empty for the selected filters."
          />
        )}
      </Panel>
    </>
  );
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
  [
    "Teacher / field worker",
    "Own caseload only",
    "Assigned students only",
    "Own caseload only",
    "No",
  ],
  [
    "Parent / learner",
    "Own record only",
    "Own record only",
    "Own summary only",
    "No",
  ],
  [
    "Reporting officer",
    "Approved indicators",
    "Minimum necessary",
    "Aggregate + row-level",
    "No",
  ],
  [
    "System administrator",
    "System health & config",
    "No routine content access",
    "As separately approved",
    "Yes, with audit trail",
  ],
];
export function Admin({ revision }) {
  const resource = useResource("/api/connection", revision),
    [result, setResult] = useState(null),
    [checking, setChecking] = useState(false),
    [error, setError] = useState("");
  async function inspect() {
    setChecking(true);
    setError("");
    try {
      setResult(await api("/api/schema"));
    } catch (e) {
      setError(e.message);
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
          <h2>System health & access, not personal records.</h2>
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
        <Panel title="System status" subtitle="Local demo environment">
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
              <Status tone="amber">Fictional demo data</Status>
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
          <button
            className="button primary"
            onClick={inspect}
            disabled={checking}
          >
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
            {[
              [
                "Record views",
                "Each profile open is logged with a hashed subject.",
              ],
              ["Exports", "Excel and PDF downloads are recorded by role."],
              ["Role switches", "Changing persona replaces the session."],
              ["Sessions", "Opaque HttpOnly cookies · 30-minute timeout."],
            ].map(([t, d]) => (
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
      <Panel
        title="Access & roles"
        subtitle="Who can see and do what · proposed matrix"
      >
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
export function Connection({ revision, user }) {
  const resource = useResource("/api/connection", revision),
    [result, setResult] = useState(null),
    [checking, setChecking] = useState(false),
    [error, setError] = useState("");
  async function inspect() {
    setChecking(true);
    setError("");
    try {
      setResult(await api("/api/schema"));
    } catch (e) {
      setError(e.message);
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
          <Status tone="amber">Demo environment</Status>
          <h2>Know the source. Trust the picture.</h2>
          <p>
            The application is running with fictional demo records. Live
            reporting stays disabled until the production connection, schema and
            access rules have been verified.
          </p>
        </div>
        <span className="connection-lock">
          <Icon name="shield" size={20} />
          No production writes
        </span>
      </section>
      <div className="connection-grid">
        <Panel
          title="Production connection"
          subtitle="Server-side access only · SQL Server"
        >
          <div className="connection-details">
            <div>
              <span>Database</span>
              <strong>sristi_foundation_tamilnadu</strong>
            </div>
            <div>
              <span>Connection settings</span>
              <Status tone={resource.data?.configured ? "green" : "gray"}>
                {resource.data?.configured
                  ? "Configured on server"
                  : "Not configured"}
              </Status>
            </div>
            <div>
              <span>Reporting source</span>
              <Status tone="amber">Fictional demo data</Status>
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
              Connection inspection is limited to the local demo director.
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
        <Panel
          title="Path to live reporting"
          subtitle="Verify the source before presenting live numbers"
        >
          <ol className="connection-steps">
            {[
              [
                "Connection",
                "Reach the production server with encrypted, read-only access.",
              ],
              [
                "Schema discovery",
                "Inspect existing objects, keys and relationships.",
              ],
              [
                "Verified field mapping",
                "Confirm beneficiary IDs, services, statuses and reporting dates.",
              ],
              [
                "Access and reconciliation",
                "Approve user permissions and compare totals against source reads.",
              ],
            ].map(([title, desc], i) => (
              <li key={title}>
                <span>{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                  <small>
                    {i === 0 && resource.data?.configured
                      ? "Configured · connectivity unverified"
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
            result.columns.length +
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
                      {result.columns
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
