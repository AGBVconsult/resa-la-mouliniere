/**
 * Fournisseur d'identité de Convex.
 *
 * L'application Next.js signe un JWT RS256 pour la session NextAuth courante
 * (`/api/auth/convex-token`) et publie la clé de vérification sur
 * `/.well-known/jwks.json`. Convex vérifie chaque jeton contre ce JWKS.
 *
 * Variable requise sur le déploiement Convex :
 *   CONVEX_AUTH_ISSUER = origine publique de l'app Next, sans slash final
 *                        (ex. https://resa-la-mouliniere.vercel.app)
 * Elle doit être identique à la valeur configurée côté Next.js.
 *
 * Sans cette variable, aucun fournisseur n'est déclaré : toute fonction admin
 * répondra FORBIDDEN (sauf coupe-circuit CONVEX_AUTH_ENFORCEMENT=off).
 */

const issuer = process.env.CONVEX_AUTH_ISSUER?.replace(/\/+$/, "");

if (!issuer) {
  console.warn(
    "[auth.config] CONVEX_AUTH_ISSUER absent : aucun fournisseur JWT déclaré, l'administration sera inaccessible."
  );
}

const authConfig = {
  providers: issuer
    ? [
        {
          type: "customJwt",
          applicationID: "convex",
          issuer,
          jwks: `${issuer}/.well-known/jwks.json`,
          algorithm: "RS256",
        },
      ]
    : [],
};

export default authConfig;
