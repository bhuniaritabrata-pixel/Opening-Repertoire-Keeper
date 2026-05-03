import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "auto" | "light" | "dark";
export type SplashType = "animated" | "classic";

interface ThemeContextType {
  themeMode:      ThemeMode;
  setThemeMode:   (mode: ThemeMode) => void;
  splashType:     SplashType;
  setSplashType:  (type: SplashType) => void;
  resolvedScheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY  = "@chess_theme";
const SPLASH_KEY = "@chess_splash_type";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode,  setThemeModeState]  = useState<ThemeMode>("auto");
  const [splashType, setSplashTypeState] = useState<SplashType>("animated");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(SPLASH_KEY),
    ]).then(([td, sd]) => {
      if (td === "light" || td === "dark" || td === "auto") setThemeModeState(td);
      if (sd === "animated" || sd === "classic")            setSplashTypeState(sd);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode);
  }, []);

  const setSplashType = useCallback((type: SplashType) => {
    setSplashTypeState(type);
    AsyncStorage.setItem(SPLASH_KEY, type);
  }, []);

  const resolvedScheme = useMemo<"light" | "dark">(() => {
    if (themeMode === "light") return "light";
    if (themeMode === "dark")  return "dark";
    return systemScheme === "dark" ? "dark" : "light";
  }, [themeMode, systemScheme]);

  const value = useMemo<ThemeContextType>(() => ({
    themeMode, setThemeMode,
    splashType, setSplashType,
    resolvedScheme,
  }), [themeMode, setThemeMode, splashType, setSplashType, resolvedScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
