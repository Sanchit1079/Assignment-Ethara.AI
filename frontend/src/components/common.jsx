export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function Empty({ icon = "📭", title, hint }) {
  return (
    <div className="empty">
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 600 }}>{title}</div>
      {hint && <div style={{ marginTop: 4, fontSize: 13 }}>{hint}</div>}
    </div>
  );
}

export const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n || 0)
  );

export const formatDate = (s) => {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
