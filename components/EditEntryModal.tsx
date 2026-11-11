import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { MIN_TOUCH, Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { LogEntry } from '@/types';
import { useSymptoms } from '@/context/SymptomsContext';
import SeveritySlider from '@/components/SeveritySlider';
import AppButton from '@/components/ui/AppButton';
import { getScore, scoreToSeverity } from '@/lib/severity';

function formatDateTime(d: Date) {
  return d.toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

type Props = {
  entry: LogEntry | null;
  onClose: () => void;
};

export default function EditEntryModal({ entry, onClose }: Props) {
  const { updateEntry, deleteEntry } = useSymptoms();

  const [symptom, setSymptom] = useState('');
  const [score, setScore] = useState(3);
  const [onsetContext, setOnsetContext] = useState('');
  const [note, setNote] = useState('');
  const [loggedAt, setLoggedAt] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (entry) {
      setSymptom(entry.symptom);
      setScore(getScore(entry));
      setOnsetContext(entry.onsetContext);
      setNote(entry.note);
      setLoggedAt(new Date(entry.loggedAt));
      setShowPicker(false);
    }
  }, [entry]);

  if (!entry) return null;

  function onChangeDateTime(_event: unknown, selectedDate?: Date) {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) setLoggedAt(selectedDate);
  }

  async function handleSave() {
    if (!symptom.trim()) {
      Alert.alert('Symptom required', 'Enter a symptom name.');
      return;
    }
    await updateEntry(entry!.id, {
      symptom: symptom.trim(),
      severity: scoreToSeverity(score),
      severityScore: score,
      onsetContext: onsetContext.trim(),
      note: note.trim(),
      loggedAt: loggedAt.toISOString(),
    });
    onClose();
  }

  function handleDelete() {
    Alert.alert('Delete entry', `Remove "${entry!.symptom}" from your log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(entry!.id);
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible={!!entry} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.sheetTop}>
              <Text style={styles.title} accessibilityRole="header">
                Edit entry
              </Text>
              <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Symptom</Text>
            <TextInput
              style={styles.lineInput}
              value={symptom}
              onChangeText={setSymptom}
              placeholderTextColor={Palette.muted}
              accessibilityLabel="Symptom"
            />

            <View style={{ marginTop: 14 }}>
              <SeveritySlider value={score} onChange={setScore} />
            </View>

            <Text style={styles.label}>When</Text>
            <TouchableOpacity
              style={styles.dateRow}
              onPress={() => setShowPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`When: ${formatDateTime(loggedAt)}. Tap to change`}
            >
              <Text style={styles.dateText}>{formatDateTime(loggedAt)}</Text>
            </TouchableOpacity>
            {showPicker && (
              <View style={Platform.OS === 'ios' ? styles.pickerCard : undefined}>
                <DateTimePicker
                  value={loggedAt}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  maximumDate={new Date()}
                  accentColor={Palette.sage}
                  themeVariant="light"
                  onChange={onChangeDateTime}
                />
              </View>
            )}
            {Platform.OS === 'ios' && showPicker && (
              <AppButton label="Done" variant="text" onPress={() => setShowPicker(false)} />
            )}

            <Text style={styles.label}>What were you doing?</Text>
            <TextInput
              style={styles.lineInput}
              value={onsetContext}
              onChangeText={setOnsetContext}
              placeholderTextColor={Palette.muted}
              multiline
              accessibilityLabel="What were you doing"
            />

            <Text style={styles.label}>Anything else?</Text>
            <TextInput
              style={styles.lineInput}
              value={note}
              onChangeText={setNote}
              placeholderTextColor={Palette.muted}
              multiline
              accessibilityLabel="Anything else"
            />

            <AppButton label="Save changes" onPress={handleSave} style={{ marginTop: 18 }} />
            <AppButton label="Delete entry" variant="danger" onPress={handleDelete} style={{ marginTop: 8 }} />
            <AppButton label="Cancel" variant="text" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    maxHeight: '90%',
  },
  handle: { width: 36, height: 4, borderRadius: 3, backgroundColor: '#9BA9A3', alignSelf: 'center', marginBottom: 13 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 32, letterSpacing: -0.6, color: Palette.nearBlack },
  close: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 26, color: Palette.muted },
  label: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Palette.nearBlack, marginTop: 10 },
  lineInput: {
    minHeight: MIN_TOUCH,
    borderBottomWidth: 1,
    borderBottomColor: Palette.chipBorder,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Palette.nearBlack,
    paddingVertical: 8,
  },
  dateRow: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Palette.chipBorder,
  },
  dateText: { fontFamily: Fonts.sans, fontSize: 14, color: Palette.nearBlack },
  pickerCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: Palette.chipBorder,
    borderRadius: 12,
    backgroundColor: Palette.white,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
});
