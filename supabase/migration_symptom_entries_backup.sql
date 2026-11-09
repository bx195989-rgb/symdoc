-- Optional cloud backup for a signed-in patient's raw symptom log entries.
-- This is separate from shared_reports: these rows are the patient's own private
-- data (not something a clinic needs to retain), so unlike shared_reports this
-- table cascade-deletes when the patient deletes their account.
--
-- Logging without an account is unaffected — entries only sync here once a
-- patient is signed in.
--
-- Run this once in the Supabase SQL editor for the Sydney project.

create table if not exists symptom_entries (
  id text primary key,
  patient_id uuid not null references auth.users(id) on delete cascade,
  symptom text not null,
  severity text not null check (severity in ('mild', 'moderate', 'severe')),
  note text default '',
  onset_context text default '',
  session_id text not null,
  logged_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists symptom_entries_patient_id_idx on symptom_entries (patient_id);

alter table symptom_entries enable row level security;

drop policy if exists "patients manage own symptom entries" on symptom_entries;
create policy "patients manage own symptom entries"
  on symptom_entries
  for all
  to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());
