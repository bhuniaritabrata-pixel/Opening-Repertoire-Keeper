import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBoard } from "@/context/BoardContext";
import { useEngine } from "@/context/EngineContext";
import { useColors } from "@/hooks/useColors";
import { ANNOTATION_COLORS, ANNOTATION_SYMBOLS, MoveAnnotation } from "@/types/chess";
import EngineSlotModal from "@/components/EngineSlotModal";

function materialEval(fen: string): number {
  const VALUES: Record<string, number> = {
    p: -100, n: -320, b: -330, r: -500, q: -900, k: 0,
    P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0,
  };
  let score = 0;
  for (const ch of fen.split(" ")[0]) {
    if (ch in VALUES) score += VALUES[ch];
  }
  return score;
}

const MOVE_LABELS: Array<{ threshold: number; annotation: MoveAnnotation }> = [
  { threshold: -200, annotation: "blunder" },
  { threshold: -100, annotation: "mistake" },
  { threshold: -50,  annotation: "inaccuracy" },
  { threshold: 0,    annotation: "good" },
  { threshold: 50,   annotation: "great" },
  { threshold: 100,  annotation: "best" },
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

  const {
    engineType, externalConfig,
    connectionStatus, connectionError,
    connectEngine, disconnectEngine,
    engine,
  } = useEngine();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showEngineSlot, setShowEngineSlot] = useState(false);
  const analysisRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEvalRef = useRef<number>(0);

  // Auto-connect external engine when analysis is enabled
  useEffect(() => {
    if (analysisEnabled && engineType === "external" && connectionStatus === "idle") {
      connectEngine();
    }
  }, [analysisEnabled, engineType, connectionStatus]);

  useEffect(() => {
    if (!analysisEnabled) {
      setEvaluation(null);
      setMateIn(null);
      setBestMoves([]);
      setIsAnalyzing(false);
      if (analysisRef.current) clearTimeout(analysisRef.current);
      return;
    }

    setIsAnalyzing(true);
    if (analysisRef.current) clearTimeout(analysisRef.current);

    // Use external UCI engine if connected
    if (engineType === "external" && engine?.isReady()) {
      engine.analyze(fen, evalDepth, (result) => {
        if (result.score !== null) setEvaluation(result.score);
        if (result.mate !== null) { setMateIn(result.mate); setEvaluation(null); }

        if (result.pv.length > 0) {
          const evalStr = result.mate !== null
            ? `M${Math.abs(result.mate)}`
            : `${(result.score ?? 0) > 0 ? "+" : ""}${((result.score ?? 0) / 100).toFixed(2)}`;
          setBestMoves([`Depth ${result.depth}  ${evalStr}  Best: ${result.pv.slice(0, 3).join(" ")}`]);
        }

        const delta = (result.score ?? prevEvalRef.current) - prevEvalRef.current;
        prevEvalRef.current = result.score ?? prevEvalRef.current;
        if (currentNodeId && Math.abs(delta) > 30) {
          annotateNode(currentNodeId, getMoveLabel(delta));
        }
        setIsAnalyzing(false);
      });
      return;
    }

    // Fallback: built-in material evaluation
    analysisRef.current = setTimeout(() => {
      const matEval = materialEval(fen);
      const positional = (Math.random() - 0.5) * 20;
      const newEval = matEval + positional;

      setEvaluation(newEval);
      setMateIn(null);

      const delta = newEval - prevEvalRef.current;
      prevEvalRef.current = newEval;
      if (currentNodeId && Math.abs(delta) > 30) {
        annotateNode(currentNodeId, getMoveLabel(delta));
      }
      setBestMoves(["+0.00  Best: keep developing pieces"]);
      setIsAnalyzing(false);
    }, 600);

    return () => { if (analysisRef.current) clearTimeout(analysisRef.current); };
  }, [fen, analysisEnabled, currentNodeId, engineType, connectionStatus]);

  const currentAnnotation = currentPath.length > 0
    ? currentPath[currentPath.length - 1]?.move.annotation
    : undefined;

  const engineName = engineType === "external" && externalConfig
    ? externalConfig.name
    : "Built-in";

  const extStatusColor: Record<string, string> = {
    idle:         colors.mutedForeground,
    connecting:   colors.primary,
    ready:        "#4caf50",
    error:        colors.destructive,
    disconnected: colors.destructive,
  };

  const extStatusIcon: Record<string, string> = {
    idle:         "zap",
    connecting:   "loader",
    ready:        "check-circle",
    error:        "alert-circle",
    disconnected: "wifi-off",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="cpu" size={16} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Analysis</Text>

          {/* Engine selector chip */}
          <TouchableOpacity
            style={[styles.engineChip, { backgroundColor: colors.muted + "60", borderColor: colors.border }]}
            onPress={() => setShowEngineSlot(true)}
          >
            <Feather
              name={extStatusIcon[engineType === "external" ? connectionStatus : "idle"] as any}
              size={11}
              color={engineType === "external" ? extStatusColor[connectionStatus] : colors.mutedForeground}
            />
            <Text style={[styles.engineChipText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {engineName}
            </Text>
            <Feather name="chevron-down" size={11} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Switch
          value={analysisEnabled}
          onValueChange={setAnalysisEnabled}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={analysisEnabled ? "#fff" : colors.mutedForeground}
        />
      </View>

      {/* External engine status banner */}
      {analysisEnabled && engineType === "external" && connectionStatus !== "ready" && (
        <TouchableOpacity
          style={[styles.statusBanner, {
            backgroundColor: extStatusColor[connectionStatus] + "15",
            borderColor: extStatusColor[connectionStatus] + "44",
          }]}
          onPress={connectionStatus === "idle" || connectionStatus === "disconnected" || connectionStatus === "error"
            ? connectEngine
            : undefined}
        >
          <Feather
            name={extStatusIcon[connectionStatus] as any}
            size={13}
            color={extStatusColor[connectionStatus]}
          />
          <Text style={[styles.statusBannerText, { color: extStatusColor[connectionStatus] }]}>
            {connectionStatus === "connecting" && "Connecting to engine…"}
            {connectionStatus === "idle"       && "Tap to connect external engine"}
            {connectionStatus === "disconnected" && "Disconnected — tap to reconnect"}
            {connectionStatus === "error"      && `Error: ${connectionError ?? "connection failed"} — tap to retry`}
          </Text>
        </TouchableOpacity>
      )}

      {analysisEnabled && (
        <View style={styles.body}>
          {isAnalyzing ? (
            <View style={styles.analyzing}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.analyzingText, { color: colors.mutedForeground }]}>
                {engineType === "external" && engine?.isReady() ? `Analyzing (depth ${evalDepth})…` : "Analyzing…"}
              </Text>
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
                        {ANNOTATION_SYMBOLS[currentAnnotation]}{" "}
                        {currentAnnotation.charAt(0).toUpperCase() + currentAnnotation.slice(1)}
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

          {/* Depth row */}
          <View style={styles.depthRow}>
            <Text style={[styles.depthLabel, { color: colors.mutedForeground }]}>Depth: {evalDepth}</Text>
            <View style={styles.depthControls}>
              {[10, 15, 18, 20].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.depthBtn, {
                    backgroundColor: evalDepth === d ? colors.primary : colors.muted,
                    borderColor: colors.border,
                  }]}
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

      <EngineSlotModal visible={showEngineSlot} onClose={() => setShowEngineSlot(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 8 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  title: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  engineChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    maxWidth: 160,
  },
  engineChipText: { fontSize: 11, fontWeight: "600", flexShrink: 1 },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 12, marginBottom: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
  },
  statusBannerText: { fontSize: 12, fontWeight: "600", flex: 1 },
  body: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  analyzing: { flexDirection: "row", alignItems: "center", gap: 8 },
  analyzingText: { fontSize: 13 },
  evalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  evalLabel: { fontSize: 13 },
  evalValue: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  annotationBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  annotationText: { fontSize: 12, fontWeight: "700" },
  bestMove: { fontSize: 12, fontFamily: "Inter_400Regular" },
  depthRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  depthLabel: { fontSize: 12, minWidth: 60 },
  depthControls: { flexDirection: "row", gap: 6 },
  depthBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  depthBtnText: { fontSize: 12, fontWeight: "600" },
});
