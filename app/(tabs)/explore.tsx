import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { MIN_TOUCH, Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { useSymptoms } from '@/context/SymptomsContext';
import { severityLabel } from '@/lib/severity';
import { LogEntry } from '@/types';
import EditEntryModal from '@/components/EditEntryModal';
import ScreenHeader, { useScreenTopPadding } from '@/components/ui/ScreenHeader';
import AppButton from '@/components/ui/AppButton';

function formatDayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long' });
}

function formatDayFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
}

function groupByDay(entries: LogEntry[]) {
  const groups: Record<string, LogEntry[]> = {};
  for (const entry of entries) {
    const key = new Date(entry.loggedAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return Object.entries(groups)
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([key, list]) => [key, list.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())] as const);
}

export default function HistoryScreen() {
  const { entries, loading } = useSymptoms();
  const router = useRouter();
  const topPadding = useScreenTopPadding();
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);

  if (loading) {
    return (
      <View style={[styles.container, { paddingHorizontal: 22, paddingTop: topPadding }]}>
        <ScreenHeader title="History" />
        <ActivityIndicator color={Palette.sage} style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
        <ScreenHeader title="History" lede="Your entries will appear here." />
        <View style={styles.emptyWrap}>
          <View style={styles.emptyRule} />
          <Text style={styles.emptyTitle}>Nothing logged yet.</Text>
          <Text style={styles.emptyCopy}>Log a symptom to start a record for your next appointment.</Text>
          <AppButton label="Log a symptom" onPress={() => router.navigate('/' as never)} style={{ marginTop: 24 }} />
        </View>
      </ScrollView>
    );
  }

  const grouped = groupByDay(entries);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <ScreenHeader title="History" />

      {grouped.map(([dayKey, dayEntries]) => (
        <View key={dayKey}>
          <View style={styles.dayRow}>
            <Text style={styles.dayLabel}>{formatDayLabel(dayKey)}</Text>
            <Text style={styles.dayFull}>{formatDayFull(dayKey)}</Text>
          </View>
          {dayEntries.map((entry) => {
            const score = entry.severityScore != null ? `${entry.severityScore} / 10 · ` : '';
            return (
              <TouchableOpacity
                key={entry.id}
                style={styles.entry}
                onPress={() => setEditingEntry(entry)}
                accessibilityRole="button"
                accessibilityLabel={`${entry.symptom}, ${entry.severity}${entry.severityScore != null ? `, ${entry.severityScore} out of 10` : ''}. Tap to edit`}
              >
                <View style={styles.entryContent}>
                  <View style={styles.entryTitleRow}>
                    <Text style={styles.entryTitle}>{entry.symptom}</Text>
                    <Text style={styles.entryScore}>
                      {score}
                      {severityLabel(entry.severity)}
                    </Text>
                  </View>
                  <Text style={styles.entryMeta}>
                    {new Date(entry.loggedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {entry.onsetContext ? ` · ${entry.onsetContext}` : ''}
                  </Text>
                  {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Palette.muted} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.white },
  content: { paddingHorizontal: 22, paddingBottom: 40 },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    paddingTop: 11,
    paddingBottom: 7,
    marginTop: 5,
  },
  dayLabel: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Palette.nearBlack },
  dayFull: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted },
  entry: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    paddingVertical: 10,
  },
  entryContent: { flex: 1 },
  entryTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  entryTitle: { fontFamily: Fonts.sansSemi, fontSize: 15, color: Palette.nearBlack },
  entryScore: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Palette.sage },
  entryMeta: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginTop: 4 },
  entryNote: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: Palette.nearBlack, marginTop: 4 },
  emptyWrap: { marginTop: 80 },
  emptyRule: { height: 2, width: 38, backgroundColor: Palette.sage, marginBottom: 23 },
  emptyTitle: { fontFamily: Fonts.serif, fontSize: 28, lineHeight: 34, letterSpacing: -0.7, color: Palette.nearBlack },
  emptyCopy: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, color: Palette.muted, marginTop: 9, minHeight: MIN_TOUCH - 24 },
});
