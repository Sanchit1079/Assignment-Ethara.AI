import { useEffect, useState } from "react";
import { getDashboard, apiError } from "../api/client.js";
import { Spinner, money } from "../components/common.jsx";
import { useToast } from "../components/Toast.jsx";

const CARDS = [
  { key: "total_products", label: "Total Products", icon: "📦" },
  { key: "total_customers", label: "Total Customers", icon: "👥" },
  { key: "total_orders", label: "Total Orders", icon: "🧾" },
  { key: "low_stock_count", label: "Low Stock Items", icon: "⚠️", warn: true },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats) return null;

  return (
    <>
      <div className="grid stats" style={{ marginBottom: 26 }}>
        {CARDS.map((c) => (
          <div key={c.key} className={`card stat-card ${c.warn ? "warn" : ""}`}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{stats[c.key]}</div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2>Low Stock Products</h2>
        <span className="muted" style={{ fontSize: 13 }}>
          Items at or below the low-stock threshold
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Price</th>
              <th>In Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.low_stock_products.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: "center", padding: 28 }}>
                  All products are well stocked 🎉
                </td>
              </tr>
            )}
            {stats.low_stock_products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="muted">{p.sku}</td>
                <td>{money(p.price)}</td>
                <td>{p.quantity_in_stock}</td>
                <td>
                  {p.quantity_in_stock === 0 ? (
                    <span className="badge red">Out of stock</span>
                  ) : (
                    <span className="badge amber">Low</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
