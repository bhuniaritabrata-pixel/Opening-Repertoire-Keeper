import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BoardControls from "@/components/BoardControls";
import BoardThemePanel from "@/components/BoardThemePanel";
import ChessBoard from "@/components/ChessBoard";
import { BoardProvider, useBoard } from "@/context/BoardContext";
import { useRepertoire } from "@/context/RepertoireContext";
import { useColors } from "@/hooks/useColors";
import { ChessMove, Line } from "@/types/chess";

const COLOR_OPTIONS: Array<{ value: Line["color"]; label: string; icon: string }> = [
  { value: "white", label: "White", icon: "○" },
  { value: "black", label: "Black", icon: "●" },
  { value: "both",  label: "Both",  icon: "◑" },
];

// ─── Move pills row ───────────────────────────────────────────────────────────
function MovePills({ moves, currentMoveIndex }: { moves: ChessMove[]; currentMoveIndex: number }) {
  const colors = useColors();
  const { goBack, goForward } = useBoard();

  const pills = useMemo(() => {
    const result: { label: string; index: number }[] = [];
    for (let i = 0; i < moves.length; i++) {
      const moveNum = Math.floor(i / 2) + 1;
      const isWhite = i % 2 === 0;
      const prefix  = isWhite ? `${moveNum}. ` : "";
      result.push({ label: `${prefix}${moves[i].san}`, index: i + 1 });
    }
    return result;
  }, [moves]);

  if (moves.length === 0) {
    return (
      <View style={styles.pillsEmpty}>
        <Text style={[styles.pillsEmptyText, { color: colors.mutedForeground }]}>
          Make moves on the board to record them
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pillsRow}
    >
      {pills.map(({ label, index }) => {
        const isActive = index === currentMoveIndex;
        const diff = index - currentMoveIndex;
        const onPress = () => {
          if (diff > 0) { for (let i = 0; i < diff; i++) goForward(); }
          else if (diff < 0) { for (let i = 0; i < -diff; i++) goBack(); }
        };
        return (
          <TouchableOpacity
            key={index}
            style={[styles.pill, { backgroundColor: isActive ? colors.primary : colors.muted }]}
            onPress={onPress}
          >
            <Text style={[styles.pillText, { color: isActive ? "#fff" : colors.foreground }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Save modal (used both for initial save and variation-before-save) ────────
interface SaveModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, color: Line["color"]) => void;
  moveCount: number;
  defaultName?: string;
}
function SaveModal({ visible, onClose, onSave, moveCount, defaultName = "" }: SaveModalProps) {
  const colors = useColors();
  const [name,  setName]  = useState(defaultName);
  const [color, setColor] = useState<Line["color"]>("white");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), color);
    setName("");
    setColor("white");
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Save Line</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.modalSave, { color: name.trim() ? colors.primary : colors.mutedForeground }]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>LINE NAME</Text>
          <TextInput
            style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="e.g. Ruy Lopez Main Line"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoFocus
            onSubmitEditing={handleSave}
            returnKeyType="done"
          />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 20 }]}>PLAYING AS</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.colorOption,
                  { borderColor: color === opt.value ? colors.primary : colors.border, backgroundColor: colors.card },
                  color === opt.value && { borderWidth: 2 },
                ]}
                onPress={() => setColor(opt.value)}
              >
                <Text style={styles.colorOptionIcon}>{opt.icon}</Text>
                <Text style={[styles.colorOptionLabel, { color: color === opt.value ? colors.primary : colors.foreground }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.moveCountBox, { backgroundColor: colors.muted }]}>
            <Feather name="list" size={14} color={colors.mutedForeground} />
            <Text style={[styles.moveCountText, { color: colors.mutedForeground }]}>
              {moveCount} move{moveCount !== 1 ? "s" : ""} will be saved
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Inner board screen ───────────────────────────────────────────────────────
function BoardScreen({ line, isNew, startFen }: { line: Line | null; isNew: boolean; startFen: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addLine } = useRepertoire();
  const { moves, currentMoveIndex, fen } = useBoard();

  const [showTheme, setShowTheme] = useState(false);
  const [showSave,  setShowSave]  = useState(false);

  // Pending variation: when user clicks Variation on an unsaved new line,
  // we need to save first, then create the variation from this FEN.
  const pendingVariationFenRef = useRef<string | null>(null);

  const title = line?.name ?? "New Line";

  // ── Save: persist the current moves as a new Line ──────────────────────────
  const handleSaveConfirm = useCallback((name: string, color: Line["color"]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const savedId = addLine(name, color, startFen, moves);
    setShowSave(false);

    const pendingFen = pendingVariationFenRef.current;
    pendingVariationFenRef.current = null;

    if (pendingFen) {
      // After saving, navigate to the saved line, then push the variation
      router.replace(`/board/${savedId}`);
      const varId = addLine(`${name} – variation`, color, pendingFen);
      router.push(`/board/${varId}`);
    } else {
      // Normal save: replace this new-line route with the persisted one
      router.replace(`/board/${savedId}`);
    }
  }, [addLine, moves, startFen]);

  // ── Back: prompt to save when there are unsaved moves on a new line ────────
  const handleBack = useCallback(() => {
    if (isNew && moves.length > 0) {
      const doDiscard = () => router.back();
      if (Platform.OS === "web") {
        const choice = window.confirm(
          `You have ${moves.length} unsaved move${moves.length !== 1 ? "s" : ""}.\n\nOK = Save before leaving  ·  Cancel = Discard`
        );
        if (choice) { setShowSave(true); }
        else { doDiscard(); }
        return;
      }
      Alert.alert(
        "Unsaved moves",
        `You have ${moves.length} unsaved move${moves.length !== 1 ? "s" : ""}. Save this line before leaving?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: doDiscard },
          { text: "Save", onPress: () => setShowSave(true) },
        ],
      );
    } else {
      router.back();
    }
  }, [isNew, moves.length]);

  // ── Variation: save current line first (if new + unsaved), then branch ─────
  const handleVariation = useCallback(() => {
    const captureFen = fen;

    if (isNew && moves.length > 0) {
      // New unsaved line: prompt save-first or discard-and-branch
      const doBranch = () => {
        const varId = addLine("Variation", "white", captureFen);
        router.push(`/board/${varId}`);
      };

      if (Platform.OS === "web") {
        const choice = window.confirm(
          "Save this line before creating a variation? OK = Save first  ·  Cancel = Branch without saving"
        );
        if (choice) {
          pendingVariationFenRef.current = captureFen;
          setShowSave(true);
        } else {
          doBranch();
        }
        return;
      }

      Alert.alert(
        "Create variation",
        "Save this line first, then branch from the current position?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Branch without saving", style: "destructive", onPress: doBranch },
          {
            text: "Save first",
            onPress: () => {
              pendingVariationFenRef.current = captureFen;
              setShowSave(true);
            },
          },
        ],
      );
    } else {
      // Existing line (auto-saved): just create the variation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const varName = line ? `${line.name} – variation` : "Variation";
      const varId = addLine(varName, line?.color ?? "white", captureFen);
      router.push(`/board/${varId}`);
    }
  }, [fen, isNew, moves.length, line, addLine]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS !== "web" ? insets.top : 67 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.headerForeground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.headerForeground }]} numberOfLines={1}>
            {title}
          </Text>
          {!isNew && line && (
            <Text style={[styles.headerSub, { color: "rgba(255,255,255,0.5)" }]}>
              {line.moves.length} move{line.moves.length !== 1 ? "s" : ""}
            </Text>
          )}
          {isNew && (
            <Text style={[styles.headerSub, { color: "rgba(255,255,255,0.5)" }]}>
              {moves.length > 0 ? `${moves.length} move${moves.length !== 1 ? "s" : ""} · unsaved` : "recording…"}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {isNew && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: moves.length > 0 ? colors.primary : colors.muted }]}
              onPress={() => setShowSave(true)}
              disabled={moves.length === 0}
            >
              <Feather name="save" size={14} color={moves.length > 0 ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.saveBtnText, { color: moves.length > 0 ? "#fff" : colors.mutedForeground }]}>
                Save
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowTheme(true)}>
            <Feather name="sliders" size={18} color={colors.headerForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <ChessBoard />
        <BoardControls />

        {/* Move pills */}
        <View style={[styles.movesPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MovePills moves={moves} currentMoveIndex={currentMoveIndex} />
        </View>

        {/* Variation button */}
        <TouchableOpacity
          style={[styles.variationBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "14" }]}
          onPress={handleVariation}
        >
          <Feather name="git-branch" size={16} color={colors.primary} />
          <Text style={[styles.variationBtnText, { color: colors.primary }]}>Variation from here</Text>
        </TouchableOpacity>
      </ScrollView>

      <BoardThemePanel visible={showTheme} onClose={() => setShowTheme(false)} />

      <SaveModal
        visible={showSave}
        onClose={() => {
          setShowSave(false);
          pendingVariationFenRef.current = null;
        }}
        onSave={handleSaveConfirm}
        moveCount={moves.length}
      />
    </View>
  );
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────
export default function BoardScreenWrapper() {
  const { id, startFen: startFenParam } = useLocalSearchParams<{ id: string; startFen?: string }>();
  const { lines, updateLineMoves } = useRepertoire();

  const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const isNew    = id === "new";
  const startFen = startFenParam ?? STARTING_FEN;
  const line     = useMemo(() => (!isNew ? lines.find(l => l.id === id) ?? null : null), [lines, id, isNew]);

  const handleMovePlayed = useCallback((newMoves: ChessMove[]) => {
    if (!isNew && line) {
      updateLineMoves(line.id, newMoves);
    }
  }, [isNew, line, updateLineMoves]);

  return (
    <BoardProvider
      line={line}
      startFen={isNew ? startFen : undefined}
      onMovePlayed={handleMovePlayed}
    >
      <BoardScreen
        line={line}
        isNew={isNew}
        startFen={isNew ? startFen : (line?.startFen ?? STARTING_FEN)}
      />
    </BoardProvider>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 12, gap: 8,
  },
  backBtn:       { width: 40, height: 40, justifyContent: "center", alignItems: "center", borderRadius: 10 },
  headerCenter:  { flex: 1, alignItems: "center" },
  headerTitle:   { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  headerSub:     { fontSize: 11, fontFamily: "Inter_400Regular" },
  headerActions: { flexDirection: "row", gap: 4, alignItems: "center" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
  },
  saveBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerIconBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center", borderRadius: 8 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 12, alignItems: "center" },

  movesPanel: {
    borderRadius: 12, borderWidth: 1, marginTop: 8,
    alignSelf: "stretch", overflow: "hidden",
  },
  pillsRow:   { paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", gap: 6, alignItems: "center" },
  pillsEmpty: { padding: 16, alignItems: "center" },
  pillsEmptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pill: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, alignItems: "center",
  },
  pillText: { fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium" },

  variationBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed",
    paddingVertical: 12, paddingHorizontal: 16,
    marginTop: 10, alignSelf: "stretch", justifyContent: "center",
  },
  variationBtnText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },

  // Save Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalTitle:  { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modalSave:   { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  modalBody:   { padding: 20, gap: 8 },
  fieldLabel:  { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 4, fontFamily: "Inter_600SemiBold" },
  nameInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontFamily: "Inter_400Regular",
  },
  colorRow: { flexDirection: "row", gap: 10 },
  colorOption: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingVertical: 14, alignItems: "center", gap: 6,
  },
  colorOptionIcon:  { fontSize: 22 },
  colorOptionLabel: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  moveCountBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, padding: 10, marginTop: 12,
  },
  moveCountText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
