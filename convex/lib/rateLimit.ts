import { MutationCtx, QueryCtx } from "../_generated/server";
import { Errors } from "./errors";

/**
 * Rate limiting basé sur IP/identifiant
 * Utilise une table rateLimits pour stocker les compteurs
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  identifier: string;
  count: number;
  windowStart: number;
}

/**
 * Extrait l'identifiant pour le rate limiting
 * Utilise l'IP du client ou un identifiant de session
 */
function getIdentifier(ctx: QueryCtx | MutationCtx): string {
  // En Convex, on n'a pas accès direct à l'IP
  // On utilise un hash basé sur le timestamp + random pour les requêtes anonymes
  // Pour les utilisateurs authentifiés, on utilise leur ID
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Vérifie le rate limit pour une action donnée
 * Note: Cette implémentation est simplifiée car Convex ne permet pas
 * d'accéder à l'IP du client directement. En production, le rate limiting
 * devrait être géré au niveau du CDN (Cloudflare, Vercel Edge, etc.)
 * 
 * Cette fonction sert principalement de protection contre les abus
 * via le token Turnstile qui est déjà implémenté.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  action: string,
  config: RateLimitConfig,
  identifier?: string
): Promise<void> {
  // Le rate limiting côté Convex est limité car on n'a pas accès à l'IP
  // La protection principale est assurée par Turnstile (CAPTCHA)
  // Cette fonction est un placeholder pour une future implémentation
  // avec un service externe ou une table de rate limits
  
  // Pour l'instant, on fait confiance à Turnstile pour la protection bot
  // et on ne bloque pas les requêtes ici
  return;
}

/**
 * Vérifie si une requête dépasse le rate limit
 * Retourne true si la requête est autorisée, false sinon
 */
export function isWithinRateLimit(
  requests: number,
  windowStart: number,
  config: RateLimitConfig
): boolean {
  const now = Date.now();
  
  // Si la fenêtre est expirée, on repart à zéro
  if (now - windowStart > config.windowMs) {
    return true;
  }
  
  // Vérifier si on est sous la limite
  return requests < config.maxRequests;
}
