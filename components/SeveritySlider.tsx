import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { MIN_TOUCH, Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { MAX_SCORE, MIN_SCORE, scoreToSeverity, severityLabel } from '@/lib/severity';

type Props = {
  value: number;
  onChange: (value: number) => void;
  caption?: string;
};

const THUMB = 24;
const STEPS = MAX_SCORE - MIN_SCORE + 1; // 10 equally spaced snap positions

// Custom 1-10 slider built on React Native's own touch handling (no extra native package).
// Ten equal snap positions; the score and band are always shown as text.
export default function SeveritySlider({ value, onChange, caption = 'How strong was it?' }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  function commit(next: number) {
    const clamped = Math.min(MAX_SCORE, Math.max(MIN_SCORE, next));
    if (clamped === valueRef.current) return;
    valueRef.current = clamped;
    onChangeRef.current(clamped);
    Haptics.selectionAsync().catch(() => {});
  }

  function setFromX(x: number) {
    const w = widthRef.current;
    if (w <= 0) return;
    const ratio = Math.min(0.9999, Math.max(0, x / w));
    commit(MIN_SCORE + Math.floor(ratio * STEPS));
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    })
  ).current;

  const band = scoreToSeverity(value);
  const thumbCenter = ((value - MIN_SCORE + 0.5) / STEPS) * width;

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View>
          <Text style={styles.title}>Severity</Text>
          <Text style={styles.caption}>{caption}</Text>
        </View>
        <View style={styles.score}>
          <Text style={styles.scoreNumber}>{value}</Text>
          <Text style={styles.scoreMax}>/ 10</Text>
          <Text style={styles.scoreBand}>{severityLabel(band)}</Text>
        </View>
      </View>

      <View
        style={styles.rail}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
          setWidth(e.nativeEvent.layout.width);
        }}
        {...pan.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Severity"
        accessibilityHint="Swipe up or down to change. 1 is barely noticeable, 10 is the worst imaginable."
        accessibilityValue={{
          min: MIN_SCORE,
          max: MAX_SCORE,
          now: value,
          text: `${value} out of 10, ${band}`,
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') commit(valueRef.current + 1);
          if (e.nativeEvent.actionName === 'decrement') commit(valueRef.current - 1);
        }}
      >
        <View style={styles.bands} pointerEvents="none">
          <View style={[styles.band, { flex: 3, backgroundColor: Palette.band1 }]} />
          <View style={[styles.band, { flex: 4, backgroundColor: Palette.band2 }]} />
          <View style={[styles.band, { flex: 3, backgroundColor: Palette.band3 }]} />
        </View>
        <View style={styles.ticks} pointerEvents="none">
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={styles.tickCell}>
              <View style={styles.tick} />
            </View>
          ))}
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumbRing, { left: thumbCenter - THUMB / 2 }]}
        >
          <View style={styles.thumbDot} />
        </View>
      </View>

      <View style={styles.bandLabels}>
        <Text style={[styles.bandText, { flex: 3 }]}>Mild 1–3</Text>
        <Text style={[styles.bandText, styles.bandMid, { flex: 4 }]}>Moderate 4–7</Text>
        <Text style={[styles.bandText, { flex: 3, textAlign: 'right' }]}>Severe 8–10</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: 11, marginBottom: 9 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: Fonts.sansSemi, fontSize: 14, color: Palette.nearBlack },
  caption: { fontFamily: Fonts.sans, fontSize: 12, color: Palette.muted, marginTop: 2 },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  scoreNumber: { fontFamily: Fonts.serif, fontSize: 29, lineHeight: 32, color: Palette.nearBlack },
  scoreMax: { fontFamily: Fonts.sansMedium, fontSize: 12, color: Palette.muted },
  scoreBand: { fontFamily: Fonts.sansSemi, fontSize: 12, color: Palette.sage, marginLeft: 4 },
  rail: { height: MIN_TOUCH, justifyContent: 'center' },
  bands: { flexDirection: 'row', gap: 2, height: 8 },
  band: { height: 8, borderRadius: 8 },
  ticks: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' },
  tickCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tick: { width: 1, height: 7, backgroundColor: Palette.tick },
  thumbRing: {
    position: 'absolute',
    top: (MIN_TOUCH - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Palette.white,
    borderWidth: 2,
    borderColor: Palette.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.sage },
  bandLabels: { flexDirection: 'row', gap: 2 },
  bandText: { fontFamily: Fonts.sans, fontSize: 11, color: Palette.muted },
  bandMid: { textAlign: 'center', color: Palette.sage, fontFamily: Fonts.sansSemi },
});
