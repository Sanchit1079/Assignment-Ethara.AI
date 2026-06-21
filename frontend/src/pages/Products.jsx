import { useEffect, useState } from "react";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  apiError,
} from "../api/client.js";
import { Spinner, Empty, money } from "../components/common.jsx";
import Modal from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

const BLANK = { name: "", sku: "", price: "", quantity_in_stock: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {mode, product}
  const toast = useToast();

  const load = () =>
    getProducts()
      .then(setProducts)
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (p) => {
    if (!window.confirm(`Delete product "${p.name}"?`)) return;
    try {
      await deleteProduct(p.id);
      toast.success(`Deleted "${p.name}"`);
      setProducts((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <>
      <div className="section-head">
        <h2>{products.length} Product{products.length !== 1 ? "s" : ""}</h2>
        <button className="btn" onClick={() => setModal({ mode: "create" })}>
          ＋ Add Product
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <div className="card">
          <Empty icon="📦" title="No products yet" hint="Add your first product to get started." />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>In Stock</th>
                <th>Status</th>
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td className="muted">{p.sku}</td>
                  <td>{money(p.price)}</td>
                  <td>{p.quantity_in_stock}</td>
                  <td>
                    {p.quantity_in_stock === 0 ? (
                      <span className="badge red">Out of stock</span>
                    ) : p.quantity_in_stock <= 10 ? (
                      <span className="badge amber">Low stock</span>
                    ) : (
                      <span className="badge green">In stock</span>
                    )}
                  </td>
                  <td className="right nowrap">
                    <button
                      className="icon-btn"
                      title="Edit"
                      onClick={() => setModal({ mode: "edit", product: p })}
                    >
                      ✏️
                    </button>{" "}
                    <button
                      className="icon-btn danger"
                      title="Delete"
                      onClick={() => onDelete(p)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ProductForm
          mode={modal.mode}
          product={modal.product}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            setModal(null);
            if (modal.mode === "create") setProducts((l) => [...l, saved]);
            else setProducts((l) => l.map((x) => (x.id === saved.id ? saved : x)));
          }}
        />
      )}
    </>
  );
}

function ProductForm({ mode, product, onClose, onSaved }) {
  const [form, setForm] = useState(
    product
      ? {
          name: product.name,
          sku: product.sku,
          price: String(product.price),
          quantity_in_stock: String(product.quantity_in_stock),
        }
      : BLANK
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.sku.trim()) e.sku = "SKU is required";
    if (form.price === "" || Number(form.price) < 0)
      e.price = "Enter a valid price (0 or more)";
    if (form.quantity_in_stock === "" || Number(form.quantity_in_stock) < 0)
      e.quantity_in_stock = "Enter a valid quantity (0 or more)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: Number(form.price),
      quantity_in_stock: parseInt(form.quantity_in_stock, 10),
    };
    try {
      const saved =
        mode === "create"
          ? await createProduct(payload)
          : await updateProduct(product.id, payload);
      toast.success(`Product ${mode === "create" ? "created" : "updated"}`);
      onSaved(saved);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={mode === "create" ? "Add Product" : "Edit Product"}
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
          <label>Product Name</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Wireless Mouse" />
          {errors.name && <div className="err">{errors.name}</div>}
        </div>
        <div className="field">
          <label>SKU / Code</label>
          <input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. WM-001" />
          {errors.sku && <div className="err">{errors.sku}</div>}
        </div>
        <div className="form-row">
          <div className="field">
            <label>Price (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0.00"
            />
            {errors.price && <div className="err">{errors.price}</div>}
          </div>
          <div className="field">
            <label>Quantity in Stock</label>
            <input
              type="number"
              min="0"
              value={form.quantity_in_stock}
              onChange={(e) => set("quantity_in_stock", e.target.value)}
              placeholder="0"
            />
            {errors.quantity_in_stock && <div className="err">{errors.quantity_in_stock}</div>}
          </div>
        </div>
        <button type="submit" style={{ display: "none" }} />
      </form>
    </Modal>
  );
}
