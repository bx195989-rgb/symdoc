import { Severity } from '@/types';

export const MIN_SCORE = 1;
export const MAX_SCORE = 10;
export const DEFAULT_SCORE = 3;

// 1-3 mild, 4-7 moderate, 8-10 severe. The band is stored alongside the score so
// colours, reports, the clinic portal and older data all keep working unchanged.
export function scoreToSeverity(score: number): Severity {
  if (score <= 3) return 'mild';
  if (score <= 7) return 'moderate';
  return 'severe';
}

// Representative score for entries logged before the 1-10 slider existed.
const LEGACY_SCORE: Record<Severity, number> = { mild: 2, moderate: 5, severe: 9 };

export function getScore(e: { severity: Severity; severityScore?: number }): number {
  return e.severityScore ?? LEGACY_SCORE[e.severity];
}

export function severityLabel(s: Severity): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
