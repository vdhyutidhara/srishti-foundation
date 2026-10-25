"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { section: "Overview" },
  { href: "/", icon: "⬛", label: "Management Overview" },
  { section: "Beneficiaries" },
  { href: "/beneficiaries", icon: "👥", label: "All Beneficiaries" },
  { section: "Projects" },
  { href: "/projects", icon: "📋", label: "Project Dashboards" },
  { section: "Operations" },
  { href: "/service-delivery", icon: "🗓", label: "Service Delivery" },
  { href: "/outcomes", icon: "📈", label: "Outcomes & Progress" },
  { href: "/workers", icon: "👤", label: "Worker Activity" },
  { href: "/data-quality", icon: "🔍", label: "Data Quality" },
  { section: "Actions" },
  { href: "/alerts", icon: "🔔", label: "Alerts & Actions", badge: "!" },
  { href: "/reports", icon: "⬇", label: "Download Reports" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <div className="sidebar">
      <div className="sb-logo">
        <div className="sb-mark">SF</div>
        <div>
          <div className="sb-name">Sristi Foundation</div>
          <div className="sb-sub">Management Dashboard</div>
        </div>
      </div>
      {nav.map((item, i) => {
        if ("section" in item) return <div key={i} className="sb-section">{item.section}</div>;
        const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={`sb-item${active ? " on" : ""}`}>
            <span className="sb-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && <span className="sb-badge warn">{item.badge}</span>}
          </Link>
        );
      })}
      <div className="sb-foot">
        <div>Sristi Foundation</div>
        <div>Tamil Nadu</div>
        <div className="role-badge">Director</div>
      </div>
    </div>
  );
}
