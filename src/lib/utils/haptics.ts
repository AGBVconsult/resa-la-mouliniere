/**
 * Haptic feedback utilities for touch devices
 */

type HapticPattern = "grab" | "drop" | "error";

const patterns: Record<HapticPattern, number | number[]> = {
  grab: 50,
  drop: [30, 50],
  error: [100, 50, 100],
};

export function triggerHaptic(pattern: HapticPattern): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;

  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    // Silently fail for unsupported browsers
  }
}
