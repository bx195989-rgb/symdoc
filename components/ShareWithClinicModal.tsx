import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';

import { MIN_TOUCH, Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { getCurrentSession, signInPatient, signUpPatient } from '@/lib/auth';
import { createShare, deleteSavedClinic, getSavedClinics, SavedClinic } from '@/lib/shareReport';
import { dobToIso, formatDobInput } from '@/lib/dateFormat';
import AppButton from '@/components/ui/AppButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  report: unknown;
};

type Mode = 'checking' | 'auth' | 'ready' | 'done';

export default function ShareWithClinicModal({ visible, onClose, report }: Props) {
  const [mode, setMode] = useState<Mode>('checking');
  const [isSignUp, setIsSignUp] = useState(true);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState(''); // DD/MM/YYYY as displayed
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharedClinicName, setSharedClinicName] = useState('');
  const [clinicCode, setClinicCode] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [savedClinics, setSavedClinics] = useState<SavedClinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  async function loadClinicsFor(id: string) {
    try {
      const clinics = await getSavedClinics(id);
      setSavedClinics(clinics);
      setAddingNew(clinics.length === 0);
    } catch {
      setSavedClinics([]);
      setAddingNew(true);
    }
  }

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const session = await getCurrentSession();
      if (session) {
        setPatientId(session.user.id);
        setMode('ready');
        await loadClinicsFor(session.user.id);
      } else {
        setMode('auth');
      }
    })();
  }, [visible]);

  function selectSavedClinic(clinic: SavedClinic) {
    setSelectedClinicId(clinic.clinic_id);
    setClinicCode(clinic.clinic_code);
    setAddingNew(false);
  }

  function startNewClinic() {
    setSelectedClinicId(null);
    setClinicCode('');
    setAddingNew(true);
  }

  function confirmRemoveSavedClinic(clinic: SavedClinic) {
    Alert.alert('Remove clinic', `Remove "${clinic.clinic_name}" from your saved list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!patientId) return;
          try {
            await deleteSavedClinic(patientId, clinic.clinic_id);
            setSavedClinics((prev) => prev.filter((c) => c.clinic_id !== clinic.clinic_id));
            if (selectedClinicId === clinic.clinic_id) startNewClinic();
          } catch (e: any) {
            Alert.alert('Could not remove', e.message ?? 'Something went wrong.');
          }
        },
      },
    ]);
  }

  async function handleAuth() {
    if (!email.trim() || !password.trim() || (isSignUp && (!fullName.trim() || !dob.trim()))) {
      Alert.alert('Missing details', 'Please fill in all fields.');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      Alert.alert("Passwords don't match", 'Check both password fields and try again.');
      return;
    }
    let isoDob = '';
    if (isSignUp) {
      const converted = dobToIso(dob);
      if (!converted) {
        Alert.alert('Invalid date', 'Enter your date of birth as DD/MM/YYYY.');
        return;
      }
      isoDob = converted;
    }
    setLoading(true);
    try {
      const session = isSignUp
        ? await signUpPatient(email.trim(), password, fullName.trim(), isoDob)
        : await signInPatient(email.trim(), password);
      if (session) {
        setPatientId(session.user.id);
        setMode('ready');
        await loadClinicsFor(session.user.id);
      } else {
        Alert.alert(
          'Check your email',
          'We sent a confirmation link to your email. Confirm it, then log in.'
        );
        setIsSignUp(false);
      }
    } catch (e: any) {
      Alert.alert('Could not continue', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!patientId) return;
    if (!clinicCode.trim()) {
      Alert.alert('Missing clinic code', 'Enter the code your clinic gave you.');
      return;
    }
    setLoading(true);
    try {
      const { clinicName } = await createShare(report, clinicCode);
      setSharedClinicName(clinicName);
      setMode('done');
    } catch (e: any) {
      Alert.alert('Could not share', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSharedClinicName('');
    setClinicCode('');
    setPassword('');
    setConfirmPassword('');
    setSelectedClinicId(null);
    setAddingNew(false);
    setSavedClinics([]);
    setMode('checking');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {mode === 'checking' && <ActivityIndicator color={Palette.sage} style={{ marginVertical: 40 }} />}

          {mode === 'auth' && (
            <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">
              <SheetTop title={isSignUp ? 'Set up your profile' : 'Log in'} onClose={handleClose} />
              <Text style={styles.lede}>
                This lets a clinic identify you when you share a report. You only do this once.
              </Text>

              {isSignUp && (
                <>
                  <LineField label="Full name" value={fullName} onChangeText={setFullName} textContentType="name" autoComplete="name" />
                  <LineField
                    label="Date of birth (DD/MM/YYYY)"
                    value={dob}
                    onChangeText={(t) => setDob(formatDobInput(t))}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </>
              )}
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
              <LineField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType={isSignUp ? 'newPassword' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
              {isSignUp && (
                <LineField
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  textContentType="newPassword"
                />
              )}

              <AppButton
                label={isSignUp ? 'Create profile' : 'Log in'}
                onPress={handleAuth}
                loading={loading}
                style={{ marginTop: 14 }}
              />
              <AppButton
                label={isSignUp ? 'Already have a profile? Log in' : "Don't have a profile? Sign up"}
                variant="text"
                onPress={() => setIsSignUp((v) => !v)}
              />
            </ScrollView>
          )}

          {mode === 'ready' && (
            <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">
              <SheetTop title="Share with clinic" onClose={handleClose} />
              <Text style={styles.lede}>Choose where to send this report.</Text>

              {savedClinics.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Saved clinic</Text>
                  {savedClinics.map((c) => {
                    const isSelected = selectedClinicId === c.clinic_id;
                    return (
                      <View key={c.clinic_id} style={styles.clinicRow}>
                        <TouchableOpacity
                          style={styles.clinicMain}
                          onPress={() => selectSavedClinic(c)}
                          accessibilityRole="radio"
                          accessibilityLabel={`${c.clinic_name}, code ${c.clinic_code}`}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <View style={[styles.radio, !isSelected && styles.radioOff]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.clinicName}>{c.clinic_name}</Text>
                            <Text style={styles.clinicCode}>Clinic code · {c.clinic_code}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => confirmRemoveSavedClinic(c)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${c.clinic_name}`}
                        >
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {!addingNew && (
                    <TouchableOpacity style={styles.addNewRow} onPress={startNewClinic}>
                      <Text style={styles.addNewText}>Or enter a different clinic code</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {addingNew && (
                <>
                  <Text style={styles.sectionLabel}>
                    {savedClinics.length > 0 ? 'Or enter a clinic code' : 'Enter a clinic code'}
                  </Text>
                  <TextInput
                    style={styles.codeField}
                    placeholder="e.g. RIVER-728"
                    placeholderTextColor={Palette.muted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    value={clinicCode}
                    onChangeText={setClinicCode}
                    accessibilityLabel="Clinic code"
                  />
                </>
              )}

              <View style={styles.privacy}>
                <Text style={styles.privacyText}>
                  Once shared, this report appears in the clinic's dashboard with your name, date of birth,
                  symptoms and notes. The clinic keeps its own copy for its records, even if you later revoke
                  access or delete your account. You can manage shared reports in Profile.
                </Text>
              </View>

              <AppButton label="Share report" onPress={handleShare} loading={loading} />
            </ScrollView>
          )}

          {mode === 'done' && (
            <>
              <SheetTop title="Report shared" onClose={handleClose} />
              <Text style={styles.lede}>
                Your report is now visible to {sharedClinicName || 'your clinic'}.
              </Text>
              <AppButton label="Done" onPress={handleClose} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SheetTop({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.sheetTop}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
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
  backdrop: { flex: 1, backgroundColor: Palette.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Palette.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
  },
  handle: { width: 36, height: 4, borderRadius: 3, backgroundColor: '#9BA9A3', alignSelf: 'center', marginBottom: 13 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  title: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 32, letterSpacing: -0.6, color: Palette.nearBlack, flex: 1 },
  close: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 26, color: Palette.muted },
  lede: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: Palette.muted, marginBottom: 16 },
  sectionLabel: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Palette.nearBlack, marginTop: 6, marginBottom: 5 },
  clinicRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Palette.border,
  },
  clinicMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 68 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOff: { borderColor: Palette.chipBorder },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.sage },
  clinicName: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Palette.nearBlack },
  clinicCode: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginTop: 4 },
  removeBtn: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: 10 },
  removeText: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Palette.danger },
  addNewRow: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  addNewText: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Palette.sage },
  codeField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Palette.chipBorder,
    borderRadius: 7,
    paddingHorizontal: 12,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Palette.nearBlack,
  },
  privacy: { borderLeftWidth: 2, borderLeftColor: Palette.sage, paddingLeft: 10, marginVertical: 14 },
  privacyText: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, color: Palette.nearBlack },
  field: { marginTop: 6 },
  fieldLabel: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Palette.nearBlack },
  lineInput: {
    minHeight: MIN_TOUCH,
    borderBottomWidth: 1,
    borderBottomColor: Palette.chipBorder,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Palette.nearBlack,
    paddingVertical: 8,
  },
});
