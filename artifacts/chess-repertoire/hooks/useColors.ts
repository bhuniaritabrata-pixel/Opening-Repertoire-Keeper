import { useMemo } from "react";
import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { resolvedScheme } = useTheme();
  return useMemo(() => {
    const palette = resolvedScheme === "dark" ? colors.dark : colors.light;
    return { ...palette, radius: colors.radius };
  }, [resolvedScheme]);
}
