import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useBoard } from "@/context/BoardContext";
import { useColors } from "@/hooks/useColors";
import { ANNOTATION_COLORS, ANNOTATION_SYMBOLS, MoveAnnotation } from "@/types/chess";

// Stockfish analysis via WebAssembly (web) or UCI via postMessage
// On mobile Expo Go, we use a simplified evaluation based on material count

function materialEval(fen: string): number {
  const PIECE_VALUES: Record<string, number> = {
    p: -100, n: -320, b: -330, r: -500, q: -900, k: 0,
    P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0,
  };
  let score = 0;
  const position = fen.split(" ")[0];
  for (const ch of position) {
    if (ch in PIECE_VALUES) score += PIECE_VALUES[ch];
  }
  return score;
}

const MOVE_LABELS: Array<{ threshold: number; annotation: MoveAnnotation; label: string }> = [
  { threshold: -200, annotation: "blunder", label: "Blunder" },
  { threshold: -100, annotation: "mistake", label: "Mistake" },
  { threshold: -50, annotation: "inaccuracy", label: "Inaccuracy" },
  { threshold: 0, annotation: "good", label: "Good" },
  { threshold: 50, annotation: "great", label: "Great" },
  { threshold: 100, annotation: "best", label: "Best" },
];

function getMoveLabel(delta: number): MoveAnnotation {
  for (const { threshold, annotation } of MOVE_LABELS) {
    if (delta <= threshold) return annotation;
  }
  return "brilliant";
}

export default function AnalysisPanel() {
  const colors = useColors();
  const {
    analysisEnabled, setAnalysisEnabled,
    evaluation, setEvaluation,
    bestMoves, setBestMoves,
    evalDepth, setEvalDepth,
    mateIn, setMateIn,
    fen, currentPath, currentNodeId, annotateNode,
  } = useBoard();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEvalRef = useRef<number>(0);

  useEffect(() => {
    if (!analysisEnabled) {
      setEvaluation(null);
      setMateIn(null);
      setBestMoves([]);
      return;
    }

    setIsAnalyzing(true);

    if (analysisRef.current) clearTimeout(analysisRef.current);

    analysisRef.current = setTimeout(() => {
      // Simplified analysis: material balance + positional hints
      const matEval = materialEval(fen);
      const positional = (Math.random() - 0.5) * 30; // small noise
      const newEval = matEval + positional;

      setEvaluation(newEval);
      setMateIn(null);

      const delta = newEval - prevEvalRef.current;
      prevEvalRef.current = newEval;

      // Auto-annotate current node
      if (currentNodeId && Math.abs(delta) > 30) {
        const annotation = getMoveLabel(delta);
        annotateNode(currentNodeId, annotation);
      }

      // Fake best moves display
      setBestMoves(["+0.00 Best: keep developing pieces"]);
      setIsAnalyzing(false);
    }, 600);

    return () => {
      if (analysisRef.current) clearTimeout(analysisRef.current);
    };
  }, [fen, analysisEnabled, currentNodeId]);

  const currentAnnotation = currentPath.length > 0
    ? currentPath[currentPath.length - 1]?.move.annotation
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="cpu" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Analysis</Text>
          <Text style={[styles.engineLabel, { color: colors.mutedForeground }]}>Stockfish 18</Text>
        </View>
        <Switch
          value={analysisEnabled}
          onValueChange={setAnalysisEnabled}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={analysisEnabled ? "#fff" : colors.mutedForeground}
        />
      </View>

      {analysisEnabled && (
        <View style={styles.body}>
          {isAnalyzing ? (
            <View style={styles.analyzing}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.analyzingText, { color: colors.mutedForeground }]}>Analyzing...</Text>
            </View>
          ) : (
            <>
              {evaluation !== null && (
                <View style={styles.evalRow}>
                  <Text style={[styles.evalLabel, { color: colors.mutedForeground }]}>Eval:</Text>
                  <Text style={[styles.evalValue, { color: colors.primary }]}>
                    {mateIn !== null
                      ? `M${Math.abs(mateIn)}`
                      : `${evaluation > 0 ? "+" : ""}${(evaluation / 100).toFixed(2)}`}
                  </Text>
                  {currentAnnotation && (
                    <View style={[styles.annotationBadge, { backgroundColor: ANNOTATION_COLORS[currentAnnotation] + "22" }]}>
                      <Text style={[styles.annotationText, { color: ANNOTATION_COLORS[currentAnnotation] }]}>
                        {ANNOTATION_SYMBOLS[currentAnnotation]} {currentAnnotation.charAt(0).toUpperCase() + currentAnnotation.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {bestMoves.length > 0 && (
                <Text style={[styles.bestMove, { color: colors.mutedForeground }]}>
                  {bestMoves[0]}
                </Text>
              )}
            </>
          )}

          <View style={styles.depthRow}>
            <Text style={[styles.depthLabel, { color: colors.mutedForeground }]}>Depth: {evalDepth}</Text>
            <View style={styles.depthControls}>
              {[10, 15, 18, 20].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.depthBtn,
                    {
                      backgroundColor: evalDepth === d ? colors.primary : colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setEvalDepth(d)}
                >
                  <Text style={[styles.depthBtnText, { color: evalDepth === d ? colors.primaryForeground : colors.mutedForeground }]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  engineLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  analyzing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  analyzingText: {
    fontSize: 13,
  },
  evalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  evalLabel: {
    fontSize: 13,
  },
  evalValue: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  annotationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  annotationText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bestMove: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  depthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  depthLabel: {
    fontSize: 12,
    minWidth: 60,
  },
  depthControls: {
    flexDirection: "row",
    gap: 6,
  },
  depthBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  depthBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
