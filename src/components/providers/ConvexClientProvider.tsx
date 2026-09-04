"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { ReactNode } from "react";

/**
 * Client Convex partagé par toute l'application.
 * Les pages publiques (widget, gestion par token) l'utilisent sans identité ;
 * les surfaces d'administration y attachent un jeton via `AdminProviders`.
 */
export const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}
