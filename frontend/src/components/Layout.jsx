import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/products", label: "Products", icon: "📦" },
  { to: "/customers", label: "Customers", icon: "👥" },
  { to: "/orders", label: "Orders", icon: "🧾" },
];

const TITLES = {
  "/": { h: "Dashboard", p: "Overview of your inventory and orders" },
  "/products": { h: "Products", p: "Manage your product catalog and stock" },
  "/customers": { h: "Customers", p: "Manage your customer records" },
  "/orders": { h: "Orders", p: "Create and track customer orders" },
};

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const meta = TITLES[pathname] || { h: "", p: "" };

  return (
    <div className="app">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-badge">📦</span>
          <span>InventoryOMS</span>
        </div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </aside>

      <div className={`backdrop ${open ? "show" : ""}`} onClick={() => setOpen(false)} />

      <main className="content">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="hamburger" onClick={() => setOpen((o) => !o)}>
              ☰
            </button>
            <div>
              <h1>{meta.h}</h1>
              <p>{meta.p}</p>
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
