import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { MIN_TOUCH, Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { signInPatient, signUpPatient } from '@/lib/auth';
import { dobToIso, formatDobInput } from '@/lib/dateFormat';
import AppButton from '@/components/ui/AppButton';
import ScreenHeader, { useScreenTopPadding } from '@/components/ui/ScreenHeader';

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const topPadding = useScreenTopPadding();
  const contentStyle = [styles.content, { paddingTop: topPadding }];
  const [showForm, setShowForm] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      if (isSignUp) {
        const session = await signUpPatient(email.trim(), password, fullName.trim(), isoDob);
        if (!session) {
          Alert.alert(
            'Check your email',
            'We sent a confirmation link to your email. Confirm it, then log in.'
          );
          setIsSignUp(false);
          setLoading(false);
          return;
        }
      } else {
        await signInPatient(email.trim(), password);
      }
      onDone();
    } catch (e: any) {
      Alert.alert('Could not continue', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (!showForm) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={contentStyle}>
        <ScreenHeader
          kicker="Welcome"
          title="Symptom Tracker"
          lede="Log symptoms in a few taps and bring a clear summary to your next GP visit."
        />

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Before you start</Text>
          <Text style={styles.noticeText}>
            This is a student pilot project, not approved medical software. It is not a diagnostic
            tool and does not provide medical advice. Symptom logs are stored on your device; if you
            choose to share a report, it is sent to the clinic you specify. Do not rely on this app
            in a medical emergency.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setConsentGiven((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityLabel="I understand this is pilot software and not a substitute for medical advice"
          accessibilityState={{ checked: consentGiven }}
        >
          <View style={[styles.checkbox, consentGiven && styles.checkboxChecked]}>
            {consentGiven && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={styles.consentText}>
            I understand this is pilot software and not a substitute for medical advice.
          </Text>
        </TouchableOpacity>

        <AppButton
          label="Set up profile / link clinic"
          onPress={() => setShowForm(true)}
          disabled={!consentGiven}
        />
        <AppButton label="Skip for now" variant="text" onPress={onDone} disabled={!consentGiven} />

        <Text style={styles.footnote}>
          You can always set this up later from the Profile tab when you're ready to share with a
          clinic.
        </Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={isSignUp ? 'Set up your profile' : 'Log in'}
          lede="This lets a clinic identify you when you share a code. You only do this once."
        />

        {isSignUp && (
          <>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.lineInput}
              value={fullName}
              onChangeText={setFullName}
              textContentType="name"
              autoComplete="name"
              placeholderTextColor={Palette.muted}
              accessibilityLabel="Full name"
            />
            <Text style={styles.label}>Date of birth (DD/MM/YYYY)</Text>
            <TextInput
              style={styles.lineInput}
              keyboardType="number-pad"
              value={dob}
              onChangeText={(t) => setDob(formatDobInput(t))}
              maxLength={10}
              placeholderTextColor={Palette.muted}
              accessibilityLabel="Date of birth"
            />
          </>
        )}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.lineInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor={Palette.muted}
          accessibilityLabel="Email"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.lineInput}
          secureTextEntry
          textContentType={isSignUp ? 'newPassword' : 'password'}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor={Palette.muted}
          accessibilityLabel="Password"
        />
        {isSignUp && (
          <>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.lineInput}
              secureTextEntry
              textContentType="newPassword"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor={Palette.muted}
              accessibilityLabel="Confirm password"
            />
          </>
        )}

        <AppButton
          label={isSignUp ? 'Create profile' : 'Log in'}
          onPress={handleAuth}
          loading={loading}
          style={{ marginTop: 20 }}
        />
        <AppButton
          label={isSignUp ? 'Already have a profile? Log in' : "Don't have a profile? Sign up"}
          variant="text"
          onPress={() => setIsSignUp((v) => !v)}
        />
        <AppButton label="Skip for now" variant="text" onPress={onDone} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.white },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 40 },
  notice: {
    borderLeftWidth: 3,
    borderLeftColor: Palette.sage,
    paddingLeft: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  noticeTitle: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Palette.nearBlack, marginBottom: 4 },
  noticeText: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: Palette.muted },
  consentRow: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH, marginBottom: 16, gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Palette.chipBorder,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Palette.sage, borderColor: Palette.sage },
  checkboxMark: { color: Palette.white, fontSize: 13, fontFamily: Fonts.sansSemi },
  consentText: { flex: 1, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: Palette.nearBlack },
  footnote: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginTop: 20, lineHeight: 17 },
  label: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginTop: 8 },
  lineInput: {
    minHeight: MIN_TOUCH,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Palette.nearBlack,
    paddingVertical: 8,
  },
});
