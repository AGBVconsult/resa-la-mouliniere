import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/auth";
import { getSigningMaterial, CONVEX_AUDIENCE, ALGORITHM } from "@/lib/convex-auth/keys";

export const dynamic = "force-dynamic";

/** Durée de vie d'un jeton. Le client Convex le renouvelle automatiquement. */
const TOKEN_TTL = "1h";

/**
 * Émet un JWT Convex pour la session NextAuth courante.
 * Appelé par le client Convex (`ConvexProviderWithAuth`) depuis les pages admin.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;

  if (!session || !email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const role = (session.user as { role?: string }).role ?? "staff";

  try {
    const { privateKey, kid, issuer } = await getSigningMaterial();

    const token = await new SignJWT({ role, email, name: session.user?.name ?? undefined })
      .setProtectedHeader({ alg: ALGORITHM, kid, typ: "JWT" })
      .setIssuer(issuer)
      .setAudience(CONVEX_AUDIENCE)
      .setSubject(email)
      .setIssuedAt()
      .setExpirationTime(TOKEN_TTL)
      .sign(privateKey);

    return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Ne jamais journaliser la clé ; le message d'erreur ne contient que le nom de la variable manquante.
    console.error("[convex-token] configuration invalide:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "auth_bridge_misconfigured" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
