// The span the מסע התורה slider covers. Kept in its own tiny module so the
// journey store (imported by the always-loaded map legend) does not pull the
// whole journey model into the main bundle.
export const JOURNEY_START = -1500
export const JOURNEY_END = 2025

export function clampYear(y: number): number {
  return Math.max(JOURNEY_START, Math.min(JOURNEY_END, y))
}
