import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChessPiece from "@/components/ChessPiece";
import { useRepertoire } from "@/context/RepertoireContext";
import { useDrill } from "@/hooks/useDrill";
import { useColors } from "@/hooks/useColors";
import { BOARD_THEMES } from "@/types/chess";
import { fenToBoard } from "@/utils/chess";

const { width } = Dimensions.get("window");
const BOARD_SIZE  = Math.min(width - 16, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

function squareToRC(sq: string, flipped: boolean) {
  const col  = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  const row  = 7 - rank;
  return flipped ? { row: 7 - row, col: 7 - col } : { row, col };
}

// ── Stat pill ──────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: color + "55" }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Mini interactive drill board ────────────────────────────────────────────
function DrillBoard({
  snapshot, onMove, getLegalMoveTargets,
}: {
  snapshot: ReturnType<typeof useDrill>["snapshot"];
  onMove: (from: string, to: string) => void;
  getLegalMoveTargets: (sq: string) => string[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevWrongRef = useRef(snapshot.wrongAttempt);

  useEffect(() => {
    if (snapshot.phase === "player_turn" || snapshot.phase === "opponent_turn") {
      setSelected(null);
      setLegalTargets([]);
    }
  }, [snapshot.phase]);

  useEffect(() => {
    if (snapshot.wrongAttempt && snapshot.wrongAttempt !== prevWrongRef.current) {
      prevWrongRef.current = snapshot.wrongAttempt;
      setSelected(null);
      setLegalTargets([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [snapshot.wrongAttempt, shakeAnim]);

  const handleTap = useCallback((sq: string) => {
    if (snapshot.phase !== "player_turn") return;

    if (selected && legalTargets.includes(sq)) {
      const from = selected;
      setSelected(null);
      setLegalTargets([]);
      onMove(from, sq);
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
  }, [snapshot.phase, selected, legalTargets, getLegalMoveTargets, onMove]);

  const board = fenToBoard(snapshot.fen);
  const theme = BOARD_THEMES[1];
  const { flipped, lastMove, wrongAttempt, hint } = snapshot;

  const translateX = shakeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [-8, 0, 8] });

  return (
    <Animated.View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE, transform: [{ translateX }] }]}>
      {Array.from({ length: 8 }).map((_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: 8 }).map((_, col) => {
            const actualRow = flipped ? 7 - row : row;
            const actualCol = flipped ? 7 - col : col;
            const sq = String.fromCharCode(97 + actualCol) + (8 - actualRow);
            const piece = board[actualRow][actualCol];

            const isLight = (row + col) % 2 === 0;
            const bg = isLight ? theme.lightSquare : theme.darkSquare;
            const labelColor = isLight ? theme.darkSquare : theme.lightSquare;

            const isSelected  = sq === selected;
            const isLegal     = legalTargets.includes(sq);
            const isLastMove  = !!lastMove && (sq === lastMove.from || sq === lastMove.to);
            const isWrong     = !!wrongAttempt && (sq === wrongAttempt.from || sq === wrongAttempt.to);
            const isHint      = !!hint && (sq === hint.from || sq === hint.to);

            const rank = flipped ? row + 1 : 8 - row;
            const file = flipped ? String.fromCharCode(104 - col) : String.fromCharCode(97 + col);

            return (
              <TouchableOpacity
                key={sq}
                activeOpacity={0.85}
                onPress={() => handleTap(sq)}
                style={[styles.square, { width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: bg }]}
              >
                {isLastMove && <View style={[styles.overlay, { backgroundColor: "rgba(255,215,0,0.28)" }]} />}
                {piece && <ChessPiece piece={piece} size={SQUARE_SIZE * 0.88} />}
                {col === 0 && <Text style={[styles.rankLabel, { color: labelColor }]}>{rank}</Text>}
                {row === 7 && <Text style={[styles.fileLabel, { color: labelColor }]}>{file}</Text>}
                {isSelected && <View style={[styles.overlay, { backgroundColor: "rgba(20,85,30,0.45)" }]} />}
                {isLegal && !piece && <View style={styles.legalDot} />}
                {isLegal && piece && (
                  <View style={[styles.overlay, { borderWidth: 3, borderColor: "rgba(20,85,30,0.6)", backgroundColor: "transparent" }]} />
                )}
                {isWrong && <View style={[styles.overlay, { backgroundColor: "rgba(220,38,38,0.5)" }]} />}
                {isHint && <View style={[styles.overlay, { backgroundColor: "rgba(59,130,246,0.5)" }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
}

// ── Line Cleared modal ───────────────────────────────────────────────────────
function LineClearedModal({
  visible, accuracy, mistakes, onDrillAgain, onExit,
}: { visible: boolean; accuracy: number; mistakes: number; onDrillAgain: () => void; onExit: () => void }) {
  useEffect(() => {
    if (visible) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onExit}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalEmoji}>🎉</Text>
          <Text style={styles.modalTitle}>Line Cleared!</Text>
          <View style={styles.modalStats}>
            <StatPill label="Accuracy" value={`${accuracy}%`} color="#22c55e" />
            <StatPill label="Mistakes" value={mistakes} color="#f59e0b" />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#22c55e" }]} onPress={onDrillAgain}>
              <Feather name="repeat" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Drill Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#374151" }]} onPress={onExit}>
              <Feather name="arrow-left" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main drill screen ────────────────────────────────────────────────────────
export default function DrillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { openings } = useRepertoire();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const opening = useMemo(() => openings.find(o => o.id === id) ?? null, [openings, id]);
  const { snapshot, start, submitMove, retry, showHint, getLegalMoveTargets, stop } = useDrill(opening);

  useEffect(() => {
    if (opening) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening?.id]);

  const handleMove = useCallback((from: string, to: string) => {
    submitMove(from, to);
  }, [submitMove]);

  const handleExit = useCallback(() => {
    stop();
    router.back();
  }, [stop]);

  if (!opening) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, textAlign: "center", marginTop: 100 }}>Opening not found</Text>
      </View>
    );
  }

  if (opening.moveTree.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS !== "web" ? insets.top : 20 }]}>
          <TouchableOpacity onPress={handleExit} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.headerForeground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.headerForeground }]}>Drill · {opening.name}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 60, paddingHorizontal: 32 }}>
          This opening has no moves recorded yet. Add some moves before drilling it.
        </Text>
      </View>
    );
  }

  const accuracy = snapshot.attempts > 0 ? Math.round((snapshot.correct / snapshot.attempts) * 100) : 100;

  const phaseLabel: Record<string, { text: string; color: string }> = {
    player_turn:     { text: "Your turn — make a move", color: "#3b82f6" },
    opponent_turn:   { text: "Opponent responds…", color: "#94a3b8" },
    opponent_intro:  { text: "Opponent responds…", color: "#94a3b8" },
    wrong:           { text: "Incorrect — try again", color: "#dc2626" },
    complete:        { text: "Line cleared!", color: "#22c55e" },
  };
  const label = phaseLabel[snapshot.phase] ?? phaseLabel.player_turn;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <TouchableOpacity onPress={start} style={styles.backBtn}>
          <Feather name="repeat" size={18} color={colors.headerForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <StatPill label="Accuracy" value={`${accuracy}%`} color="#22c55e" />
        <StatPill label="Mistakes" value={snapshot.mistakes} color="#f59e0b" />
        <StatPill label="Moves" value={snapshot.attempts} color="#94a3b8" />
      </View>

      <View style={styles.labelRow}>
        <View style={[styles.labelDot, { backgroundColor: label.color }]} />
        <Text style={[styles.phaseLabel, { color: label.color }]}>{label.text}</Text>
      </View>

      <View style={styles.boardContainer}>
        <DrillBoard snapshot={snapshot} onMove={handleMove} getLegalMoveTargets={getLegalMoveTargets} />
      </View>

      {snapshot.phase === "wrong" && (
        <View style={styles.wrongActions}>
          <TouchableOpacity style={[styles.hintBtn, { backgroundColor: colors.primary }]} onPress={showHint}>
            <Feather name="help-circle" size={15} color="#fff" />
            <Text style={styles.hintBtnText}>Show Hint</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.hintBtn, { backgroundColor: colors.muted }]} onPress={retry}>
            <Feather name="rotate-ccw" size={15} color={colors.foreground} />
            <Text style={[styles.hintBtnText, { color: colors.foreground }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <LineClearedModal
        visible={snapshot.phase === "complete"}
        accuracy={accuracy}
        mistakes={snapshot.mistakes}
        onDrillAgain={start}
        onExit={handleExit}
      />
    </View>
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
  board:           { borderRadius: 6, overflow: "hidden", flexWrap: "wrap", flexDirection: "row" },
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
  overlay:         { ...StyleSheet.absoluteFillObject },
  legalDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "rgba(20,85,30,0.5)",
  },
  wrongActions: {
    flexDirection: "row", justifyContent: "center", gap: 12,
    marginTop: 18, paddingHorizontal: 16,
  },
  hintBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
  },
  hintBtnText:     { color: "#fff", fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#1e1e2e", borderRadius: 20,
    padding: 28, alignItems: "center", gap: 12,
    width: "82%", maxWidth: 340,
  },
  modalEmoji:      { fontSize: 48 },
  modalTitle:      { color: "#fff", fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  modalStats:      { flexDirection: "row", gap: 12, marginTop: 4 },
  modalActions:    { flexDirection: "row", gap: 12, marginTop: 16 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12,
  },
  actionBtnText:   { color: "#fff", fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
