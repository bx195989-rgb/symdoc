-- Adds the 1-10 severity score to the cloud backup of symptom entries.
-- The existing mild/moderate/severe column stays as the derived band, so older rows
-- and anything reading it are unaffected. Nullable: pre-slider entries have no score.
--
-- Run once in the Supabase SQL editor for the Sydney project. Safe to re-run.
-- Run migration_symptom_entries_backup.sql first if you haven't already.

alter table symptom_entries
  add column if not exists severity_score smallint
  check (severity_score is null or severity_score between 1 and 10);
