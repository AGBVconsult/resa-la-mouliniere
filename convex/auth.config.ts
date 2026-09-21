/**
 * Convex authentication configuration.
 *
 * The admin interfaces authenticate with NextAuth (credentials). NextAuth
 * session cookies are encrypted JWE tokens that Convex cannot verify, so the
 * Next.js app mints a short-lived RS256 JWT for Convex at `/api/convex/token`
 * and publishes the matching public key at `/api/convex/jwks`.
 *
 * Convex validates every `ctx.auth.getUserIdentity()` against that JWKS.
 *
 * Required Convex environment variable (Convex dashboard → Settings → Environment
 * variables, or `npx convex env set CONVEX_AUTH_ISSUER https://resa.example.be`):
 *   CONVEX_AUTH_ISSUER  — public origin of the Next.js app, without trailing slash.
 *                         Must be identical to the value used by the Next.js app.
 *
 * This file is evaluated when the functions are pushed (`convex dev` / `convex deploy`).
 * A missing issuer fails the push on purpose: deploying without it would silently
 * leave every admin function unreachable.
 */

const issuer = process.env.CONVEX_AUTH_ISSUER?.replace(/\/+$/, "");

if (!issuer) {
  throw new Error(
    "CONVEX_AUTH_ISSUER is not set on this Convex deployment. " +
      "Set it to the public origin of the Next.js app (e.g. https://resa.lamouliniere.be)."
  );
}

const authConfig = {
  providers: [
    {
      type: "customJwt",
      applicationID: "convex",
      issuer,
      jwks: `${issuer}/api/convex/jwks`,
      algorithm: "RS256",
    },
  ],
};

export default authConfig;
