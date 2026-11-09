import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotoSans_400Regular, NotoSans_500Medium, NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans';
import { NotoSerifDisplay_500Medium } from '@expo-google-fonts/noto-serif-display';
import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';

import { SymptomsProvider } from '@/context/SymptomsContext';
import OnboardingScreen from '@/components/OnboardingScreen';
import { Palette } from '@/constants/colors';

const ONBOARDING_KEY = 'onboarding-seen';

export const unstable_settings = {
  anchor: '(tabs)',
};

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Palette.white,
    card: Palette.white,
    text: Palette.nearBlack,
    border: Palette.border,
    primary: Palette.sage,
  },
};

export default function RootLayout() {
  const [checking, setChecking] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    NotoSerifDisplay_500Medium,
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
  });

  useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(!seen);
      setChecking(false);
    })();
  }, []);

  async function dismissOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  }

  // If fonts fail to load, carry on with system fonts rather than blocking the app.
  if (checking || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.white }}>
        <ActivityIndicator color={Palette.sage} />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <SymptomsProvider>
        <OnboardingScreen onDone={dismissOnboarding} />
        <StatusBar style="dark" />
      </SymptomsProvider>
    );
  }

  return (
    <SymptomsProvider>
      <ThemeProvider value={AppTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </SymptomsProvider>
  );
}
