import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { Palette } from '@/constants/colors';
import { Fonts } from '@/constants/typography';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

// One button for the whole app: 48pt tall, 8pt radius, flat.
export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: Props) {
  const v = VARIANTS[variant];
  return (
    <TouchableOpacity
      style={[styles.base, v.button, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <Text style={[styles.label, v.label]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const VARIANTS = {
  primary: {
    button: { backgroundColor: Palette.sage, borderColor: Palette.sage },
    label: { color: Palette.white },
    spinner: Palette.white,
  },
  secondary: {
    button: { backgroundColor: Palette.white, borderColor: Palette.sage },
    label: { color: Palette.sage },
    spinner: Palette.sage,
  },
  text: {
    button: { backgroundColor: 'transparent', borderColor: 'transparent' },
    label: { color: Palette.sage },
    spinner: Palette.sage,
  },
  danger: {
    button: { backgroundColor: Palette.white, borderColor: Palette.danger },
    label: { color: Palette.danger },
    spinner: Palette.danger,
  },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  label: { fontFamily: Fonts.sansSemi, fontSize: 14 },
  disabled: { opacity: 0.45 },
});
