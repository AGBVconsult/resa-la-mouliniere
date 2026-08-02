/**
 * Pure function for auto-release logic.
 * Determines if a reservation should be auto-released based on elapsed time.
 */

export const AUTO_RELEASE_DELAY_MS = 90 * 60 * 1000; // 90 minutes

interface ShouldAutoReleaseParams {
  status: string;
  seatedAt: number | null | undefined;
  slotStartAt: number;
  now: number;
  hasTable: boolean;
}

/**
 * Determines whether a reservation should be auto-released.
 * 
 * Two branches:
 * - B1 (seated): now - seatedAt >= 90 min
 * - B2 (confirmed/cardPlaced with table, never arrived): now - slotStartAt >= 90 min
 * 
 * @returns { shouldRelease: boolean; reason: string } 
 */
export function shouldAutoRelease({
  status,
  seatedAt,
  slotStartAt,
  now,
  hasTable,
}: ShouldAutoReleaseParams): { shouldRelease: boolean; reason: string } {
  // B1: Client is seated
  if (status === "seated" && seatedAt) {
    if (now - seatedAt >= AUTO_RELEASE_DELAY_MS) {
      return { shouldRelease: true, reason: "auto_release_seated" };
    }
  }

  // B2: Client never arrived but table assigned
  if ((status === "confirmed" || status === "cardPlaced") && hasTable) {
    if (now - slotStartAt >= AUTO_RELEASE_DELAY_MS) {
      return { shouldRelease: true, reason: "auto_release_not_arrived" };
    }
  }

  return { shouldRelease: false, reason: "" };
}
