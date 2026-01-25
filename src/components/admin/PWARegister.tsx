"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/admin-sw.js", { scope: "/admin/" })
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    // Ensure manifest link exists (fallback if Next.js metadata doesn't work)
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/admin-manifest.json";
      document.head.appendChild(link);
      console.log("[PWA] Manifest link added");
    }
  }, []);

  return null;
}
