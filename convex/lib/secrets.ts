/**
 * Résolution des secrets et paramètres sensibles.
 *
 * Source de vérité : les variables d'environnement du déploiement Convex.
 * La table `settings` ne sert plus que de repli le temps de la migration ;
 * une fois les variables définies, ses champs secrets peuvent être vidés.
 *
 * Variables (dashboard Convex → Settings → Environment Variables) :
 *   TURNSTILE_SECRET_KEY   clé secrète Cloudflare Turnstile
 *   RESEND_API_KEY         clé API Resend
 *   PUSHOVER_USER_KEY      clé utilisateur Pushover
 *   PUSHOVER_API_TOKEN     jeton d'application Pushover
 *   APP_URL                origine publique de l'app (liens des e-mails), sans slash final
 *
 * Fonction pure, testable sans runtime Convex.
 */

export type SecretSettingsDoc = {
  appUrl?: string;
  turnstileSecretKey: string;
  resendApiKey?: string;
  pushoverUserKey?: string;
  pushoverApiToken?: string;
};

export type EnvLike = Record<string, string | undefined>;

export type ResolvedSecrets = {
  appUrl: string;
  turnstileSecretKey: string;
  resendApiKey: string | undefined;
  pushoverUserKey: string | undefined;
  pushoverApiToken: string | undefined;
  /** Quels secrets proviennent encore de la base (aide au diagnostic, sans valeur). */
  fromDatabase: string[];
};

function pick(envValue: string | undefined, dbValue: string | undefined): { value: string | undefined; fromDb: boolean } {
  const env = envValue?.trim();
  if (env) return { value: env, fromDb: false };
  const db = dbValue?.trim();
  return { value: db || undefined, fromDb: !!db };
}

export function resolveSecrets(settings: SecretSettingsDoc, env: EnvLike): ResolvedSecrets {
  const fromDatabase: string[] = [];

  const turnstile = pick(env.TURNSTILE_SECRET_KEY, settings.turnstileSecretKey);
  if (turnstile.fromDb) fromDatabase.push("turnstileSecretKey");

  const resend = pick(env.RESEND_API_KEY, settings.resendApiKey);
  if (resend.fromDb) fromDatabase.push("resendApiKey");

  const pushoverUser = pick(env.PUSHOVER_USER_KEY, settings.pushoverUserKey);
  if (pushoverUser.fromDb) fromDatabase.push("pushoverUserKey");

  const pushoverToken = pick(env.PUSHOVER_API_TOKEN, settings.pushoverApiToken);
  if (pushoverToken.fromDb) fromDatabase.push("pushoverApiToken");

  const appUrl = pick(env.APP_URL, settings.appUrl);
  if (appUrl.fromDb) fromDatabase.push("appUrl");

  return {
    appUrl: (appUrl.value ?? "").replace(/\/+$/, ""),
    turnstileSecretKey: turnstile.value ?? "",
    resendApiKey: resend.value,
    pushoverUserKey: pushoverUser.value,
    pushoverApiToken: pushoverToken.value,
    fromDatabase,
  };
}
