import { describe, expect, test } from "vitest";

import { SettingsPublicSchema } from "../spec/contracts.generated";
import { buildSettingsPublic } from "../convex/widget";

describe("widget.getSettings", () => {
  test("returns public settings without secrets", async () => {
    const result = buildSettingsPublic({
      restaurant: { _id: "r1", timezone: "Europe/Brussels" },
      settings: {
        publicWidgetEnabled: true,
        turnstileSiteKey: "site",
        maxPartySizeWidget: 15,
      },
    });

    const parsed = SettingsPublicSchema.parse(result);

    expect(parsed.timezone).toBe("Europe/Brussels");
    expect(parsed.publicWidgetEnabled).toBe(true);
    expect(parsed.turnstileSiteKey).toBe("site");
    expect(parsed.maxPartySizeWidget).toBe(15);
    expect(parsed.restaurantId).toBe("r1");

    expect(parsed).not.toHaveProperty("turnstileSecretKey");
    expect(parsed).not.toHaveProperty("resendFromEmail");
    expect(parsed).not.toHaveProperty("resendFromName");
  });
});
