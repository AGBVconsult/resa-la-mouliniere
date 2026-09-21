import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConvexJwtConfigError, signConvexToken } from "@/lib/convex-jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * Mint a short-lived Convex JWT for the current NextAuth session.
 * Called by `ConvexClientProvider` through `fetchAccessToken`.
 */
export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string | null; name?: string | null; role?: string } | undefined;

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: NO_STORE });
  }

  const role = user.role === "staff" || user.role === "manager" || user.role === "admin" || user.role === "owner"
    ? user.role
    : "staff";

  try {
    const { token, expiresAt } = await signConvexToken({
      sub: user.id ?? user.email ?? "admin",
      role,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
    });
    return NextResponse.json({ token, expiresAt }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ConvexJwtConfigError) {
      console.error("[convex-token] configuration error:", error.message);
      return NextResponse.json({ error: "convex_jwt_not_configured" }, { status: 503, headers: NO_STORE });
    }
    console.error("[convex-token] signing failed");
    return NextResponse.json({ error: "signing_failed" }, { status: 500, headers: NO_STORE });
  }
}
