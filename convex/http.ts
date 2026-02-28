import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Webhook pour recevoir les réponses email des clients (Resend Inbound).
 * 
 * Configuration requise dans Resend:
 * 1. Ajouter un domaine inbound (ex: inbound.lamouliniere.be)
 * 2. Configurer le MX record DNS
 * 3. Pointer le webhook vers: https://<convex-deployment>.convex.site/inbound-email
 */
http.route({
  path: "/inbound-email",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();

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
