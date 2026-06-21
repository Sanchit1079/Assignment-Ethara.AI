import axios from "axios";

// Base URL comes from an environment variable so the same build can target
// local Docker (proxied at /api) or a live backend on Render/Railway.
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({ baseURL, timeout: 60000 });

// Free hosting tiers (e.g. Render) spin the backend down after inactivity, so
// the first request after a cold start can fail or time out for ~30-50s while
// the container wakes up. Retry idempotent/transient failures a few times with
// a short backoff so cold starts feel smooth instead of broken.
const MAX_RETRIES = 4;
const RETRY_DELAY = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config;
  if (!config) return Promise.reject(error);

  const status = error.response?.status;
  // Retry on network errors / timeouts (no response) or gateway-style errors
  // and the 404 "no-server" edge response Render returns while waking up.
  const isColdStart =
    !error.response ||
    error.code === "ECONNABORTED" ||
    [404, 502, 503, 504].includes(status);
  // Never retry a 404 for a real resource lookup (GET /products/{id} etc.);
  // only retry list/collection calls that should always exist.
  const isCollection = /\/(products|customers|orders|dashboard)\/?$/.test(
    config.url || ""
  );

  config.__retryCount = config.__retryCount || 0;
  if (isColdStart && (status !== 404 || isCollection) && config.__retryCount < MAX_RETRIES) {
    config.__retryCount += 1;
    await sleep(RETRY_DELAY);
    return api(config);
  }
  return Promise.reject(error);
});

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
