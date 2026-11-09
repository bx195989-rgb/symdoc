import { supabase } from './supabaseClient';

export async function createShare(report: unknown, clinicCode: string) {
  const { data, error } = await supabase.rpc('create_share', {
    p_report: report,
    p_clinic_code: clinicCode.toUpperCase().trim(),
  });
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Could not share report.');

  const { clinic_id: clinicId, clinic_name: clinicName } = data[0];

  // Remember this clinic for next time (best-effort, don't block on failure).
  const { data: sessionData } = await supabase.auth.getSession();
  const patientId = sessionData.session?.user.id;
  if (patientId) {
    await supabase.from('patient_saved_clinics').upsert(
      {
        patient_id: patientId,
        clinic_id: clinicId,
        clinic_name: clinicName,
        clinic_code: clinicCode.toUpperCase().trim(),
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id,clinic_id' }
    );
  }

  return { clinicName: clinicName as string };
}

export type SavedClinic = {
  clinic_id: string;
  clinic_name: string;
  clinic_code: string;
  last_used_at: string;
};

export async function getSavedClinics(patientId: string): Promise<SavedClinic[]> {
  const { data, error } = await supabase
    .from('patient_saved_clinics')
    .select('clinic_id, clinic_name, clinic_code, last_used_at')
    .eq('patient_id', patientId)
    .order('last_used_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteSavedClinic(patientId: string, clinicId: string) {
  const { error } = await supabase
    .from('patient_saved_clinics')
    .delete()
    .eq('patient_id', patientId)
    .eq('clinic_id', clinicId);
  if (error) throw error;
}

export type SharedReport = {
  id: string;
  created_at: string;
  clinic_code: string;
  report: any;
  redeemed_by_clinic: string | null;
};

export async function getMySharedReports(patientId: string): Promise<SharedReport[]> {
  const { data, error } = await supabase
    .from('shared_reports')
    .select('id, created_at, clinic_code, report, redeemed_by_clinic')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteSharedReport(reportId: string) {
  const { error } = await supabase.from('shared_reports').delete().eq('id', reportId);
  if (error) throw error;
}
