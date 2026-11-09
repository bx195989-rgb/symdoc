import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { MIN_TOUCH, Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { dobToIso, formatDobInput } from '@/lib/dateFormat';
import {
  deleteOwnPatientAccount,
  getCurrentSession,
  getPatientProfile,
  signInPatient,
  signOutPatient,
  signUpPatient,
  updatePatientEmail,
  updatePatientPassword,
  updatePatientProfile,
} from '@/lib/auth';
import {
  deleteSharedReport,
  getMySharedReports,
  getSavedClinics,
  SavedClinic,
  SharedReport,
} from '@/lib/shareReport';
import ScreenHeader, { useScreenTopPadding } from '@/components/ui/ScreenHeader';
import AppButton from '@/components/ui/AppButton';

export default function ProfileScreen() {
  const topPadding = useScreenTopPadding();
  const contentStyle = [styles.content, { paddingTop: topPadding }];
  const [checking, setChecking] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);

  // Auth form state (when not logged in)
  const [isSignUp, setIsSignUp] = useState(true);
  const [authFullName, setAuthFullName] = useState('');
  const [authDob, setAuthDob] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');

  // Profile edit state (when logged in)
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [sharedReports, setSharedReports] = useState<SharedReport[]>([]);
  const [clinicNameByCode, setClinicNameByCode] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    setChecking(true);
    const session = await getCurrentSession();
    if (session) {
      setPatientId(session.user.id);
      try {
        const profile = await getPatientProfile(session.user.id);
        setFullName(profile.full_name);
        setDob(reverseToDisplay(profile.date_of_birth));
        setEmail(profile.email);
      } catch {
        // profile row may not exist yet, leave fields blank
      }
      loadSharedReports(session.user.id);
    }
    setChecking(false);
  }

  async function loadSharedReports(id: string) {
    try {
      const [reports, clinics] = await Promise.all([getMySharedReports(id), getSavedClinics(id)]);
      setSharedReports(reports);
      const map: Record<string, string> = {};
      clinics.forEach((c: SavedClinic) => {
        map[c.clinic_code] = c.clinic_name;
      });
      setClinicNameByCode(map);
    } catch {
      // non-fatal, list just stays empty
    }
  }

  function confirmRevokeReport(report: SharedReport) {
    Alert.alert('Revoke report', "Remove this shared report from the clinic's view?", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSharedReport(report.id);
            setSharedReports((prev) => prev.filter((r) => r.id !== report.id));
          } catch (e: any) {
            Alert.alert('Could not revoke', e.message ?? 'Something went wrong.');
          }
        },
      },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account',
      "This permanently deletes your profile, saved clinics, and cloud backup of your logs. Reports you've already shared stay with those clinics (they're required to keep their own records) but are no longer linked to your account. Symptom logs stored on this device are not affected. This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteOwnPatientAccount();
              setPatientId(null);
              setFullName('');
              setDob('');
              setEmail('');
              setSharedReports([]);
            } catch (e: any) {
              Alert.alert('Could not delete account', e.message ?? 'Something went wrong.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  }

  function reverseToDisplay(isoDate: string) {
    const [yyyy, mm, dd] = isoDate.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }

  async function handleAuth() {
    if (
      !authEmail.trim() ||
      !authPassword.trim() ||
      (isSignUp && (!authFullName.trim() || !authDob.trim()))
    ) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }
    if (isSignUp && authPassword !== authConfirmPassword) {
      Alert.alert("Passwords don't match", 'Check both password fields and try again.');
      return;
    }
    let isoDob = '';
    if (isSignUp) {
      const converted = dobToIso(authDob);
      if (!converted) {
        Alert.alert('Invalid date', 'Enter your date of birth as DD/MM/YYYY.');
        return;
      }
      isoDob = converted;
    }
    setAuthLoading(true);
    try {
      if (isSignUp) {
        const session = await signUpPatient(authEmail.trim(), authPassword, authFullName.trim(), isoDob);
        if (!session) {
          Alert.alert(
            'Check your email',
            'We sent a confirmation link to your email. Confirm it, then log in.'
          );
          setIsSignUp(false);
          setAuthLoading(false);
          return;
        }
      } else {
        await signInPatient(authEmail.trim(), authPassword);
      }
      await loadSession();
    } catch (e: any) {
      Alert.alert('Could not continue', e.message ?? 'Something went wrong.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!patientId) return;
    const isoDob = dobToIso(dob);
    if (!fullName.trim() || !isoDob) {
      Alert.alert('Invalid details', 'Check your name and date of birth (DD/MM/YYYY).');
      return;
    }
    setSavingProfile(true);
    try {
      await updatePatientProfile(patientId, fullName.trim(), isoDob);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Something went wrong.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveEmail() {
    if (!patientId) return;
    if (!email.trim()) {
      Alert.alert('Missing email', 'Enter an email address.');
      return;
    }
    setSavingEmail(true);
    try {
      await updatePatientEmail(email.trim(), patientId);
      Alert.alert('Saved', 'Your email has been updated.');
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Something went wrong.');
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleSavePassword() {
    if (!newPassword.trim()) {
      Alert.alert('Missing password', 'Enter a new password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Passwords don't match", 'Check both password fields and try again.');
      return;
    }
    setSavingPassword(true);
    try {
      await updatePatientPassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      Alert.alert('Saved', 'Your password has been updated.');
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Something went wrong.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogOut() {
    await signOutPatient();
    setPatientId(null);
    setFullName('');
    setDob('');
    setEmail('');
  }

  if (checking) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Palette.sage} />
      </View>
    );
  }

  if (!patientId) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            title={isSignUp ? 'Set up your profile' : 'Log in'}
            lede="This lets a clinic identify you when you share a report."
          />

          {isSignUp && (
            <>
              <LineField label="Full name" value={authFullName} onChangeText={setAuthFullName} textContentType="name" autoComplete="name" />
              <LineField
                label="Date of birth (DD/MM/YYYY)"
                value={authDob}
                onChangeText={(t) => setAuthDob(formatDobInput(t))}
                keyboardType="number-pad"
                maxLength={10}
              />
            </>
          )}
          <LineField
            label="Email"
            value={authEmail}
            onChangeText={setAuthEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />
          <LineField
            label="Password"
            value={authPassword}
            onChangeText={setAuthPassword}
            secureTextEntry
            textContentType={isSignUp ? 'newPassword' : 'password'}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          {isSignUp && (
            <LineField
              label="Confirm password"
              value={authConfirmPassword}
              onChangeText={setAuthConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
            />
          )}

          <AppButton
            label={isSignUp ? 'Create profile' : 'Log in'}
            onPress={handleAuth}
            loading={authLoading}
            style={{ marginTop: 16 }}
          />
          <AppButton
            label={isSignUp ? 'Already have a profile? Log in' : "Don't have a profile? Sign up"}
            variant="text"
            onPress={() => setIsSignUp((v) => !v)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Profile" />

        <Group title="Personal details">
          <LineField label="Name" value={fullName} onChangeText={setFullName} textContentType="name" autoComplete="name" />
          <LineField
            label="Date of birth (DD/MM/YYYY)"
            value={dob}
            onChangeText={(t) => setDob(formatDobInput(t))}
            keyboardType="number-pad"
            maxLength={10}
          />
          <AppButton label="Save details" variant="secondary" onPress={handleSaveProfile} loading={savingProfile} style={styles.saveBtn} />
        </Group>

        <Group title="Email">
          <LineField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />
          <AppButton label="Save email" variant="secondary" onPress={handleSaveEmail} loading={savingEmail} style={styles.saveBtn} />
        </Group>

        <Group title="Password">
          <LineField label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry textContentType="newPassword" />
          <LineField label="Confirm new password" value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry textContentType="newPassword" />
          <AppButton label="Save password" variant="secondary" onPress={handleSavePassword} loading={savingPassword} style={styles.saveBtn} />
        </Group>

        <Group title="Shared reports">
          {sharedReports.length === 0 ? (
            <Text style={styles.emptyText}>Nothing shared yet.</Text>
          ) : (
            sharedReports.map((r) => (
              <View key={r.id} style={styles.sharedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sharedName}>
                    {clinicNameByCode[r.clinic_code] || `Clinic code ${r.clinic_code}`}
                  </Text>
                  <Text style={styles.sharedMeta}>
                    {r.report?.period ? `${r.report.period} · ` : ''}shared{' '}
                    {new Date(r.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.revoke}
                  onPress={() => confirmRevokeReport(r)}
                  accessibilityRole="button"
                  accessibilityLabel={`Revoke report shared on ${new Date(r.created_at).toLocaleDateString()}`}
                >
                  <Text style={styles.revokeText}>Revoke</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          <Text style={styles.foot}>
            Revoking stops the clinic seeing the shared report. They may keep their own record.
          </Text>
        </Group>

        <Group title="Account">
          <TouchableOpacity style={styles.action} onPress={handleLogOut} accessibilityRole="button">
            <Text style={styles.actionText}>Log out</Text>
            <MaterialIcons name="chevron-right" size={20} color={Palette.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.action}
            onPress={confirmDeleteAccount}
            disabled={deletingAccount}
            accessibilityRole="button"
          >
            {deletingAccount ? (
              <ActivityIndicator color={Palette.danger} />
            ) : (
              <Text style={[styles.actionText, { color: Palette.danger }]}>Delete account</Text>
            )}
            <MaterialIcons name="chevron-right" size={20} color={Palette.muted} />
          </TouchableOpacity>
        </Group>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeading}>{title}</Text>
      {children}
    </View>
  );
}

function LineField({
  label,
  ...inputProps
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.lineInput}
        placeholderTextColor={Palette.muted}
        accessibilityLabel={label}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.white },
  content: { paddingHorizontal: 22, paddingBottom: 40, flexGrow: 1 },
  group: { marginTop: 16 },
  groupHeading: {
    fontFamily: Fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 0.4,
    color: Palette.nearBlack,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  field: { marginTop: 8 },
  fieldLabel: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted },
  lineInput: {
    minHeight: MIN_TOUCH,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Palette.nearBlack,
    paddingVertical: 8,
  },
  saveBtn: { marginTop: 12 },
  emptyText: { fontFamily: Fonts.sans, fontSize: 13, color: Palette.muted, paddingVertical: 14 },
  sharedRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  sharedName: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Palette.nearBlack },
  sharedMeta: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginTop: 4 },
  revoke: {
    minHeight: MIN_TOUCH,
    minWidth: 67,
    borderWidth: 1,
    borderColor: Palette.danger,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  revokeText: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Palette.danger },
  foot: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, color: Palette.muted, marginTop: 8 },
  action: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  actionText: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Palette.sage },
});
