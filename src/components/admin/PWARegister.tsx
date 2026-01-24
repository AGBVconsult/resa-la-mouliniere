"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/admin-sw.js", { scope: "/admin" })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
