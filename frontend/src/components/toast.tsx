"use client";

import { useCallback, useEffect, useState } from "react";

type ToastType = "default" | "success" | "danger";

interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

let toastId = 0;
const listeners: Set<(t: ToastState) => void> = new Set();

export function showToast(message: string, type: ToastType = "default") {
  const state: ToastState = { message, type, id: ++toastId };
  listeners.forEach((fn) => fn(state));
}

export function ToastContainer() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleToast = useCallback((t: ToastState) => {
    setToast(t);
  }, []);

  useEffect(() => {
    listeners.add(handleToast);
    return () => { listeners.delete(handleToast); };
  }, [handleToast]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const className = ["toast", toast.type === "success" ? "toast-success" : toast.type === "danger" ? "toast-danger" : ""].filter(Boolean).join(" ");

  return (
    <div key={toast.id} className={className}>
      {toast.message}
    </div>
  );
}
