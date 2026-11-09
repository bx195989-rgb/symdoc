import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { PRESET_SYMPTOMS } from '@/constants/symptoms';
import { MIN_TOUCH, Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { useSymptoms } from '@/context/SymptomsContext';
import SeveritySlider from '@/components/SeveritySlider';
import ScreenHeader, { useScreenTopPadding } from '@/components/ui/ScreenHeader';
import AppButton from '@/components/ui/AppButton';
import { DEFAULT_SCORE, scoreToSeverity, severityLabel } from '@/lib/severity';

function formatWhen(d: Date, backdated: boolean) {
  if (!backdated) return 'Now';
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `Today, ${time}` : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}

type Saved = { ids: string[]; symptoms: string[]; score: number; when: string };

export default function LogScreen() {
  const { addEntries, deleteEntry } = useSymptoms();
  const router = useRouter();
  const topPadding = useScreenTopPadding();

  const [selected, setSelected] = useState<string[]>([]);
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [score, setScore] = useState(DEFAULT_SCORE);
  const [onsetContext, setOnsetContext] = useState('');
  const [note, setNote] = useState('');
  const [backdate, setBackdate] = useState(false);
  const [customDateTime, setCustomDateTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);

  function toggleSymptom(symptom: string) {
    setSelected((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  }

  function addCustomSymptom() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed)) setSelected((prev) => [...prev, trimmed]);
    setCustomText('');
    setShowCustomInput(false);
  }

  function resetForm() {
    setSelected([]);
    setCustomText('');
    setShowCustomInput(false);
    setScore(DEFAULT_SCORE);
    setOnsetContext('');
    setNote('');
    setBackdate(false);
    setCustomDateTime(new Date());
    setShowPicker(false);
  }

  function onChangeDateTime(_event: unknown, selectedDate?: Date) {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCustomDateTime(selectedDate);
      setBackdate(true);
    }
  }

  async function handleLog() {
    if (selected.length === 0) {
      Alert.alert('Select at least one symptom');
      return;
    }
    const sessionId = `${Date.now()}`;
    const when = backdate ? customDateTime : new Date();
    const created = await addEntries(
      selected.map((symptom) => ({
        symptom,
        severity: scoreToSeverity(score),
        severityScore: score,
        note: note.trim(),
        onsetContext: onsetContext.trim(),
        sessionId,
      })),
      backdate ? customDateTime.toISOString() : undefined
    );
    setSaved({
      ids: created.map((e) => e.id),
      symptoms: [...selected],
      score,
      when: when.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
    });
    resetForm();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    AccessibilityInfo.announceForAccessibility('Entry saved');
  }

  async function handleUndo() {
    if (!saved) return;
    for (const id of saved.ids) await deleteEntry(id);
    setSaved(null);
  }

  if (saved) {
    const n = saved.symptoms.length;
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
        <ScreenHeader title="Log a symptom" />
        <View style={styles.savedMark}>
          <MaterialIcons name="check" size={26} color={Palette.sage} />
        </View>
        <Text style={styles.stateTitle} accessibilityLiveRegion="polite">
          Entry saved.
        </Text>
        <Text style={styles.stateCopy}>
          {n === 1 ? 'One symptom has' : `${n === 2 ? 'Two' : n} symptoms have`} been added to your history.
        </Text>
        <View style={styles.savedDetails}>
          <Text style={styles.savedDetailsTitle}>{saved.symptoms.join(' · ')}</Text>
          <Text style={styles.savedDetailsMeta}>
            {saved.score} / 10 · {severityLabel(scoreToSeverity(saved.score))}  |  {saved.when}
          </Text>
        </View>
        <AppButton label="View history" onPress={() => router.navigate('/explore' as never)} style={styles.stackGap} />
        <AppButton label="Log another" variant="secondary" onPress={() => setSaved(null)} style={styles.stackGap} />
        <AppButton label="Undo" variant="text" onPress={handleUndo} />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Log a symptom" />

        <View style={styles.sectionTop}>
          <Text style={styles.sectionTitle}>Symptoms</Text>
          <Text style={styles.hint}>Select all that apply</Text>
        </View>

        <View style={styles.chipRow}>
          {PRESET_SYMPTOMS.map((s) => (
            <Chip key={s} label={s} selected={selected.includes(s)} onPress={() => toggleSymptom(s)} />
          ))}
          {selected
            .filter((s) => !PRESET_SYMPTOMS.includes(s))
            .map((s) => (
              <Chip key={s} label={s} selected onPress={() => toggleSymptom(s)} />
            ))}
          <Chip
            label="Other +"
            selected={false}
            onPress={() => setShowCustomInput((v) => !v)}
            accessibilityLabel="Add another symptom"
          />
        </View>

        {showCustomInput && (
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Type a symptom"
              placeholderTextColor={Palette.muted}
              value={customText}
              onChangeText={setCustomText}
              onSubmitEditing={addCustomSymptom}
              returnKeyType="done"
              autoFocus
            />
            <AppButton label="Add" onPress={addCustomSymptom} style={styles.addBtn} />
          </View>
        )}

        <SeveritySlider value={score} onChange={setScore} />
        {selected.length > 1 && <Text style={styles.applyNote}>Applies to all selected symptoms.</Text>}

        <Field label="What were you doing?" value={onsetContext} onChangeText={setOnsetContext} placeholder="e.g. on a walk" />
        <Field label="Anything else?" value={note} onChangeText={setNote} placeholder="Add a note" />

        <TouchableOpacity
          style={styles.earlier}
          onPress={() => {
            setBackdate(true);
            setShowPicker((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityLabel={`This happened earlier. ${formatWhen(customDateTime, backdate)}`}
        >
          <View style={styles.earlierLeft}>
            <MaterialIcons name="schedule" size={18} color={Palette.sage} />
            <Text style={styles.earlierLabel}>This happened earlier</Text>
          </View>
          <View style={styles.earlierRight}>
            <Text style={styles.earlierValue}>{formatWhen(customDateTime, backdate)}</Text>
            <MaterialIcons name="chevron-right" size={20} color={Palette.muted} />
          </View>
        </TouchableOpacity>

        {showPicker && (
          <>
            <DateTimePicker
              value={customDateTime}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              accentColor={Palette.sage}
              onChange={onChangeDateTime}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.pickerActions}>
                <AppButton
                  label="Use current time"
                  variant="text"
                  onPress={() => {
                    setBackdate(false);
                    setCustomDateTime(new Date());
                    setShowPicker(false);
                  }}
                />
                <AppButton label="Done" variant="text" onPress={() => setShowPicker(false)} />
              </View>
            )}
          </>
        )}

        <AppButton label="Log symptom" onPress={handleLog} style={{ marginTop: 11 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
    >
      {selected && <Text style={styles.chipCheck}>✓</Text>}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldOptional}>Optional</Text>
      </View>
      <TextInput
        style={styles.lineInput}
        placeholder={placeholder}
        placeholderTextColor={Palette.muted}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.white },
  content: { paddingHorizontal: 22, paddingBottom: 40 },
  sectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 },
  sectionTitle: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Palette.nearBlack },
  hint: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chip: {
    minHeight: MIN_TOUCH,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 13,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.chipBorder,
    backgroundColor: Palette.white,
  },
  chipSelected: { backgroundColor: Palette.sageTint, borderColor: Palette.sage },
  chipCheck: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Palette.sage },
  chipText: { fontFamily: Fonts.sansMedium, fontSize: 13, color: Palette.nearBlack },
  chipTextSelected: { fontFamily: Fonts.sansSemi, color: Palette.sage },
  customRow: { flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'center' },
  customInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Palette.chipBorder,
    borderRadius: 7,
    paddingHorizontal: 12,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Palette.nearBlack,
  },
  addBtn: { width: 72 },
  applyNote: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginBottom: 6 },
  field: { marginTop: 8 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  fieldLabel: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Palette.nearBlack },
  fieldOptional: { fontFamily: Fonts.sans, fontSize: 11, color: Palette.muted },
  lineInput: {
    minHeight: MIN_TOUCH,
    borderBottomWidth: 1,
    borderBottomColor: Palette.chipBorder,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Palette.nearBlack,
    paddingVertical: 8,
  },
  earlier: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    marginTop: 4,
  },
  earlierLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  earlierLabel: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Palette.nearBlack },
  earlierRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earlierValue: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted },
  pickerActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  savedMark: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: Palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 58,
    marginBottom: 20,
  },
  stateTitle: { fontFamily: Fonts.serif, fontSize: 28, lineHeight: 34, letterSpacing: -0.7, color: Palette.nearBlack },
  stateCopy: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, color: Palette.muted, marginTop: 9 },
  savedDetails: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Palette.border,
    marginTop: 25,
    marginBottom: 22,
    paddingVertical: 14,
  },
  savedDetailsTitle: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Palette.nearBlack },
  savedDetailsMeta: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginTop: 6 },
  stackGap: { marginBottom: 8 },
});
