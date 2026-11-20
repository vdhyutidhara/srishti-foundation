import { useEffect, useRef } from "react";
import { number } from "./api.js";
const paths = {
  leaf: "M12 21V10m0 6C3 17 3 6 3 6c7 0 9 5 9 10Zm0-5c0-8 9-8 9-8s0 9-9 9",
  overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  projects: "M3 7h7l2 2h9v11H3zM3 7V4h7l2 3",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7.87a4 4 0 0 1 0 7.75",
  reports: "M4 3h12l4 4v14H4zM14 3v6h6M8 13h8M8 17h5",
  connection:
    "M5 7c0-2 14-2 14 0s-14 2-14 0m0 0v10c0 3 14 3 14 0V7M5 12c0 3 14 3 14 0",
  search: "M21 21l-5-5M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  chevron: "m8 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  refresh: "M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M18 18a8 8 0 0 1-14-6",
  calendar: "M4 5h16v16H4zM8 3v4m8-4v4M4 10h16",
  check: "m5 12 4 4L19 6",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6",
  clock: "M12 8v4l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
  alert: "m12 3 10 18H2zM12 9v5m0 3v.1",
  close: "m6 6 12 12M18 6 6 18",
  filter: "M4 7h16M7 12h10M10 17h4",
  help: "M9 9a3 3 0 1 1 4 2.83c-1 .5-1 1.17-1 2.17m0 3v.1M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
  menu: "M4 6h16M4 12h16M4 18h16",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  pin: "M12 22s8-8 8-14A8 8 0 0 0 4 8c0 6 8 14 8 14m0-11a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  heart:
    "M12 21C5 16 2 12 2 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 10 2.5C22 12 19 16 12 21Z",
  home: "M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9",
  star: "m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z",
  book: "M4 4h8v16H4zM12 4h8v16h-8M4 8h8M4 12h8",
};
export function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.activity} />
    </svg>
  );
}
export function Status({ children, tone = "green" }) {
  return <span className={"status " + tone}>{children}</span>;
}
export function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={"panel " + className}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function LoadState({ resource }) {
  if (resource.loading)
    return (
      <div className="loading-block" role="status">
        <span className="spinner" /> Loading your view…
      </div>
    );
  if (resource.error)
    return (
      <div className="error-state" role="alert">
        <Icon name="alert" />
        <div>
          <strong>We couldn’t load this view</strong>
          <p>{resource.error}</p>
        </div>
      </div>
    );
  return null;
}
export function Empty({
  title = "No records match these filters",
  text = "Try a different project or reporting period.",
}) {
  return (
    <div className="empty-state">
      <Icon name="search" size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Dialog({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"dialog " + (wide ? "wide" : "")}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function BarList({ rows, onClick }) {
  const max = Math.max(1, ...rows.map((r) => r.value || 0));
  return (
    <div className="bar-list">
      {rows.map((r) => (
        <div className="bar-row" key={r.id || r.label}>
          <div className="bar-label">
            <span>{r.short || r.label}</span>
            <strong>{number(r.value)}</strong>
          </div>
          {onClick ? (
            <button
              className="bar-track"
              aria-label={"View " + (r.name || r.label)}
              onClick={() => onClick(r.id)}
            >
              <span
                style={{
                  width: ((r.value || 0) / max) * 100 + "%",
                  background: r.color,
                }}
              />
            </button>
          ) : (
            <div className="bar-track">
              <span
                style={{
                  width: ((r.value || 0) / max) * 100 + "%",
                  background: r.color || "#6b9178",
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
export function Trend({ rows }) {
  if (!rows.some((r) => r.value !== null))
    return (
      <Empty
        title="Breakdown withheld"
        text="Small groups are suppressed for this role."
      />
    );
  const width = 600,
    height = 190,
    pad = 25,
    max = Math.ceil(Math.max(1, ...rows.map((r) => r.value || 0)) / 100) * 100;
  const points = rows.map((r, i) => ({
    x: pad + (i * (width - pad * 2)) / (rows.length - 1),
    y: height - pad - ((r.value || 0) / max) * (height - pad * 2),
    ...r,
  }));
  const d = "M" + points.map((p) => p.x + "," + p.y).join(" L");
  return (
    <>
      <svg
        viewBox={"0 0 " + width + " " + height}
        className="trend-svg"
        role="img"
        aria-label={
          "Completed service sessions: " +
          rows.map((r) => r.label + " " + number(r.value)).join(", ")
        }
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#88a875" stopOpacity=".27" />
            <stop offset="100%" stopColor="#88a875" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1={pad}
              x2={width - pad}
              y1={pad + (i * (height - pad * 2)) / 3}
              y2={pad + (i * (height - pad * 2)) / 3}
              stroke="#e9ece6"
              strokeDasharray="3 5"
            />
          </g>
        ))}
        <path
          d={
            d +
            " L" +
            (width - pad) +
            "," +
            (height - pad) +
            " L" +
            pad +
            "," +
            (height - pad) +
            " Z"
          }
          fill="url(#area)"
        />
        <path
          d={d}
          fill="none"
          stroke="#527a5e"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <g key={p.label}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#fff"
              stroke="#527a5e"
              strokeWidth="2"
            >
              <title>
                {p.label}: {p.value} completed sessions
              </title>
            </circle>
            <text
              x={p.x}
              y={p.y - 13}
              textAnchor="middle"
              fontSize="11"
              fill="#577062"
            >
              {p.value}
            </text>
          </g>
        ))}
      </svg>
      <div className="trend-labels">
        {rows.map((r) => (
          <span key={r.label}>{r.label}</span>
        ))}
      </div>
    </>
  );
}
export function Delivery({ rows }) {
  const total = rows.reduce((n, r) => n + (r.value || 0), 0),
    colors = ["#426a50", "#d9b777", "#d8dcd3"];
  let offset = 0;
  if (rows.some((r) => r.value === null))
    return (
      <Empty
        title="Breakdown withheld"
        text="Small groups are suppressed for this role."
      />
    );
  return (
    <div className="delivery">
      <div className="donut">
        <svg
          viewBox="0 0 120 120"
          aria-label={
            "Service status: " +
            rows.map((r) => r.label + " " + r.value).join(", ")
          }
          role="img"
        >
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="#f0f2ec"
            strokeWidth="13"
          />
          {rows.map((r, i) => {
            const length = total ? (r.value / total) * 289 : 0;
            const start = offset;
            offset += length;
            return (
              <circle
                key={r.label}
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke={colors[i]}
                strokeWidth="13"
                strokeDasharray={length + " " + (289 - length)}
                strokeDashoffset={-start}
                transform="rotate(-90 60 60)"
              />
            );
          })}
        </svg>
        <div>
          <strong>
            {total ? Math.round((rows[0].value / total) * 100) + "%" : "—"}
          </strong>
          <span>completed</span>
        </div>
      </div>
      <div className="donut-legend">
        {rows.map((r, i) => (
          <div key={r.label}>
            <i style={{ background: colors[i] }} />
            <span>{r.label}</span>
            <strong>{number(r.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
