/**
 * Pushover API wrapper for push notifications.
 * https://pushover.net/api
 */

interface PushoverPayload {
  title: string;
  message: string;
  url?: string;
  url_title?: string;
  priority?: -2 | -1 | 0 | 1 | 2;  // -2=lowest, 0=normal, 1=high, 2=emergency
  sound?: string;
}

interface PushoverConfig {
  userKey: string;
  apiToken: string;
}

interface PushoverResult {
  success: boolean;
  error?: string;
}

/**
 * Send a push notification via Pushover API.
 * 
 * @param config - Pushover credentials (userKey + apiToken)
 * @param payload - Notification content
 * @returns Result with success status
 */
export async function sendPushNotification(
  config: PushoverConfig,
  payload: PushoverPayload
): Promise<PushoverResult> {
  try {
    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: config.apiToken,
        user: config.userKey,
        title: payload.title,
        message: payload.message,
        url: payload.url,
        url_title: payload.url_title ?? "Ouvrir",
        priority: payload.priority ?? 1,  // High priority by default
        sound: payload.sound ?? "pushover",
      }),
    });

    const data = await response.json();

    if (data.status !== 1) {
      console.error("[Pushover] Erreur:", data.errors);
      return { success: false, error: data.errors?.join(", ") };
    }

    return { success: true };
  } catch (error) {
    console.error("[Pushover] Exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
