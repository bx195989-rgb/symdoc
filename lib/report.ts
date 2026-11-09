import { LogEntry, Severity } from '@/types';
import { getScore } from '@/lib/severity';

export type DateRangeOption = '7' | '14' | '30' | 'all';

export const DATE_RANGE_LABELS: Record<DateRangeOption, string> = {
  '7': 'Last week',
  '14': 'Last 2 weeks',
  '30': 'Last month',
  all: 'All time',
};

const ONGOING_WINDOW_DAYS = 3;

export function filterByRange(entries: LogEntry[], range: DateRangeOption): LogEntry[] {
  if (range === 'all') return entries;
  const days = parseInt(range, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entries.filter((e) => new Date(e.loggedAt) >= cutoff);
}

// Worst-case entry across the group. Using the peak rather than the most common
// value avoids under-representing risk in the GP-facing report: a single severe
// episode among several mild ones should never get buried by averaging it away.
function peakEntry(entries: LogEntry[]): LogEntry {
  return entries.reduce((worst, e) => (getScore(e) > getScore(worst) ? e : worst), entries[0]);
}

export type SymptomSummary = {
  symptom: string;
  count: number;
  severity: Severity; // peak/worst severity band seen for this symptom
  peakScore?: number; // peak 1-10 score (absent if only pre-slider entries)
  lastSeverity: Severity; // severity band of the most recent episode
  lastScore?: number; // 1-10 score of the most recent episode, if it has one
  firstSeen: string;
  lastSeen: string;
  ongoing: boolean;
  contexts: string[];
  notes: string[];
};

export function summarizeBySymptom(entries: LogEntry[]): SymptomSummary[] {
  const groups: Record<string, LogEntry[]> = {};
  entries.forEach((e) => {
    if (!groups[e.symptom]) groups[e.symptom] = [];
    groups[e.symptom].push(e);
  });

  const now = new Date();

  return Object.entries(groups)
    .map(([symptom, group]) => {
      const sorted = [...group].sort(
        (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
      );
      const last = sorted[sorted.length - 1];
      const daysSinceLast =
        (now.getTime() - new Date(last.loggedAt).getTime()) / (1000 * 60 * 60 * 24);

      const peak = peakEntry(group);

      return {
        symptom,
        count: group.length,
        severity: peak.severity,
        peakScore: peak.severityScore,
        lastSeverity: last.severity,
        lastScore: last.severityScore,
        firstSeen: sorted[0].loggedAt,
        lastSeen: last.loggedAt,
        ongoing: daysSinceLast <= ONGOING_WINDOW_DAYS,
        contexts: [...new Set(group.map((e) => e.onsetContext).filter(Boolean))],
        notes: [...new Set(group.map((e) => e.note).filter(Boolean))],
      };
    })
    .sort((a, b) => b.count - a.count);
}

export type CoOccurrence = {
  symptoms: string[];
  count: number;
};

export function findCoOccurring(entries: LogEntry[]): CoOccurrence[] {
  const sessions: Record<string, Set<string>> = {};
  entries.forEach((e) => {
    if (!sessions[e.sessionId]) sessions[e.sessionId] = new Set();
    sessions[e.sessionId].add(e.symptom);
  });

  const pairCounts: Record<string, number> = {};
  Object.values(sessions).forEach((set) => {
    const symptoms = [...set];
    if (symptoms.length < 2) return;
    const key = symptoms.sort().join(' + ');
    pairCounts[key] = (pairCounts[key] || 0) + 1;
  });

  return Object.entries(pairCounts)
    .map(([key, count]) => ({ symptoms: key.split(' + '), count }))
    .sort((a, b) => b.count - a.count);
}

export function buildSummaryLine(summaries: SymptomSummary[], coOccurring: CoOccurrence[]): string {
  if (summaries.length === 0) return 'No symptoms logged in this period.';

  const top = summaries[0];
  const rangeDays = Math.max(
    1,
    Math.round(
      (new Date(top.lastSeen).getTime() - new Date(top.firstSeen).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  let line = `${top.count} ${top.symptom.toLowerCase()} episode${top.count > 1 ? 's' : ''}`;
  line += top.count > 1 ? ` over ${rangeDays} day${rangeDays !== 1 ? 's' : ''}` : '';
  line += `, peak severity ${top.severity}${top.peakScore != null ? ` (${top.peakScore}/10)` : ''}`;
  if (top.lastSeverity !== top.severity || (top.lastScore != null && top.lastScore !== top.peakScore)) {
    line += `, most recently ${top.lastSeverity}${top.lastScore != null ? ` (${top.lastScore}/10)` : ''}`;
  }
  line += '.';

  const pairWithTop = coOccurring.find((c) => c.symptoms.includes(top.symptom));
  if (pairWithTop) {
    const other = pairWithTop.symptoms.find((s) => s !== top.symptom);
    line += ` Often appears with ${other?.toLowerCase()}.`;
  }

  line += top.ongoing ? ' Currently ongoing.' : ' Not reported recently.';

  return line;
}
