import { query, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { sendEmail } from "./lib/email/resend";

/**
 * List messages for a client (ordered by createdAt asc for chat display).
 */
export const list = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, { clientId }) => {
    const messages = await ctx.db
      .query("clientMessages")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .collect();

    return messages.map((m) => ({
      _id: m._id,
      direction: m.direction,
      body: m.body,
      emailStatus: m.emailStatus,
      createdAt: m.createdAt,
      sentBy: m.sentBy,
    }));
  },
});

/**
 * Internal mutation to store a message record.
 */
export const _insertMessage = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    clientId: v.id("clients"),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    body: v.string(),
    emailMessageId: v.optional(v.string()),
    emailTo: v.optional(v.string()),
    emailStatus: v.optional(v.union(v.literal("sent"), v.literal("delivered"), v.literal("failed"))),
    sentBy: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clientMessages", args);
  },
});

/**
 * Send a message to a client via email.
 * Creates the message record and sends the email.
 */
export const send = action({
  args: {
    clientId: v.id("clients"),
    body: v.string(),
  },
  handler: async (ctx, { clientId, body }) => {
    const now = Date.now();

    // Get settings
    const settings = await ctx.runMutation(internal.settings.getSecretsInternal, {});
    if (!settings || !settings.resendApiKey) {
      throw new Error("Email settings not configured");
    }

    // Get client info
    const client = await ctx.runQuery(internal.clientMessages._getClient, { clientId });
    if (!client) {
      throw new Error("Client not found");
    }

    const clientEmail = client.email;
    if (!clientEmail) {
      throw new Error("Client has no email address");
    }

    const clientName = [client.firstName, client.lastName].filter(Boolean).join(" ") || "Client";
    const fromName = settings.resendFromName ?? "La Moulinière";
    const fromEmail = settings.resendFromEmail ?? "no-reply@lamouliniere.be";

    // Build HTML email (clean, simple style)
    const html = buildMessageEmailHtml(body, clientName, fromName);

    // Send email via Resend
    const result = await sendEmail(settings.resendApiKey, {
      from: `${fromName} <${fromEmail}>`,
      to: clientEmail,
      subject: `Message de ${fromName}`,
      html,
      reply_to: "info@lamouliniere.be",
    });

    // Store message
    await ctx.runMutation(internal.clientMessages._insertMessage, {
      restaurantId: settings.restaurantId,
      clientId,
      direction: "outbound",
      body,
      emailMessageId: result.messageId,
      emailTo: clientEmail,
      emailStatus: result.success ? "sent" : "failed",
      createdAt: now,
    });

    return { success: result.success, messageId: result.messageId };
  },
});

/**
 * Internal query to get client info for email sending.
 */
export const _getClient = internalQuery({
  args: { clientId: v.id("clients") },
  handler: async (ctx, { clientId }) => {
    const client = await ctx.db.get(clientId);
    if (!client) return null;
    return {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      primaryPhone: client.primaryPhone,
    };
  },
});

/**
 * Find a client by email address (for inbound webhook matching).
 */
export const _findClientByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalizedEmail = email.toLowerCase().trim();

    // Search through clients — check email and emails array
    const allClients = await ctx.db.query("clients").collect();
    for (const client of allClients) {
      if (client.email?.toLowerCase().trim() === normalizedEmail) {
        return { _id: client._id };
      }
      if (client.emails) {
        for (const e of client.emails) {
          if (e.toLowerCase().trim() === normalizedEmail) {
            return { _id: client._id };
          }
        }
      }
    }
    return null;
  },
});

/**
 * Store an inbound reply (called from HTTP webhook or manually).
 */
export const addInboundMessage = internalMutation({
  args: {
    clientId: v.id("clients"),
    body: v.string(),
    emailMessageId: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, body, emailMessageId }) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) throw new Error("No active restaurant");

    await ctx.db.insert("clientMessages", {
      restaurantId: restaurant._id,
      clientId,
      direction: "inbound",
      body,
      emailMessageId,
      emailStatus: "delivered",
      createdAt: Date.now(),
    });
  },
});

/**
 * Build a clean HTML email for a direct message.
 */
function buildMessageEmailHtml(body: string, clientName: string, restaurantName: string): string {
  const escapedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#0f172a;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${restaurantName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#64748b;font-size:14px;">Bonjour ${clientName},</p>
              <div style="margin:0 0 24px;color:#0f172a;font-size:15px;line-height:1.6;">
                ${escapedBody}
              </div>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="margin:0;color:#94a3b8;font-size:13px;">
                Vous pouvez répondre directement à cet email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                ${restaurantName} &bull; Visserskaai 17, 8400 Ostende
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
