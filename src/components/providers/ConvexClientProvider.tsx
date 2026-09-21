"use client";

import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { useSession } from "next-auth/react";
import { ReactNode, useCallback, useMemo } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Bridge NextAuth → Convex.
 *
 * Public pages (widget, /reservation/[token]) run without a session: Convex
 * stays unauthenticated and only public functions are reachable.
 * Admin pages have a NextAuth session: the provider fetches a short-lived
 * RS256 token from `/api/convex/token`, which Convex validates against the
 * JWKS declared in `convex/auth.config.ts`. `requireRole` then reads the
 * `role` claim from the verified identity.
 */
function useNextAuthForConvex() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Convex passes `{ forceRefreshToken }`; every call mints a fresh token, so
  // the flag needs no special handling.
  const fetchAccessToken = useCallback(
    async (): Promise<string | null> => {
      if (!isAuthenticated) return null;
      try {
        const res = await fetch("/api/convex/token", { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) {
          console.error("[convex-auth] token endpoint returned", res.status);
          return null;
        }
        const data = (await res.json()) as { token?: unknown };
        return typeof data.token === "string" ? data.token : null;
      } catch (error) {
        console.error("[convex-auth] token fetch failed", error);
        return null;
      }
    },
    [isAuthenticated]
  );

  return useMemo(
    () => ({
      isLoading: status === "loading",
      isAuthenticated,
      fetchAccessToken,
    }),
    [status, isAuthenticated, fetchAccessToken]
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useNextAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}
