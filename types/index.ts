export type Severity = 'mild' | 'moderate' | 'severe';

export type LogEntry = {
  id: string;
  symptom: string;
  severity: Severity; // band derived from severityScore (kept so older entries/reports keep working)
  severityScore?: number; // 1 to 10; absent on entries logged before the slider existed
  note: string;
  onsetContext: string;
  loggedAt: string; // ISO timestamp
  sessionId: string; // groups symptoms logged together in one sitting
};
