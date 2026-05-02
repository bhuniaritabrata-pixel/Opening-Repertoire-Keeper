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
import { analyzePosition, evalBarPercent, EngineResult } from "@/utils/chessEngine";
import { parseFenToBoard } from "@/utils/chess";

// ─── CPL-based move classification ───────────────────────────────────────────
// cpl = centipawn loss for the side that just moved (positive = bad, negative = gained)
// Thresholds match Lichess/Chess.com conventions:
//   brilliant  cpl ≤ −50   (gained significantly — sacrifice / deep find)
//   best       cpl ≤  10   (near-optimal)
//   great      cpl ≤  25
//   good       cpl ≤  60
//   inaccuracy cpl ≤ 120
//   mistake    cpl ≤ 250
//   blunder    cpl >  250
function classifyCPL(cpl: number): MoveAnnotation {
  if (cpl <= -50)  return "brilliant";
  if (cpl <=  10)  return "best";
  if (cpl <=  25)  return "great";
  if (cpl <=  60)  return "good";
  if (cpl <= 120)  return "inaccuracy";
  if (cpl <= 250)  return "mistake";
  return "blunder";
}

/**
 * Compute centipawn loss for the side that JUST moved.
 * prevScore and newScore are both from White's perspective.
 * fenAfter is the FEN after the move — its active color tells us who just moved.
 */
function computeCPL(prevScore: number, newScore: number, fenAfter: string): number {
  const state = parseFenToBoard(fenAfter);
  // active color in fenAfter = side to move NOW = opponent of who just moved
  const whiteJustMoved = state.activeColor === "b";
  if (whiteJustMoved) {
    // White just moved: good if eval stayed high → loss = prevScore − newScore
    return prevScore - newScore;
  } else {
    // Black just moved: good if eval dropped → loss = newScore − prevScore
    return newScore - prevScore;
  }
}

