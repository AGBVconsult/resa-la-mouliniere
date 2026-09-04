import { NextResponse } from "next/server";
import { getSigningMaterial } from "@/lib/convex-auth/keys";

export const dynamic = "force-dynamic";

/**
 * JWKS public : clé de vérification des jetons émis par `/api/auth/convex-token`.
 * Lue par Convex (voir `convex/auth.config.ts`). Ne contient que la partie publique.
 */
export async function GET() {
  try {
    const { publicJwk } = await getSigningMaterial();
    return NextResponse.json(
      { keys: [publicJwk] },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } }
    );
  } catch (err) {
    console.error("[jwks] configuration invalide:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ keys: [] }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
