import { useMemo } from "react";
import { useColorScheme } from "react-native";
import colors from "@/constants/colors";

export function useColors() {
  const scheme = useColorScheme();
  // useMemo keeps the returned object reference stable so memo deps that
  // include `colors` don't fire on every render — only on actual theme change.
  return useMemo(() => {
    const palette = scheme === "dark" ? colors.dark : colors.light;
    return { ...palette, radius: colors.radius };
  }, [scheme]);
}
