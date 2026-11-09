import { supabase } from './supabaseClient';

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function ensurePatientProfile(
  patientId: string,
  fullName: string,
  dateOfBirth: string,
  email: string
) {
  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from('patients').insert({
    id: patientId,
    full_name: fullName,
    date_of_birth: dateOfBirth,
    email,
  });
  if (error) throw error;
}

export async function signUpPatient(
  email: string,
  password: string,
  fullName: string,
  dateOfBirth: string // YYYY-MM-DD
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, date_of_birth: dateOfBirth } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign up did not return a user.');

  // If email confirmation is off, we get a session immediately and can create the
  // profile row now. If confirmation is required, data.session is null here and the
  // profile gets created on first successful login instead (see signInPatient).
  if (data.session) {
    await ensurePatientProfile(data.user.id, fullName, dateOfBirth, email);
  }

  return data.session;
}

export async function signInPatient(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const meta = data.user.user_metadata as { full_name?: string; date_of_birth?: string };
  if (meta?.full_name && meta?.date_of_birth) {
    try {
      await ensurePatientProfile(data.user.id, meta.full_name, meta.date_of_birth, email);
    } catch {
      // Non-fatal: profile may already exist or insert may race, safe to ignore here.
    }
  }

  return data.session;
}

export async function signOutPatient() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export type PatientProfile = {
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  email: string;
};

export async function getPatientProfile(patientId: string): Promise<PatientProfile> {
  const { data, error } = await supabase
    .from('patients')
    .select('full_name, date_of_birth, email')
    .eq('id', patientId)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePatientProfile(
  patientId: string,
  fullName: string,
  dateOfBirth: string // YYYY-MM-DD
) {
  const { error } = await supabase
    .from('patients')
    .update({ full_name: fullName, date_of_birth: dateOfBirth })
    .eq('id', patientId);
  if (error) throw error;
}

export async function updatePatientEmail(newEmail: string, patientId: string) {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
  const { error: profileError } = await supabase
    .from('patients')
    .update({ email: newEmail })
    .eq('id', patientId);
  if (profileError) throw profileError;
}

export async function updatePatientPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function deleteOwnPatientAccount() {
  const { error } = await supabase.rpc('delete_own_patient_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
