import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useBoard } from "@/context/BoardContext";

export default function EvalBar() {
  const { evaluation, mateIn, flipped, analysisEnabled } = useBoard();
  const animVal = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!analysisEnabled || evaluation === null) return;

    // Convert centipawns to bar percentage (0 = all black, 1 = all white)
    let pct: number;
    if (mateIn !== null) {
      pct = mateIn > 0 ? 0.95 : 0.05;
    } else {
      const capped = Math.max(-800, Math.min(800, evaluation));
      pct = 0.5 + capped / 1600;
    }

    Animated.spring(animVal, {
      toValue: pct,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [evaluation, mateIn, analysisEnabled]);

  if (!analysisEnabled) return null;

  const whiteHeight = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ["5%", "95%"],
  });

  const displayEval = () => {
    if (evaluation === null) return "=";
    if (mateIn !== null) return `M${Math.abs(mateIn)}`;
    const abs = Math.abs(evaluation / 100);
    const sign = evaluation > 0 ? "+" : evaluation < 0 ? "-" : "";
    return `${sign}${abs.toFixed(1)}`;
  };

  const evalStr = displayEval();
  const isWhiteWinning = evaluation !== null ? evaluation > 0 : false;

  return (
    <View style={[styles.container, flipped && styles.flipped]}>
      <View style={styles.barContainer}>
        {/* Black side */}
        <View style={styles.blackSide} />
        {/* White side animated */}
        <Animated.View style={[styles.whiteSide, { height: whiteHeight }]} />
      </View>
      <Text style={[styles.evalText, { color: isWhiteWinning ? "#1a1a1a" : "#f0f0f0" }]}>
        {evalStr}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    alignItems: "center",
    marginRight: 6,
  },
  flipped: {
    transform: [{ scaleY: -1 }],
  },
  barContainer: {
    width: 20,
    flex: 1,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  blackSide: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2d2d2d",
  },
  whiteSide: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#f0f0f0",
  },
  evalText: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
});
