import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifySvixSignature } from "./lib/svix";

const http = httpRouter();

/**
 * Webhook pour recevoir les réponses email des clients (Resend Inbound).
 *
 * Configuration requise dans Resend:
 * 1. Ajouter un domaine inbound (ex: inbound.lamouliniere.be)
 * 2. Configurer le MX record DNS
 * 3. Pointer le webhook vers: https://<convex-deployment>.convex.site/inbound-email
 * 4. Copier le "Signing secret" (whsec_…) du webhook dans la variable
 *    d'environnement Convex `RESEND_WEBHOOK_SECRET`.
 *
 * Sécurité : sans secret configuré ou sans signature valide, la requête est
 * rejetée (fail-closed). Auparavant n'importe qui pouvait injecter un message
 * dans la fiche CRM d'un client en forgeant le champ `from`.
 */
http.route({
  path: "/inbound-email",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Inbound email webhook rejected: RESEND_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody = await request.text();
    const svixHeaders = {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    };
    if (!(await verifySvixSignature(svixHeaders, rawBody, webhookSecret))) {
      console.warn("Inbound email webhook rejected: invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = JSON.parse(rawBody);

      // Resend inbound webhook payload
      const fromEmail = body.from?.toLowerCase()?.trim();
      const textBody = body.text || body.stripped_text || "";
      const subject = body.subject || "";

      if (!fromEmail || !textBody.trim()) {
        return new Response(JSON.stringify({ error: "Missing from or body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Find client by email
      const client = await ctx.runQuery(internal.clientMessages._findClientByEmail, {
        email: fromEmail,
      });

      if (!client) {
        console.log("Inbound email from unknown client", { fromEmail: fromEmail.substring(0, 3) + "***" });
        return new Response(JSON.stringify({ ok: true, matched: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Store inbound message
      // Clean the reply text (remove quoted content)
      const cleanBody = stripQuotedReply(textBody);

      await ctx.runMutation(internal.clientMessages.addInboundMessage, {
        clientId: client._id,
        body: cleanBody || textBody.trim(),
      });

      return new Response(JSON.stringify({ ok: true, matched: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Inbound email webhook error");
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

/**
 * Strip quoted reply content from email text.
 * Removes lines starting with ">" and common reply markers.
 */
function stripQuotedReply(text: string): string {
  const lines = text.split("\n");
  const cleanLines: string[] = [];

  for (const line of lines) {
    // Stop at common reply markers
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
