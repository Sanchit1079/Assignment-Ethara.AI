import { useEffect, useState } from "react";
import {
  getOrders,
  createOrder,
  deleteOrder,
  getCustomers,
  getProducts,
  apiError,
} from "../api/client.js";
import { Spinner, Empty, money, formatDate } from "../components/common.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const toast = useToast();

  const load = () =>
    getOrders()
      .then(setOrders)
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (o) => {
    if (!window.confirm(`Delete order #${o.id}? Stock will be restored.`)) return;
    try {
      await deleteOrder(o.id);
      toast.success(`Order #${o.id} deleted`);
      setOrders((list) => list.filter((x) => x.id !== o.id));
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <>
      <div className="section-head">
        <h2>{orders.length} Order{orders.length !== 1 ? "s" : ""}</h2>
        <button className="btn" onClick={() => setShowForm(true)}>
          ＋ Create Order
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <div className="card">
          <Empty icon="🧾" title="No orders yet" hint="Create an order to reduce stock automatically." />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>#{o.id}</td>
                  <td>{o.customer?.full_name}</td>
                  <td>{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td style={{ fontWeight: 600 }}>{money(o.total_amount)}</td>
                  <td className="muted">{formatDate(o.created_at)}</td>
                  <td>
                    <span className="badge indigo" style={{ textTransform: "capitalize" }}>
                      {o.status}
                    </span>
                  </td>
                  <td className="right nowrap">
                    <button className="icon-btn" title="View details" onClick={() => setDetail(o)}>
                      👁️
                    </button>{" "}
                    <button className="icon-btn danger" title="Delete" onClick={() => onDelete(o)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <OrderForm
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setShowForm(false);
            setOrders((l) => [saved, ...l]);
          }}
        />
      )}

      {detail && <OrderDetail order={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

function OrderForm({ onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [ready, setReady] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ product_id: "", quantity: 1 }]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([getCustomers(), getProducts()])
      .then(([c, p]) => {
        setCustomers(c);
        setProducts(p);
      })
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setReady(true));
  }, []);

  const productById = (id) => products.find((p) => String(p.id) === String(id));

  const setLine = (idx, key, val) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [key]: val } : l)));
  const addLine = () => setLines((ls) => [...ls, { product_id: "", quantity: 1 }]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const total = lines.reduce((sum, l) => {
    const p = productById(l.product_id);
    return sum + (p ? Number(p.price) * Number(l.quantity || 0) : 0);
  }, 0);

  const validate = () => {
    const e = {};
    if (!customerId) e.customer = "Select a customer";
    const filled = lines.filter((l) => l.product_id);
    if (filled.length === 0) e.lines = "Add at least one product";
    for (const l of filled) {
      const p = productById(l.product_id);
      if (p && Number(l.quantity) > p.quantity_in_stock) {
        e.lines = `Not enough stock for "${p.name}" (available ${p.quantity_in_stock})`;
        break;
      }
      if (Number(l.quantity) < 1) {
        e.lines = "Quantity must be at least 1";
        break;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await createOrder({
        customer_id: Number(customerId),
        items: lines
          .filter((l) => l.product_id)
          .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) })),
      });
      toast.success(`Order #${saved.id} created`);
      onSaved(saved);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Create Order"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn" onClick={submit} disabled={saving}>
            {saving ? "Placing…" : "Place Order"}
          </button>
        </>
      }
    >
      {!ready ? (
        <Spinner />
      ) : customers.length === 0 || products.length === 0 ? (
        <Empty
          icon="⚠️"
          title="Missing data"
          hint="You need at least one customer and one product before creating an order."
        />
      ) : (
        <>
          <div className="field">
            <label>Customer</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </option>
              ))}
            </select>
            {errors.customer && <div className="err">{errors.customer}</div>}
          </div>

          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
            Order Items
          </label>
          {lines.map((l, idx) => {
            const p = productById(l.product_id);
            return (
              <div className="line-item" key={idx}>
                <select value={l.product_id} onChange={(e) => setLine(idx, "product_id", e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.quantity_in_stock === 0}>
                      {p.name} — {money(p.price)} ({p.quantity_in_stock} in stock)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max={p ? p.quantity_in_stock : undefined}
                  value={l.quantity}
                  onChange={(e) => setLine(idx, "quantity", e.target.value)}
                />
                <button
                  className="icon-btn danger"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {errors.lines && <div className="err" style={{ marginBottom: 8 }}>{errors.lines}</div>}

          <button className="btn ghost sm" onClick={addLine} style={{ marginTop: 2 }}>
            ＋ Add another product
          </button>

          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </>
      )}
    </Modal>
  );
}

function OrderDetail({ order, onClose }) {
  return (
    <Modal title={`Order #${order.id}`} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      <div style={{ marginBottom: 16 }}>
        <div className="muted" style={{ fontSize: 13 }}>Customer</div>
        <div style={{ fontWeight: 600 }}>{order.customer?.full_name}</div>
        <div className="muted" style={{ fontSize: 13 }}>{order.customer?.email}</div>
      </div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
        Placed on {formatDate(order.created_at)}
      </div>
      <div className="table-wrap" style={{ marginTop: 6 }}>
        <table style={{ minWidth: 0 }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit</th>
              <th className="right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>{i.product?.name}</td>
                <td>{i.quantity}</td>
                <td>{money(i.unit_price)}</td>
                <td className="right">{money(i.unit_price * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        <span>Total</span>
        <span>{money(order.total_amount)}</span>
      </div>
    </Modal>
  );
}
