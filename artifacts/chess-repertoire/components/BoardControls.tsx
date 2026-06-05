import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useBoard } from "@/context/BoardContext";
import { useColors } from "@/hooks/useColors";

export default memo(function BoardControls() {
  const colors = useColors();
  const {
    goBack, goForward, goToStart, goToEnd,
    flipped, setFlipped,
    currentMoveIndex, moves,
  } = useBoard();

  const canGoBack    = currentMoveIndex > 0;
  const canGoForward = currentMoveIndex < moves.length;

  const press = (fn: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.btn, !canGoBack && styles.disabled]}
        onPress={() => press(goToStart)}
        disabled={!canGoBack}
      >
        <Feather name="skip-back" size={20} color={canGoBack ? colors.primary : colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, !canGoBack && styles.disabled]}
        onPress={() => press(goBack)}
        disabled={!canGoBack}
      >
        <Feather name="chevron-left" size={22} color={canGoBack ? colors.foreground : colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, !canGoForward && styles.disabled]}
        onPress={() => press(goForward)}
        disabled={!canGoForward}
      >
        <Feather name="chevron-right" size={22} color={canGoForward ? colors.foreground : colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, !canGoForward && styles.disabled]}
        onPress={() => press(goToEnd)}
        disabled={!canGoForward}
      >
        <Feather name="skip-forward" size={20} color={canGoForward ? colors.primary : colors.mutedForeground} />
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
    </View>
  );
});

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
  btn:      { width: 42, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 8 },
  disabled: { opacity: 0.3 },
  divider:  { width: 1, height: 24, marginHorizontal: 4 },
});
