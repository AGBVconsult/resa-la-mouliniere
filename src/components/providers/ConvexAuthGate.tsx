"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

/**
 * Renders admin content only once Convex has accepted the session token.
 *
 * Without this gate, admin queries would fire before the token is attached and
 * fail with FORBIDDEN. The server layouts already redirect anonymous visitors
 * to the login page, so the "unauthenticated" branch only shows up when the
 * JWT bridge is misconfigured (missing CONVEX_JWT_PRIVATE_KEY / CONVEX_AUTH_ISSUER).
 */
export function ConvexAuthGate({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="ml-3 text-sm">Connexion sécurisée…</span>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md text-center space-y-3">
            <ShieldAlert className="h-10 w-10 mx-auto text-amber-500" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-slate-900">Session non reconnue par le backend</h1>
            <p className="text-sm text-slate-600">
              Votre session est valide mais le backend n&apos;a pas pu vérifier votre identité.
              Vérifiez la configuration CONVEX_JWT_PRIVATE_KEY / CONVEX_AUTH_ISSUER (voir docs/SECURITE-SPRINT0.md),
              puis reconnectez-vous.
            </p>
            <Link href="/admin/login" className="inline-block text-sm font-medium text-slate-900 underline">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  );
}
