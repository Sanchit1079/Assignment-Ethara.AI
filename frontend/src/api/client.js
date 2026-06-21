import axios from "axios";

// Base URL comes from an environment variable so the same build can target
// local Docker (proxied at /api) or a live backend on Render/Railway.
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({ baseURL });

// Normalize backend error messages into a single readable string.
export function apiError(err) {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors.
    return detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
  }
  if (typeof detail === "string") return detail;
  return err?.message || "Something went wrong";
}

// ---- Products ----
export const getProducts = () => api.get("/products").then((r) => r.data);
export const createProduct = (data) => api.post("/products", data).then((r) => r.data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ---- Customers ----
export const getCustomers = () => api.get("/customers").then((r) => r.data);
export const createCustomer = (data) => api.post("/customers", data).then((r) => r.data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);

// ---- Orders ----
export const getOrders = () => api.get("/orders").then((r) => r.data);
export const getOrder = (id) => api.get(`/orders/${id}`).then((r) => r.data);
export const createOrder = (data) => api.post("/orders", data).then((r) => r.data);
export const deleteOrder = (id) => api.delete(`/orders/${id}`);

// ---- Dashboard ----
export const getDashboard = () => api.get("/dashboard").then((r) => r.data);

export default api;
