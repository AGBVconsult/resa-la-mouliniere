"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";

export const MOBILE_SW_URL = "/admin-mobile-sw.js";
export const MOBILE_SW_SCOPE = "/admin-mobile";

type State =
  | "loading"
  | "unsupported"
  | "needs-install"
  | "not-configured"
  | "denied"
  | "off"
  | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(MOBILE_SW_URL, { scope: MOBILE_SW_SCOPE });
}

function toArgs(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
    userAgent: navigator.userAgent,
  };
}

/**
 * Enable / disable Web Push notifications on this device.
 */
export function PushNotificationToggle() {
  const vapidPublicKey = useQuery(api.pushSubscriptions.getVapidPublicKey);
  const subscribe = useMutation(api.pushSubscriptions.subscribe);
  const unsubscribe = useMutation(api.pushSubscriptions.unsubscribe);

  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect current state (and re-sync an existing subscription with the server)
  useEffect(() => {
    if (vapidPublicKey === undefined) return;
    let cancelled = false;

    (async () => {
      if (!isPushSupported()) {
        setState(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      if (vapidPublicKey === null) {
        setState("not-configured");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const reg = await getRegistration();
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (sub && Notification.permission === "granted") {
          await subscribe(toArgs(sub));
          if (!cancelled) setState("on");
        } else {
          setState("off");
        }
      } catch {
        if (!cancelled) setState("off");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey, subscribe]);

  const enable = async () => {
    if (!vapidPublicKey) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await getRegistration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));
      await subscribe(toArgs(sub));
      setState("on");
    } catch (err) {
      console.error("[Push] Subscription failed:", err);
      setError("Impossible d'activer les notifications. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await getRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribe({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("off");
    } catch (err) {
      console.error("[Push] Unsubscribe failed:", err);
      setError("Impossible de désactiver les notifications. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading") return null;

  const hint: Partial<Record<State, string>> = {
    "needs-install":
      "Ajoutez l'app à l'écran d'accueil (Safari › Partager › Sur l'écran d'accueil) puis ouvrez-la depuis l'icône.",
    unsupported: "Ce navigateur ne prend pas en charge les notifications.",
    "not-configured": "Notifications non configurées sur le serveur.",
    denied: "Notifications bloquées : autorisez-les dans Réglages › Notifications › LM Mobile.",
  };

  const isOn = state === "on";
  const canToggle = state === "on" || state === "off";

  return (
    <div className="mx-4 mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-3">
        {isOn ? (
          <BellRing className="w-5 h-5 text-emerald-600 shrink-0" />
        ) : (
          <BellOff className="w-5 h-5 text-slate-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Notifications</p>
          <p className="text-xs text-slate-500">
            {isOn ? "Activées sur cet appareil" : hint[state] ?? "Désactivées sur cet appareil"}
          </p>
        </div>
        {canToggle && (
          <button
            onClick={isOn ? disable : enable}
            disabled={busy}
            className={
              isOn
                ? "shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                : "shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            }
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isOn ? "Désactiver" : "Activer"}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
