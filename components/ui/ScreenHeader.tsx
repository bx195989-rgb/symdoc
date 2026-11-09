import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

type Props = {
  kicker?: string;
  title: string;
  lede?: string;
};

// Shared page heading: small uppercase kicker, serif title, one-line lede.
export default function ScreenHeader({ kicker, title, lede }: Props) {
  return (
    <View style={styles.wrap}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {lede ? <Text style={styles.lede}>{lede}</Text> : null}
    </View>
  );
}

// Top padding for screens that have no native header.
export function useScreenTopPadding() {
  const insets = useSafeAreaInsets();
  return insets.top + 15;
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  kicker: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: Palette.sage,
    marginBottom: 5,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 29,
    lineHeight: 33,
    letterSpacing: -0.7,
    color: Palette.nearBlack,
  },
  lede: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.muted,
    marginTop: 7,
  },
});
