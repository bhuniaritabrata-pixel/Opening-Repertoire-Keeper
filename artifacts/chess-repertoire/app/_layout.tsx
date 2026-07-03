import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AnimatedSplash from "@/components/AnimatedSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RepertoireProvider } from "@/context/RepertoireContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { preloadPieces } from "@/utils/PieceCache";

// Kick off piece SVG fetch immediately — long before the board is rendered.
// This is a fire-and-forget; the cache will be populated by the time
// the user navigates to a board screen.
preloadPieces();

SplashScreen.preventAutoHideAsync();

// Module-level flag: animated splash plays once per process lifetime
let splashHasPlayed = false;

// The animated splash relies on Animated with useNativeDriver, which has no
// native driver on web and falls back to a slow JS-thread animation. That
// makes the splash appear to hang for many seconds in the web preview, so we
// skip it entirely on web and go straight to the app.
const SKIP_ANIMATED_SPLASH = Platform.OS === "web";

function AppContent() {
  const { splashType } = useTheme();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(
    !SKIP_ANIMATED_SPLASH && splashType === "animated" && !splashHasPlayed
  );

  // Keep `showAnimatedSplash` in sync if splashType loads async from storage.
  // We only want to show it if it hasn't played yet.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      if (!SKIP_ANIMATED_SPLASH && splashType === "animated" && !splashHasPlayed) {
        setShowAnimatedSplash(true);
      }
    }
  }, [splashType]);

  const handleSplashFinish = () => {
    splashHasPlayed = true;
    setShowAnimatedSplash(false);
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="board/[id]"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="drill/[id]"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
      </Stack>

      {showAnimatedSplash && (
        <AnimatedSplash onFinish={handleSplashFinish} />
      )}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <RepertoireProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              {(fontsLoaded || fontError) ? <AppContent /> : null}
            </GestureHandlerRootView>
          </RepertoireProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
