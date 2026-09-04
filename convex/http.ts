import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifySvixSignature } from "./lib/webhookSignature";

const http = httpRouter();

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/**
 * Webhook pour recevoir les réponses email des clients (Resend Inbound).
 *
 * Configuration requise dans Resend :
 * 1. Ajouter un domaine inbound (ex: inbound.lamouliniere.be) et son MX
 * 2. Pointer le webhook vers : https://<convex-deployment>.convex.site/inbound-email
 * 3. Copier le secret de signature du webhook (`whsec_…`) dans la variable
 *    d'environnement Convex RESEND_WEBHOOK_SECRET
 *
 * Sécurité : la requête est refusée (401) si la signature Svix est absente ou
 * invalide, et (503) si le secret n'est pas configuré. Sans cela, n'importe qui
 * pouvait injecter des « messages du client » dans le CRM en forgeant `from`.
 */
http.route({
  path: "/inbound-email",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();

    const verdict = await verifySvixSignature({
      secret: process.env.RESEND_WEBHOOK_SECRET,
      headers: {
        id: request.headers.get("svix-id"),
        timestamp: request.headers.get("svix-timestamp"),
        signature: request.headers.get("svix-signature"),
      },
      body: rawBody,
    });

    if (!verdict.ok) {
      if (verdict.reason === "bad-secret") {
        console.error("inbound-email: RESEND_WEBHOOK_SECRET absent ou invalide — webhook désactivé");
        return json(503, { error: "webhook_not_configured" });
      }
      console.warn("inbound-email: signature refusée", { reason: verdict.reason });
      return json(401, { error: "invalid_signature" });
    }

    try {
      const body = JSON.parse(rawBody) as Record<string, unknown>;
      // Resend enveloppe les événements dans `data` ; on accepte aussi un corps plat.
      const payload = (body.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>;

      const fromRaw = typeof payload.from === "string" ? payload.from : "";
      const fromEmail = extractEmailAddress(fromRaw);
      const textBody = String(payload.text ?? payload.stripped_text ?? "");

      if (!fromEmail || !textBody.trim()) {
        return json(400, { error: "Missing from or body" });
      }

      const client = await ctx.runQuery(internal.clientMessages._findClientByEmail, { email: fromEmail });

      if (!client) {
        console.log("Inbound email from unknown client", { fromEmail: fromEmail.substring(0, 3) + "***" });
        return json(200, { ok: true, matched: false });
      }

      const cleanBody = stripQuotedReply(textBody);

      await ctx.runMutation(internal.clientMessages.addInboundMessage, {
        clientId: client._id,
        body: (cleanBody || textBody.trim()).slice(0, 5000),
        emailMessageId: typeof payload.email_id === "string" ? payload.email_id : undefined,
      });

      return json(200, { ok: true, matched: true });
    } catch (err) {
      console.error("Inbound email webhook error", { message: err instanceof Error ? err.message : "unknown" });
      return json(500, { error: "Internal error" });
    }
  }),
});

/** `"Jean Dupont <jean@example.com>"` → `jean@example.com` (minuscules). */
function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  const addr = (match ? match[1] : from).trim().toLowerCase();
  return addr.includes("@") ? addr : "";
}

/**
 * Strip quoted reply content from email text.
 * Removes lines starting with ">" and common reply markers.
 */
function stripQuotedReply(text: string): string {
  const lines = text.split("\n");
  const cleanLines: string[] = [];

  for (const line of lines) {
    if (
      line.startsWith(">") ||
      line.match(/^On .+ wrote:$/i) ||
      line.match(/^Le .+ a écrit\s?:$/i) ||
      line.match(/^-{3,}/) ||
      line.match(/^_{3,}/) ||
      line.includes("wrote:") ||
      line.includes("a écrit")
    ) {
      break;
    }
    cleanLines.push(line);
  }

  return cleanLines.join("\n").trim();
}

export default http;
