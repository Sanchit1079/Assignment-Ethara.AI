import { useEffect, useState } from "react";
import {
  getCustomers,
  createCustomer,
  deleteCustomer,
  apiError,
} from "../api/client.js";
import { Spinner, Empty, formatDate } from "../components/common.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  const load = () =>
    getCustomers()
      .then(setCustomers)
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (c) => {
    if (!window.confirm(`Delete customer "${c.full_name}"?`)) return;
    try {
      await deleteCustomer(c.id);
      toast.success(`Deleted "${c.full_name}"`);
      setCustomers((list) => list.filter((x) => x.id !== c.id));
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <>
      <div className="section-head">
        <h2>{customers.length} Customer{customers.length !== 1 ? "s" : ""}</h2>
        <button className="btn" onClick={() => setShowForm(true)}>
          ＋ Add Customer
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : customers.length === 0 ? (
        <div className="card">
          <Empty icon="👥" title="No customers yet" hint="Add your first customer to get started." />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Joined</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.full_name}</td>
                  <td className="muted">{c.email}</td>
                  <td>{c.phone || "—"}</td>
                  <td className="muted">{formatDate(c.created_at)}</td>
                  <td className="right">
                    <button className="icon-btn danger" title="Delete" onClick={() => onDelete(c)}>
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
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setShowForm(false);
            setCustomers((l) => [...l, saved]);
          }}
        />
      )}
    </>
  );
}

function CustomerForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await createCustomer({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      toast.success("Customer created");
      onSaved(saved);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add Customer"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field">
          <label>Full Name</label>
          <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="e.g. Alice Johnson" />
          {errors.full_name && <div className="err">{errors.full_name}</div>}
        </div>
        <div className="field">
          <label>Email Address</label>
          <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="e.g. alice@example.com" />
          {errors.email && <div className="err">{errors.email}</div>}
        </div>
        <div className="field">
          <label>Phone Number <span className="muted">(optional)</span></label>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="e.g. +1-202-555-0143" />
        </div>
        <button type="submit" style={{ display: "none" }} />
      </form>
    </Modal>
  );
}
