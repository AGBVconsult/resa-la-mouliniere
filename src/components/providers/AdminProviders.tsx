"use client";

import { useCallback, type ReactNode } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { ConvexProviderWithAuth } from "convex/react";
import { convex } from "./ConvexClientProvider";

/**
 * Pont NextAuth → Convex.
 * Tant que la session NextAuth est valide, le client Convex présente un JWT
 * signé par `/api/auth/convex-token` ; Convex le vérifie via le JWKS public.
 */
function useNextAuthForConvex() {
  const { status } = useSession();

  const fetchAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/convex-token", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string };
      return data.token ?? null;
    } catch {
      return null;
    }
  }, []);

  return {
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    fetchAccessToken,
  };
}

/**
 * Fournisseurs des surfaces d'administration (desktop, tablette, mobile).
 * `session` vient du layout serveur pour éviter un aller-retour au montage.
 */
export function AdminProviders({ children, session }: { children: ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <ConvexProviderWithAuth client={convex} useAuth={useNextAuthForConvex}>
        {children}
      </ConvexProviderWithAuth>
    </SessionProvider>
  );
}
