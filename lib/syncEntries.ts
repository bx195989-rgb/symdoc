import { supabase } from './supabaseClient';
import { LogEntry } from '@/types';

// Cloud backup for a signed-in patient's raw symptom logs. This is separate from
// shared_reports (which clinics retain even after account deletion) — these rows
// are the patient's own private data, cascade-deleted with their account, and only
// ever synced while they're logged in. Logging without an account stays fully
// local-only, unchanged from before.

function toRow(entry: LogEntry, patientId: string) {
  return {
    id: entry.id,
    patient_id: patientId,
    symptom: entry.symptom,
    severity: entry.severity,
    severity_score: entry.severityScore ?? null,
    note: entry.note,
    onset_context: entry.onsetContext,
    session_id: entry.sessionId,
    logged_at: entry.loggedAt,
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row: any): LogEntry {
  return {
    id: row.id,
    symptom: row.symptom,
    severity: row.severity,
    severityScore: row.severity_score ?? undefined,
    note: row.note ?? '',
    onsetContext: row.onset_context ?? '',
    loggedAt: row.logged_at,
    sessionId: row.session_id,
  };
}

export async function pullCloudEntries(patientId: string): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from('symptom_entries')
    .select('*')
    .eq('patient_id', patientId);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function pushEntryToCloud(entry: LogEntry, patientId: string) {
  const { error } = await supabase.from('symptom_entries').upsert(toRow(entry, patientId));
  if (error) throw error;
}

export async function pushAllEntriesToCloud(entries: LogEntry[], patientId: string) {
  if (entries.length === 0) return;
  const rows = entries.map((e) => toRow(e, patientId));
  const { error } = await supabase.from('symptom_entries').upsert(rows);
  if (error) throw error;
}

export async function deleteEntryFromCloud(id: string) {
  const { error } = await supabase.from('symptom_entries').delete().eq('id', id);
  if (error) throw error;
}
