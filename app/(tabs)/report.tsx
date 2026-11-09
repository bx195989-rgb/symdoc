import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { MIN_TOUCH, Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { useSymptoms } from '@/context/SymptomsContext';
import ShareWithClinicModal from '@/components/ShareWithClinicModal';
import ScreenHeader, { useScreenTopPadding } from '@/components/ui/ScreenHeader';
import AppButton from '@/components/ui/AppButton';
import {
  DATE_RANGE_LABELS,
  DateRangeOption,
  buildSummaryLine,
  filterByRange,
  findCoOccurring,
  summarizeBySymptom,
} from '@/lib/report';
import { getScore, severityLabel } from '@/lib/severity';

const RANGE_OPTIONS: DateRangeOption[] = ['7', '14', '30', 'all'];
const TAB_LABELS: Record<DateRangeOption, string> = { '7': 'Week', '14': '2 weeks', '30': 'Month', all: 'All' };

type Summary = ReturnType<typeof summarizeBySymptom>[number];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function peakText(s: Summary) {
  return s.peakScore != null ? `${s.peakScore} / 10` : severityLabel(s.severity);
}

function lastRecorded(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'today';
  return formatDate(iso);
}

function recentNote(s: Summary) {
  const differs = s.lastSeverity !== s.severity || (s.lastScore != null && s.lastScore !== s.peakScore);
  if (!differs) return '';
  return `, most recently ${s.lastSeverity}${s.lastScore != null ? ` ${s.lastScore}/10` : ''}`;
}

function rangeLabel(range: DateRangeOption) {
  if (range === 'all') return 'All entries';
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - parseInt(range, 10) + 1);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startText = start.toLocaleDateString([], sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  const endText = end.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startText}–${endText}`;
}

export default function ReportScreen() {
  const { entries } = useSymptoms();
  const topPadding = useScreenTopPadding();
  const [range, setRange] = useState<DateRangeOption>('14');
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const filtered = useMemo(() => filterByRange(entries, range), [entries, range]);
  const summaries = useMemo(() => summarizeBySymptom(filtered), [filtered]);
  const coOccurring = useMemo(() => findCoOccurring(filtered), [filtered]);
  const summaryLine = useMemo(() => buildSummaryLine(summaries, coOccurring), [summaries, coOccurring]);

  const ongoing = summaries.filter((s) => s.ongoing);
  const past = summaries.filter((s) => !s.ongoing);

  const peakEntry = filtered.reduce<(typeof filtered)[number] | null>(
    (best, e) => (!best || getScore(e) > getScore(best) ? e : best),
    null
  );
  const peakLabel = peakEntry
    ? peakEntry.severityScore != null
      ? `peak ${peakEntry.severityScore}/10`
      : `peak ${peakEntry.severity}`
    : '';
  const metrics = `${summaries.length} symptom${summaries.length === 1 ? '' : 's'} · ${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}${peakLabel ? ` · ${peakLabel}` : ''}`;

  const reportPayload = {
    preparedAt: new Date().toISOString(),
    period: DATE_RANGE_LABELS[range],
    summaryLine,
    ongoing,
    past,
    coOccurring,
  };

  function handleShare() {
    if (summaries.length === 0) {
      Alert.alert('Nothing to share', 'Log a few symptoms first.');
      return;
    }
    setShareModalVisible(true);
  }

  async function handleExport() {
    if (summaries.length === 0) {
      Alert.alert('Nothing to export', 'Log a few symptoms first.');
      return;
    }
    try {
      const { uri } = await Print.printToFileAsync({ html: buildReportHtml() });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share symptom report' });
      } else {
        Alert.alert('Report ready', `Saved to ${uri}`);
      }
    } catch {
      Alert.alert('Export failed', 'Something went wrong generating the PDF.');
    }
  }

  function buildReportHtml() {
    const row = (s: Summary, showRange: boolean) =>
      `<li><b>${s.symptom}</b> · peak ${peakText(s)}${recentNote(s)} · ${s.count} time${s.count > 1 ? 's' : ''} · ${
        showRange ? `${formatDate(s.firstSeen)} to ${formatDate(s.lastSeen)}` : `last ${formatDate(s.lastSeen)}`
      }${
        s.contexts.length
          ? `<br/><span style="color:${Palette.muted};font-size:12px;">Context: ${s.contexts.join('; ')}</span>`
          : ''
      }${
        s.notes.length
          ? `<br/><span style="color:${Palette.muted};font-size:12px;">Notes: ${s.notes.join('; ')}</span>`
          : ''
      }</li>`;
    const coRows = coOccurring
      .map((c) => `<li>${c.symptoms.join(' + ')} · together ${c.count} time${c.count > 1 ? 's' : ''}</li>`)
      .join('');

    return `
      <html>
        <body style="font-family: -apple-system, 'Noto Sans', Arial, sans-serif; padding: 28px; color: ${Palette.nearBlack};">
          <h1 style="font-family: Georgia, 'Noto Serif Display', serif; font-weight: 500; font-size: 28px; margin: 6px 0 4px;">Symptom report</h1>
          <p style="color:${Palette.muted};font-size:13px;margin:0 0 16px;">Prepared ${new Date().toLocaleDateString()} · ${rangeLabel(range)}</p>
          <p style="border-top:1px solid ${Palette.border};border-bottom:1px solid ${Palette.border};padding:12px 0;font-size:14px;">${summaryLine}</p>
          ${ongoing.length ? `<h2 style="font-size:15px;margin-top:22px;">Ongoing</h2><ul style="font-size:13px;line-height:1.7;">${ongoing.map((s) => row(s, false)).join('')}</ul>` : ''}
          ${past.length ? `<h2 style="font-size:15px;margin-top:22px;">Earlier</h2><ul style="font-size:13px;line-height:1.7;">${past.map((s) => row(s, true)).join('')}</ul>` : ''}
          ${coOccurring.length ? `<h2 style="font-size:15px;margin-top:22px;">Often together</h2><ul style="font-size:13px;line-height:1.7;">${coRows}</ul>` : ''}
          <p style="color:${Palette.muted};font-size:11px;margin-top:28px;">Self-reported by the patient using Symptom Tracker (student pilot). Not a diagnosis.</p>
        </body>
      </html>
    `;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
      <ScreenHeader title="Your report" />

      <View style={styles.tabs} accessibilityRole="tablist">
        {RANGE_OPTIONS.map((opt) => {
          const active = range === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setRange(opt)}
              accessibilityRole="tab"
              accessibilityLabel={DATE_RANGE_LABELS[opt]}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{TAB_LABELS[opt]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.rangeText}>{rangeLabel(range)}</Text>

      {summaries.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyRule} />
          <Text style={styles.emptyTitle}>Nothing to report yet.</Text>
          <Text style={styles.emptyCopy}>
            Log a few symptoms on the Log tab, or pick a longer time range above.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.summary}>{metrics}</Text>
          <Text style={styles.hint}>Based on what you recorded.</Text>
          <View style={styles.divider} />

          {ongoing.length > 0 && (
            <>
              <GroupHeading title="Ongoing" note="Last 3 days" />
              {ongoing.map((s) => (
                <ReportRow key={s.symptom} s={s} />
              ))}
            </>
          )}
          {past.length > 0 && (
            <>
              <GroupHeading title="Earlier" note="Before the last 3 days" />
              {past.map((s) => (
                <ReportRow key={s.symptom} s={s} />
              ))}
            </>
          )}
          {coOccurring.length > 0 && (
            <>
              <GroupHeading title="Often together" note="Logged in the same sitting" />
              {coOccurring.map((c, i) => (
                <View key={i} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{c.symptoms.join(' + ')}</Text>
                    <Text style={styles.rowSub}>
                      Together {c.count} time{c.count > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}

      <View style={styles.actions}>
        <AppButton label="Share with clinic" onPress={handleShare} />
        <AppButton label="Export as PDF" variant="secondary" onPress={handleExport} />
      </View>

      <ShareWithClinicModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        report={reportPayload}
      />
    </ScrollView>
  );
}

function GroupHeading({ title, note }: { title: string; note: string }) {
  return (
    <View style={styles.groupHeading}>
      <Text style={styles.groupTitle}>{title}</Text>
      <Text style={styles.groupNote}>{note}</Text>
    </View>
  );
}

function ReportRow({ s }: { s: Summary }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{s.symptom}</Text>
        <Text style={styles.rowSub}>
          {s.count} entr{s.count === 1 ? 'y' : 'ies'} · last recorded {lastRecorded(s.lastSeen)}
          {recentNote(s)}
        </Text>
      </View>
      <Text style={styles.rowPeak}>Peak {peakText(s)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.white },
  content: { paddingHorizontal: 22, paddingBottom: 40 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    marginTop: 3,
    marginBottom: 13,
  },
  tab: { flex: 1, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Palette.sage, marginBottom: -1 },
  tabText: { fontFamily: Fonts.sansMedium, fontSize: 13, color: Palette.muted },
  tabTextActive: { fontFamily: Fonts.sansSemi, color: Palette.sage },
  rangeText: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Palette.muted },
  summary: { fontFamily: Fonts.serif, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, color: Palette.nearBlack, marginTop: 9, marginBottom: 4 },
  hint: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted },
  divider: { borderTopWidth: 1, borderTopColor: Palette.border, marginTop: 15 },
  groupHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 17, marginBottom: 1 },
  groupTitle: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Palette.nearBlack },
  groupNote: { fontFamily: Fonts.sans, fontSize: 11, color: Palette.muted },
  row: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    paddingVertical: 8,
  },
  rowName: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Palette.nearBlack },
  rowSub: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginTop: 3 },
  rowPeak: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Palette.sage },
  actions: { marginTop: 18, gap: 8 },
  foot: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginTop: 8 },
  emptyWrap: { marginTop: 40, marginBottom: 20 },
  emptyRule: { height: 2, width: 38, backgroundColor: Palette.sage, marginBottom: 23 },
  emptyTitle: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 32, letterSpacing: -0.6, color: Palette.nearBlack },
  emptyCopy: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, color: Palette.muted, marginTop: 9 },
});
