-- Data deletion policy: when a patient deletes their own account, reports they've
-- already shared with a clinic should NOT disappear from that clinic's dashboard.
-- GPs have their own record-retention obligations independent of what a patient
-- does with their tracker account, so we sever the link instead of cascading the
-- delete: shared_reports.patient_id becomes NULL, but patient_name/patient_dob
-- (already denormalized onto the row) stay intact so the clinic still has an
-- identifiable record. The clinic portal labels these as "Account closed".
--
-- Run this once in the Supabase SQL editor for the Sydney project
-- (ouyzywnqbswmjpkhogiz). Safe to re-run.

alter table shared_reports alter column patient_id drop not null;

alter table shared_reports drop constraint if exists shared_reports_patient_id_fkey;

alter table shared_reports
  add constraint shared_reports_patient_id_fkey
  foreign key (patient_id) references auth.users(id) on delete set null;

-- Note: if the constraint above wasn't actually named shared_reports_patient_id_fkey,
-- find its real name first with:
--   select conname from pg_constraint where conrelid = 'shared_reports'::regclass;
-- then drop that instead before re-running the add constraint statement.
