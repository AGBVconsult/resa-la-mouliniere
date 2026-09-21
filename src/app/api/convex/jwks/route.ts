import { NextResponse } from "next/server";
import { ConvexJwtConfigError, getConvexJwks } from "@/lib/convex-jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public JWKS endpoint consumed by Convex (`convex/auth.config.ts`) to verify
 * the tokens minted by `/api/convex/token`. Only public key material is served.
 */
export async function GET() {
  try {
    return NextResponse.json(getConvexJwks(), {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    if (error instanceof ConvexJwtConfigError) {
      console.error("[convex-jwks] configuration error:", error.message);
      return NextResponse.json({ error: "convex_jwt_not_configured" }, { status: 503 });
    }
    throw error;
  }
}
