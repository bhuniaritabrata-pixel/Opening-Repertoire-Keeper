import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDrill, DrillProvider } from "@/context/DrillContext";
import { useRepertoire } from "@/context/RepertoireContext";
import { useColors } from "@/hooks/useColors";
import { BOARD_THEMES, Opening } from "@/types/chess";
import { fenToBoard } from "@/utils/chess";
import ChessPiece from "@/components/ChessPiece";

const { width } = Dimensions.get("window");
const BOARD_SIZE  = Math.min(width - 16, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

function squareToRC(sq: string, flipped: boolean) {
  const col  = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  const row  = 7 - rank;
  return flipped ? { row: 7 - row, col: 7 - col } : { row, col };
}

// ── Mini interactive board ─────────────────────────────────────────────────────
function DrillBoard() {
  const { drillState, submitMove, getLegalMoveTargets } = useDrill();
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);

  const flashAnim = useRef(new Animated.Value(0)).current;
  const correctAnim = useRef(new Animated.Value(0)).current;

  const prevPhase = useRef(drillState?.phase);

  useEffect(() => {
    if (!drillState) return;
    if (prevPhase.current === drillState.phase) return;
    prevPhase.current = drillState.phase;

    if (drillState.phase === "wrong") {
      setSelected(null);
      setLegalTargets([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }

    if (drillState.phase === "correct") {
      setSelected(null);
      setLegalTargets([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.sequence([
        Animated.timing(correctAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(correctAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }

    if (drillState.phase === "player_turn") {
      setSelected(null);
      setLegalTargets([]);
    }
  }, [drillState?.phase, flashAnim, correctAnim]);

  const handleSquareTap = useCallback((sq: string) => {
    if (!drillState || drillState.phase !== "player_turn") return;

    if (selected && legalTargets.includes(sq)) {
      submitMove(selected, sq);
      setSelected(null);
      setLegalTargets([]);
      return;
    }

    if (selected === sq) {
      setSelected(null);
      setLegalTargets([]);
      return;
    }

    const targets = getLegalMoveTargets(sq);
    if (targets.length > 0) {
      setSelected(sq);
      setLegalTargets(targets);
    } else {
      setSelected(null);
      setLegalTargets([]);
    }
  }, [drillState, selected, legalTargets, submitMove, getLegalMoveTargets]);

  if (!drillState) return null;

  const { fen, flipped, phase, highlightFrom, highlightTo, wrongMove } = drillState;
  const board = fenToBoard(fen);
  const theme = BOARD_THEMES[0];

  const flashOpacity = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });
  const correctOpacity = correctAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
      {Array.from({ length: 8 }).map((_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: 8 }).map((_, col) => {
            const vr = flipped ? 7 - row : row;
            const vc = flipped ? 7 - col : col;
            const isLight = (vr + vc) % 2 === 0;
            const bg = isLight ? theme.lightSquare : theme.darkSquare;
            const labelColor = isLight ? theme.darkSquare : theme.lightSquare;

            const actualRow = flipped ? 7 - row : row;
            const actualCol = flipped ? 7 - col : col;
            const sq = String.fromCharCode(97 + actualCol) + (8 - actualRow);
            const piece = board[actualRow][actualCol];

            const isSelected   = sq === selected;
            const isLegal      = legalTargets.includes(sq);
            const isHighlight  = sq === highlightFrom || sq === highlightTo;
            const isWrong      = wrongMove && (sq === wrongMove.from || sq === wrongMove.to);
            const isShowCorrect = (phase === "wrong" || phase === "showing_correct") && isHighlight;

            const rank = flipped ? row + 1 : 8 - row;
            const file = flipped ? String.fromCharCode(104 - col) : String.fromCharCode(97 + col);

            return (
              <TouchableOpacity
                key={sq}
                activeOpacity={0.85}
                onPress={() => handleSquareTap(sq)}
                style={[styles.square, { width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: bg }]}
              >
                {piece && <ChessPiece piece={piece} size={SQUARE_SIZE * 0.88} />}
                {col === 0 && (
                  <Text style={[styles.rankLabel, { color: labelColor }]}>{rank}</Text>
                )}
                {row === 7 && (
                  <Text style={[styles.fileLabel, { color: labelColor }]}>{file}</Text>
                )}
                {isSelected && (
                  <View style={[styles.overlay, { backgroundColor: "rgba(20,85,30,0.45)" }]} />
                )}
                {isLegal && !piece && (
                  <View style={styles.legalDot} />
                )}
                {isLegal && piece && (
                  <View style={[styles.overlay, { borderWidth: 3, borderColor: "rgba(20,85,30,0.6)", backgroundColor: "transparent" }]} />
                )}
                {(phase === "correct" || phase === "opponent_turn") && isHighlight && (
                  <View style={[styles.overlay, { backgroundColor: "rgba(46,204,113,0.38)" }]} />
                )}
                {isWrong && (
                  <View style={[styles.overlay, { backgroundColor: "rgba(220,38,38,0.45)" }]} />
                )}
                {isShowCorrect && (
                  <View style={[styles.overlay, { backgroundColor: "rgba(59,130,246,0.45)" }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {/* Red flash overlay */}
      <Animated.View pointerEvents="none" style={[styles.boardOverlay, { backgroundColor: "#dc2626", opacity: flashOpacity }]} />
      {/* Green correct overlay */}
      <Animated.View pointerEvents="none" style={[styles.boardOverlay, { backgroundColor: "#22c55e", opacity: correctOpacity }]} />
    </View>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: color + "55" }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Feedback banner ────────────────────────────────────────────────────────────
function FeedbackBanner({ opening }: { opening: Opening }) {
  const { drillState, advanceAfterFeedback } = useDrill();
  const slideAnim = useRef(new Animated.Value(80)).current;
  const phase = drillState?.phase;

  useEffect(() => {
    if (phase === "wrong" || phase === "showing_correct") {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 80, duration: 160, useNativeDriver: true }).start();
    }
  }, [phase, slideAnim]);

  if (!drillState) return null;
  if (phase !== "wrong" && phase !== "showing_correct") return null;

  const correctSan = drillState.correctMoves[0]?.move.san ?? "?";

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.bannerRow}>
        <View style={[styles.bannerIcon, { backgroundColor: "#dc262620" }]}>
          <Feather name="x" size={18} color="#dc2626" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Incorrect</Text>
          <Text style={styles.bannerSub}>Correct move: <Text style={styles.bannerMove}>{correctSan}</Text></Text>
        </View>
        <Text style={styles.bannerNote}>Queued for retry</Text>
      </View>
    </Animated.View>
  );
}

// ── Complete overlay ───────────────────────────────────────────────────────────
function CompleteOverlay({ onRestart, onExit }: { onRestart: () => void; onExit: () => void }) {
  const { drillState } = useDrill();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  if (!drillState) return null;
  const { sessionCorrect, sessionAttempts, stats } = drillState;
  const accuracy = sessionAttempts > 0 ? Math.round((sessionCorrect / sessionAttempts) * 100) : 100;

  return (
    <Animated.View style={[styles.completeOverlay, { opacity: fadeAnim }]}>
      <Text style={styles.completeEmoji}>🎉</Text>
      <Text style={styles.completeTitle}>Drill Complete!</Text>
      <Text style={styles.completeSub}>You went through all positions</Text>

      <View style={styles.completeStats}>
        <StatPill label="Accuracy" value={`${accuracy}%`} color="#22c55e" />
        <StatPill label="Streak" value={stats.currentStreak} color="#f59e0b" />
        <StatPill label="Best" value={stats.bestStreak} color="#3b82f6" />
      </View>

      <View style={styles.completeActions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#22c55e" }]} onPress={onRestart}>
          <Feather name="repeat" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Drill Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#374151" }]} onPress={onExit}>
          <Feather name="arrow-left" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Main drill screen ──────────────────────────────────────────────────────────
function DrillScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const { openings } = useRepertoire();
  const colors      = useColors();
  const insets      = useSafeAreaInsets();
  const { drillState, startDrill, endDrill, submitMove } = useDrill();

  const opening = useMemo(() => openings.find(o => o.id === id) ?? null, [openings, id]);

  useEffect(() => {
    if (opening) startDrill(opening);
    return () => endDrill();
  }, []);

  const handleRestart = useCallback(() => {
    if (opening) startDrill(opening);
  }, [opening, startDrill]);

  const handleExit = useCallback(() => {
    endDrill();
    router.back();
  }, [endDrill]);

  if (!opening) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, textAlign: "center", marginTop: 100 }}>Opening not found</Text>
      </View>
    );
  }

  const phase = drillState?.phase ?? "idle";
  const stats = drillState?.stats;
  const progress = drillState?.progress ?? { done: 0, total: 0 };
  const accuracy = (drillState?.sessionAttempts ?? 0) > 0
    ? Math.round(((drillState?.sessionCorrect ?? 0) / (drillState?.sessionAttempts ?? 1)) * 100)
    : 100;

  const phaseLabel: Record<string, { text: string; color: string }> = {
    player_turn:     { text: "Your turn — make a move", color: "#3b82f6" },
    opponent_turn:   { text: "Opponent responds…", color: "#94a3b8" },
    correct:         { text: "Correct! ✓", color: "#22c55e" },
    wrong:           { text: "Incorrect — see correct move below", color: "#dc2626" },
    showing_correct: { text: "Incorrect — see correct move", color: "#dc2626" },
    complete:        { text: "All done!", color: "#22c55e" },
    idle:            { text: "Loading…", color: "#94a3b8" },
  };

  const label = phaseLabel[phase] ?? phaseLabel.idle;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS !== "web" ? insets.top : 20 }]}>
        <TouchableOpacity onPress={handleExit} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.headerForeground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.headerForeground }]} numberOfLines={1}>
            Drill · {opening.name}
          </Text>
          <Text style={[styles.headerSub, { color: "rgba(255,255,255,0.5)" }]}>
            {opening.color.charAt(0).toUpperCase() + opening.color.slice(1)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRestart} style={styles.backBtn}>
          <Feather name="repeat" size={18} color={colors.headerForeground} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, {
          backgroundColor: colors.primary,
          width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%",
        }]} />
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <StatPill label="Accuracy" value={`${accuracy}%`} color="#22c55e" />
        <StatPill label="Streak"   value={stats?.currentStreak ?? 0} color="#f59e0b" />
        <StatPill label="Best"     value={stats?.bestStreak ?? 0}    color="#3b82f6" />
        <StatPill label={`${progress.done}/${progress.total}`} value="Done" color="#94a3b8" />
      </View>

      {/* Phase label */}
      <View style={styles.labelRow}>
        <View style={[styles.labelDot, { backgroundColor: label.color }]} />
        <Text style={[styles.phaseLabel, { color: label.color }]}>{label.text}</Text>
      </View>

      {/* Board */}
      <View style={styles.boardContainer}>
        <DrillBoard />
      </View>

      {/* Feedback banner */}
      <View style={styles.bannerContainer}>
        <FeedbackBanner opening={opening} />
      </View>

      {/* Complete overlay */}
      {phase === "complete" && (
        <CompleteOverlay onRestart={handleRestart} onExit={handleExit} />
      )}
    </View>
  );
}