// ─── Eval bar (vertical, White on bottom) ────────────────────────────────────
function EvalBar({ pct, mateIn, evaluation }: { pct: number; mateIn: number | null; evaluation: number | null }) {
  const colors = useColors();
  const whiteH = pct;  // percentage for white
  const blackH = 100 - pct;

  const label = mateIn !== null
    ? `M${Math.abs(mateIn)}`
    : evaluation !== null
      ? `${evaluation >= 0 ? "+" : ""}${(evaluation / 100).toFixed(1)}`
      : "0.0";

  return (
    <View style={styles.evalBarContainer}>
      <View style={[styles.evalBarTrack, { backgroundColor: "#1a1a1a" }]}>
        {/* White portion — bottom */}
        <View
          style={[
            styles.evalBarFill,
            { height: `${whiteH}%`, backgroundColor: "#f0f0f0" },
          ]}
        />
      </View>
      <Text style={[styles.evalBarLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnalysisPanel() {
  const colors = useColors();
  const {
    analysisEnabled, setAnalysisEnabled,
    evaluation, setEvaluation,
    bestMoves, setBestMoves,
    evalDepth, setEvalDepth,
    mateIn, setMateIn,
    fen, currentPath, currentNodeId, annotateNode,
    setBestMoveArrow,
  } = useBoard();

  const {
    activeSlot, externalConfig,
    connectionStatus, connectionError,
    connectEngine, engine,
  } = useEngine();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentDepth, setCurrentDepth] = useState(0);
  const [showEngineSlot, setShowEngineSlot] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  // Tracks the FINAL eval of the last completed position search (always white's perspective)
  const completedEvalRef = useRef<{ score: number; fen: string } | null>(null);

  // Auto-connect external engine
  useEffect(() => {
    if (analysisEnabled && activeSlot === "external" && connectionStatus === "idle") {
      connectEngine();
    }
  }, [analysisEnabled, activeSlot, connectionStatus]);

  // Main analysis effect
  useEffect(() => {
    cancelRef.current?.();
    cancelRef.current = null;

    if (!analysisEnabled) {
      setEvaluation(null);
      setMateIn(null);
      setBestMoves([]);
      setIsAnalyzing(false);
      setCurrentDepth(0);
      setBestMoveArrow(null);
      return;
    }

    // Helper: parse UCI move string "e2e4" → arrow { from, to }
    const parseArrow = (uci: string) =>
      uci.length >= 4 ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : null;

    // Clear arrow for new position
    setBestMoveArrow(null);

    // ── External UCI engine ───────────────────────────────────────────────
    if (activeSlot === "external" && engine?.isReady()) {
      setIsAnalyzing(true);
      engine.analyze(fen, evalDepth, (result) => {
        const score = result.score ?? 0;
        if (result.mate !== null) { setMateIn(result.mate); setEvaluation(null); }
        else { setEvaluation(score); setMateIn(null); }
        setCurrentDepth(result.depth);

        // Arrow for best move
        if (result.pv.length > 0) {
          const evalStr = result.mate !== null
            ? `M${Math.abs(result.mate)}`
            : `${score >= 0 ? "+" : ""}${(score / 100).toFixed(2)}`;
          setBestMoves([`${evalStr}  ${result.pv.slice(0, 4).join(" ")}`]);
          const arrow = parseArrow(result.pv[0]);
          if (arrow) setBestMoveArrow(arrow);
        }

        // Annotate / update badge at every depth result
        if (currentNodeId) {
          const prev = completedEvalRef.current;
          if (prev && prev.fen !== fen) {
            const cpl = computeCPL(prev.score, score, fen);
            annotateNode(currentNodeId, classifyCPL(cpl));
          }
          completedEvalRef.current = { score, fen };
        }
        setIsAnalyzing(false);
      });
      return;
    }

    // ── Built-in JS engine (iterative deepening) ──────────────────────────
    setIsAnalyzing(true);
    setCurrentDepth(0);

    const cancel = analyzePosition(fen, evalDepth, (result: EngineResult) => {
      setCurrentDepth(result.depth);

      const score = result.score;
      if (result.mate !== null) { setMateIn(result.mate); setEvaluation(null); }
      else { setEvaluation(score); setMateIn(null); }

      const evalStr = result.mate !== null
        ? `M${Math.abs(result.mate)}`
        : `${score >= 0 ? "+" : ""}${(score / 100).toFixed(2)}`;
      setBestMoves([`${evalStr}  Best: ${result.bestMove}  (d${result.depth})`]);

      // Arrow: update at every depth so it gets more accurate as search deepens
      const arrow = parseArrow(result.bestMove);
      if (arrow) setBestMoveArrow(arrow);

      // Badge: update at every depth ≥ 3 so it refines as engine thinks deeper
      if (currentNodeId && result.depth >= Math.min(evalDepth, 3)) {
        const prev = completedEvalRef.current;
        if (prev && prev.fen !== fen) {
          const cpl = computeCPL(prev.score, score, fen);
          annotateNode(currentNodeId, classifyCPL(cpl));
        }
      }

      // When fully complete, record as reference eval for the next move comparison
      if (result.depth >= evalDepth) {
        completedEvalRef.current = { score, fen };
        setIsAnalyzing(false);
      }
    });

    cancelRef.current = cancel;
    return () => { cancel(); cancelRef.current = null; setBestMoveArrow(null); };
  }, [fen, analysisEnabled, evalDepth, activeSlot, connectionStatus]);

  // ─── Derived display values ────────────────────────────────────────────────
  const pct = evalBarPercent(evaluation ?? 0, mateIn);
  const currentAnnotation = currentPath.length > 0
    ? currentPath[currentPath.length - 1]?.move.annotation
    : undefined;

  const engineLabel =
    activeSlot === "external" && externalConfig
      ? externalConfig.name
      : activeSlot === "oex"
        ? "OEX Engine"
        : "Built-in";

  const chipStatus = activeSlot === "external"
    ? connectionStatus
    : "ready";

  const chipColor: Record<string, string> = {
    idle: colors.mutedForeground,
    connecting: colors.primary,
    ready: activeSlot === "builtin" ? colors.mutedForeground : "#4caf50",
    error: colors.destructive,
    disconnected: colors.destructive,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="cpu" size={15} color={colors.primary} />
          <Text style={[styles.title, { color: colors.foreground }]}>Analysis</Text>

          <TouchableOpacity
            style={[styles.engineChip, { backgroundColor: colors.muted + "60", borderColor: colors.border }]}
            onPress={() => setShowEngineSlot(true)}
          >
            <View style={[styles.chipDot, { backgroundColor: chipColor[chipStatus] }]} />
            <Text style={[styles.engineChipText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {engineLabel}
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

      {/* ── Status banner (external engine not connected) ─────────────────── */}
      {analysisEnabled && activeSlot === "external" && connectionStatus !== "ready" && (
        <TouchableOpacity
          style={[styles.statusBanner, {
            backgroundColor: chipColor[connectionStatus] + "15",
            borderColor: chipColor[connectionStatus] + "44",
          }]}
          onPress={connectionStatus !== "connecting" ? connectEngine : undefined}
        >
          <Feather name="wifi-off" size={13} color={chipColor[connectionStatus]} />
          <Text style={[styles.statusBannerText, { color: chipColor[connectionStatus] }]}>
            {connectionStatus === "connecting" && "Connecting to engine…"}
            {connectionStatus === "idle" && "Tap to connect external engine"}
            {connectionStatus === "disconnected" && "Disconnected — tap to reconnect"}
            {connectionStatus === "error" && `Error: ${connectionError ?? "connection failed"} — tap to retry`}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      {analysisEnabled && (
        <View style={styles.body}>
          {/* Eval bar + score row */}
          <View style={styles.evalSection}>
            <EvalBar pct={pct} mateIn={mateIn} evaluation={evaluation} />

            <View style={styles.evalRight}>
              {isAnalyzing && currentDepth === 0 ? (
                <View style={styles.analyzingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.analyzingText, { color: colors.mutedForeground }]}>
                    Thinking…
                  </Text>
                </View>
              ) : (
                <>
                  {/* Score */}
                  <View style={styles.scoreRow}>
                    <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                      {mateIn !== null
                        ? `M${Math.abs(mateIn)}`
                        : evaluation !== null
                          ? `${evaluation >= 0 ? "+" : ""}${(evaluation / 100).toFixed(2)}`
                          : "+0.00"}
                    </Text>
                    {isAnalyzing && (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />
                    )}
                  </View>

                  {/* Depth + annotation */}
                  <View style={styles.metaRow}>
                    <Text style={[styles.depthText, { color: colors.mutedForeground }]}>
                      depth {currentDepth}
                    </Text>
                    {currentAnnotation && (
                      <View style={[styles.annotationBadge, { backgroundColor: ANNOTATION_COLORS[currentAnnotation] + "22" }]}>
                        <Text style={[styles.annotationText, { color: ANNOTATION_COLORS[currentAnnotation] }]}>
                          {ANNOTATION_SYMBOLS[currentAnnotation]} {currentAnnotation}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Best move line */}
                  {bestMoves.length > 0 && (
                    <Text style={[styles.pvLine, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {bestMoves[0]}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Depth selector */}
          <View style={styles.depthRow}>
            <Text style={[styles.depthLabel, { color: colors.mutedForeground }]}>Depth</Text>
            <View style={styles.depthBtns}>
              {[3, 4, 5, 6].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.depthBtn, {
                    backgroundColor: evalDepth === d ? colors.primary : colors.muted,
                    borderColor: colors.border,
                  }]}
                  onPress={() => setEvalDepth(d)}
                >
                  <Text style={[styles.depthBtnText, {
                    color: evalDepth === d ? colors.primaryForeground : colors.mutedForeground,
                  }]}>
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
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    maxWidth: 170,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  engineChipText: { fontSize: 11, fontWeight: "600", flexShrink: 1 },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 12, marginBottom: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
  },
  statusBannerText: { fontSize: 12, fontWeight: "600", flex: 1 },
  body: { paddingHorizontal: 10, paddingBottom: 10, gap: 8 },
  // Eval section
  evalSection: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  evalBarContainer: { alignItems: "center", gap: 4 },
  evalBarTrack: {
    width: 14, height: 80, borderRadius: 7, overflow: "hidden",
    flexDirection: "column", justifyContent: "flex-end",
  },
  evalBarFill: { width: "100%", borderRadius: 7 },
  evalBarLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },
  evalRight: { flex: 1, justifyContent: "center", gap: 4 },
  analyzingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  analyzingText: { fontSize: 13 },
  scoreRow: { flexDirection: "row", alignItems: "center" },
  scoreValue: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  depthText: { fontSize: 12 },
  annotationBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  annotationText: { fontSize: 11, fontWeight: "700" },
  pvLine: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.1 },
  // Depth row
  depthRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  depthLabel: { fontSize: 12, minWidth: 40 },
  depthBtns: { flexDirection: "row", gap: 5 },
  depthBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  depthBtnText: { fontSize: 12, fontWeight: "600" },
});
