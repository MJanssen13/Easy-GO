"use client";

import { useEffect } from "react";

/** Registra o service worker (só em produção — no dev atrapalharia o recarregamento). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
