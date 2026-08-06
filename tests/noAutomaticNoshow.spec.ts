import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Contract invariant (spec/CONTRACTS.md §7 and §12):
 * marking a guest as no-show is a human decision. No scheduled job may ever
 * write `status: "noshow"`.
 *
 * This is asserted at source level because the rule is about what the cron
 * code is *allowed to contain*, not about the output of a pure function:
 * a behavioural test would pass again the moment someone reintroduces the
 * transition behind a new condition.
 */

const CONVEX_DIR = join(__dirname, "..", "convex");

function read(file: string): string {
  return readFileSync(join(CONVEX_DIR, file), "utf-8");
}

/** Files reachable from crons.ts, i.e. executed without any human action. */
const SCHEDULED_JOB_FILES = ["jobs.ts", "emails.ts", "crm.ts"];

describe("no automatic noshow", () => {
  it.each(SCHEDULED_JOB_FILES)(
    "%s never writes status: noshow",
    (file) => {
      const source = read(file);
      // Matches `status: "noshow"` / `toStatus: "noshow"` in a patch/insert payload.
      const writesNoshow = /(?:to)?status\s*:\s*["']noshow["']/i.test(source);
      expect(writesNoshow).toBe(false);
    }
  );

  it.each(SCHEDULED_JOB_FILES)(
    "%s never stamps a no-show timestamp",
    (file) => {
      const source = read(file);
      // A literal-status check alone would miss a dynamic write (admin.ts assigns
      // `patch.status` from a variable). Any no-show write must stamp one of these.
      expect(source).not.toMatch(/\bnoshowAt\s*:/);
      expect(source).not.toMatch(/\bmarkedNoshowAt\s*:/);
    }
  );

  it("dailyFinalize no longer reports a confirmedToNoshow counter", () => {
    const source = read("jobs.ts");
    expect(source).not.toContain("confirmedToNoshow");
  });

  it("dailyFinalize still closes seated reservations (safety net)", () => {
    const source = read("jobs.ts");
    expect(source).toContain("seatedToCompleted");
  });

  it("crons.ts schedules dailyFinalize and the auto-release job", () => {
    const source = read("crons.ts");
    expect(source).toContain("internal.jobs.dailyFinalize");
    expect(source).toContain("internal.jobs.autoReleaseExpiredTables");
  });
});

describe("manual noshow stays possible", () => {
  it("the state machine still allows confirmed -> noshow", async () => {
    const { isValidStatusTransition } = await import("../convex/lib/stateMachine");
    expect(isValidStatusTransition("confirmed", "noshow")).toBe(true);
  });
});
