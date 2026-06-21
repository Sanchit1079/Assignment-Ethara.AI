import { createContext, useCallback, useContext, useState } from "react";

// Lightweight toast notification system for clear success/error messages.
const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const push = (type, message, title) => {
    const id = ++idSeq;
    setToasts((t) => [...t, { id, type, message, title }]);
    setTimeout(() => remove(id), 4000);
  };

  const toast = {
    success: (msg, title = "Success") => push("success", msg, title),
    error: (msg, title = "Error") => push("error", msg, title),
    info: (msg, title = "Info") => push("info", msg, title),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
            <div className="toast-title">{t.title}</div>
            <div>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
