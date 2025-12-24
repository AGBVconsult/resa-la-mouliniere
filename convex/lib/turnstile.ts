/**
 * Turnstile verification helper.
 * ONLY to be used from action() — never from query() or mutation().
 */

export interface TurnstileResult {
  success: boolean;
  errorCodes?: string[];
  reason?: "network" | "missing-secret" | "missing-token";
}

/**
 * Verify a Turnstile token against Cloudflare's siteverify endpoint.
 * Returns { success: false } if secretKey is empty/placeholder.
 * Never logs token or secretKey.
 */
export async function verifyTurnstile(
  token: string,
  secretKey: string
): Promise<TurnstileResult> {
  // If secret is missing or placeholder, fail immediately (never log secret)
  if (!secretKey || secretKey === "placeholder" || secretKey.startsWith("0x")) {
    return { success: false, errorCodes: ["missing-secret"], reason: "missing-secret" };
  }

  if (!token) {
    return { success: false, errorCodes: ["missing-input-response"], reason: "missing-token" };
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }),
      }
    );

    const result = await response.json() as {
      success: boolean;
      "error-codes"?: string[];
    };

    return {
      success: result.success === true,
      errorCodes: result["error-codes"],
    };
  } catch {
    // Never log the error details (may contain sensitive info)
    return { success: false, errorCodes: ["network-error"], reason: "network" };
  }
}
