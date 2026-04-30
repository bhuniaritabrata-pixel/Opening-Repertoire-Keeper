import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useBoard } from "@/context/BoardContext";
import { useColors } from "@/hooks/useColors";

export default function BoardControls() {
  const colors = useColors();
  const { goBack, goForward, goToStart, goToEnd, flipped, setFlipped, currentPath, locked, setLocked } = useBoard();

  const handlePress = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  const canGoBack = currentPath.length > 0;
  const canGoForward = true; // We check inside goForward

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.btn, !canGoBack && styles.disabled]}
        onPress={() => handlePress(goToStart)}
        disabled={!canGoBack}
      >
        <Feather name="skip-back" size={20} color={canGoBack ? colors.primary : colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, !canGoBack && styles.disabled]}
        onPress={() => handlePress(goBack)}
        disabled={!canGoBack}
      >
        <Feather name="chevron-left" size={22} color={canGoBack ? colors.foreground : colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => handlePress(goForward)}
      >
        <Feather name="chevron-right" size={22} color={colors.foreground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => handlePress(goToEnd)}
      >
        <Feather name="skip-forward" size={20} color={colors.primary} />
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <TouchableOpacity
        style={styles.btn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setFlipped(!flipped);
        }}
      >
        <Feather name="refresh-cw" size={20} color={colors.accent} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.btn,
          locked && { backgroundColor: colors.destructive + "22" },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setLocked(!locked);
        }}
        accessibilityLabel={locked ? "Unlock board (resume recording)" : "Lock board (free play, don't record)"}
      >
        <Feather
          name={locked ? "lock" : "unlock"}
          size={20}
          color={locked ? colors.destructive : colors.accent}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    marginTop: 8,
  },
  btn: {
    width: 42,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  disabled: {
    opacity: 0.3,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
});