export default function DrillScreenWrapper() {
  return (
    <DrillProvider>
      <DrillScreen />
    </DrillProvider>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14, gap: 10,
  },
  backBtn:         { width: 40, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 10 },
  headerCenter:    { flex: 1, alignItems: "center" },
  headerTitle:     { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  headerSub:       { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressTrack:   { height: 3 },
  progressFill:    { height: 3, borderRadius: 2 },
  statsRow: {
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  statPill:        { alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, minWidth: 60 },
  statValue:       { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel:       { fontSize: 10, color: "#94a3b8", fontFamily: "Inter_400Regular", marginTop: 1 },
  labelRow:        { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  labelDot:        { width: 8, height: 8, borderRadius: 4 },
  phaseLabel:      { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  boardContainer:  { alignItems: "center", paddingHorizontal: 8 },
  board:           { borderRadius: 6, overflow: "hidden" },
  row:             { flexDirection: "row" },
  square:          { justifyContent: "center", alignItems: "center" },
  rankLabel: {
    position: "absolute", left: 2, top: 1,
    fontSize: 9, fontWeight: "700", opacity: 0.7,
  },
  fileLabel: {
    position: "absolute", right: 2, bottom: 1,
    fontSize: 9, fontWeight: "700", opacity: 0.7,
  },
  overlay:         { ...StyleSheet.absoluteFillObject, borderRadius: 0 },
  legalDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "rgba(20,85,30,0.5)",
  },
  boardOverlay:    { ...StyleSheet.absoluteFillObject },
  bannerContainer: { position: "absolute", bottom: 0, left: 0, right: 0 },
  banner: {
    backgroundColor: "#1e1e2e",
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 12,
  },
  bannerRow:       { flexDirection: "row", alignItems: "center", gap: 12 },
  bannerIcon:      { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  bannerTitle:     { color: "#fff", fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  bannerSub:       { color: "#94a3b8", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  bannerMove:      { color: "#3b82f6", fontWeight: "700" },
  bannerNote:      { color: "#94a3b8", fontSize: 11, fontStyle: "italic" },
  completeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f1117ee",
    justifyContent: "center", alignItems: "center",
    gap: 12, paddingHorizontal: 32,
  },
  completeEmoji:   { fontSize: 52 },
  completeTitle:   { color: "#fff", fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
  completeSub:     { color: "#94a3b8", fontSize: 14, fontFamily: "Inter_400Regular" },
  completeStats:   { flexDirection: "row", gap: 12, marginTop: 8 },
  completeActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
  },
  actionBtnText:   { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
