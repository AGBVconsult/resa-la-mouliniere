/**
 * Resend email client.
 * ONLY to be used from action() or internalAction() — never from query() or mutation().
 * 
 * Never logs: to, from, apiKey, html content, or any PII.
 */

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Send an email via Resend API.
 * 
 * @returns { success: true, messageId } on success
 * @returns { success: false, errorCode } on failure
 * 
 * Error codes:
 * - "API_KEY_NOT_CONFIGURED" - apiKey is empty or placeholder
 * - "HTTP_<status>" - HTTP error from Resend
 * - "NETWORK_ERROR" - Network/fetch error
 */
export async function sendEmail(
  apiKey: string,
  params: SendEmailParams
): Promise<SendEmailResult> {
  // Check API key (never log it)
  if (!apiKey || apiKey === "placeholder" || apiKey.startsWith("REPLACE")) {
    return { success: false, errorCode: "API_KEY_NOT_CONFIGURED" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        reply_to: "info@lamouliniere.be",
      }),
    });

    if (!response.ok) {
      // Log status code only (no body content which may contain PII)
      console.log("Resend API error", { status: response.status });
      return { success: false, errorCode: `HTTP_${response.status}` };
    }

    const result = await response.json() as { id?: string };

    return {
      success: true,
      messageId: result.id,
    };
  } catch {
    // Never log the error details (may contain sensitive info)
    return { success: false, errorCode: "NETWORK_ERROR" };
  }
}
