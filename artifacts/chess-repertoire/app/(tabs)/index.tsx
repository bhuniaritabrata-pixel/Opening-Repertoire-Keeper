import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { useRepertoire } from "@/context/RepertoireContext";
import { useColors } from "@/hooks/useColors";
import { Line } from "@/types/chess";

const COLOR_ICONS: Record<Line["color"], string> = {
  white: "○",
  black: "●",
  both: "◑",
};

export default function RepertoireListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lines, deleteLine, renameLine, isLoading } = useRepertoire();

  const [renameModal, setRenameModal] = useState<{ id: string; name: string } | null>(null);
  const [renameText, setRenameText]   = useState("");
  const [contextMenu, setContextMenu] = useState<{ id: string; name: string } | null>(null);

  const handleNewLine = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/board/new");
  };

  const handleLongPress = (line: Line) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextMenu({ id: line.id, name: line.name });
  };

  const handleRenameConfirm = () => {
    if (!renameModal || !renameText.trim()) return;
    renameLine(renameModal.id, renameText.trim());
    setRenameModal(null);
    setRenameText("");
  };

  const handleDelete = (id: string, name: string) => {
    setContextMenu(null);
    Alert.alert("Delete Line", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteLine(id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? insets.top + 67 : 0 }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS !== "web" ? insets.top : 0 }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.headerForeground }]}>My Lines</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={handleNewLine}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading…</Text>
        </View>
      ) : lines.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="list" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No lines yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Tap + to record your first line
          </Text>
          <TouchableOpacity
            style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
            onPress={handleNewLine}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.emptyAddBtnText}>New Line</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {lines.map((line) => (
            <TouchableOpacity
              key={line.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/board/${line.id}`);
              }}
              onLongPress={() => handleLongPress(line)}
              activeOpacity={0.75}
              delayLongPress={400}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.colorDot, {
                  backgroundColor: line.color === "white" ? "#f0f0f0" : line.color === "black" ? "#2d2d2d" : "#888",
                  borderColor: colors.border,
                }]}>
                  <Text style={styles.colorDotText}>{COLOR_ICONS[line.color]}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                    {line.name}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                    {line.moves.length} move{line.moves.length !== 1 ? "s" : ""}
                    {line.startFen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                      ? "  ·  from position"
                      : ""}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Floating + button */}
      {lines.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
          onPress={handleNewLine}
        >
          <Feather name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Rename Modal */}
      <Modal visible={!!renameModal} animationType="fade" transparent onRequestClose={() => setRenameModal(null)}>
        <TouchableWithoutFeedback onPress={() => setRenameModal(null)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.renameBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.renameTitle, { color: colors.foreground }]}>Rename Line</Text>
                <TextInput
                  style={[styles.renameInput, { color: colors.foreground, borderColor: colors.border }]}
                  value={renameText}
                  onChangeText={setRenameText}
                  autoFocus
                  onSubmitEditing={handleRenameConfirm}
                  returnKeyType="done"
                />
                <View style={styles.renameActions}>
                  <TouchableOpacity style={[styles.renameBtn, { borderColor: colors.border }]} onPress={() => setRenameModal(null)}>
                    <Text style={[styles.renameBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.renameBtn, { backgroundColor: colors.primary }]} onPress={handleRenameConfirm}>
                    <Text style={[styles.renameBtnText, { color: "#fff" }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Context Menu */}
      <Modal visible={!!contextMenu} animationType="fade" transparent onRequestClose={() => setContextMenu(null)}>
        <TouchableWithoutFeedback onPress={() => setContextMenu(null)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.contextBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.contextTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {contextMenu?.name}
                </Text>
                <TouchableOpacity
                  style={[styles.contextItem, { borderTopColor: colors.border }]}
                  onPress={() => {
                    if (!contextMenu) return;
                    setRenameText(contextMenu.name);
                    setRenameModal({ id: contextMenu.id, name: contextMenu.name });
                    setContextMenu(null);
                  }}
                >
                  <Feather name="edit-2" size={16} color={colors.foreground} />
                  <Text style={[styles.contextItemText, { color: colors.foreground }]}>Rename</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contextItem, { borderTopColor: colors.border }]}
                  onPress={() => {
                    if (!contextMenu) return;
                    handleDelete(contextMenu.id, contextMenu.name);
                  }}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                  <Text style={[styles.contextItemText, { color: colors.destructive }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { paddingHorizontal: 16, paddingBottom: 14 },
  headerContent:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  headerTitle:  { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold" },
  addBtn:       { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },

  list: { padding: 12, gap: 8 },

  card: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 14,
    gap: 12,
  },
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  colorDot: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: "center", alignItems: "center", borderWidth: 1,
  },
  colorDotText: { fontSize: 16 },
  cardInfo:     { flex: 1 },
  cardName:     { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cardMeta:     { fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
  emptyAddBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 12, marginTop: 8,
  },
  emptyAddBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },

  fab: {
    position: "absolute", right: 20,
    width: 56, height: 56, borderRadius: 28,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
  },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },

  renameBox: {
    width: "100%", borderRadius: 16, borderWidth: 1,
    padding: 20, gap: 14,
  },
  renameTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  renameInput: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontFamily: "Inter_400Regular",
  },
  renameActions: { flexDirection: "row", gap: 10 },
  renameBtn: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingVertical: 12, alignItems: "center",
  },
  renameBtnText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },

  contextBox: {
    width: "100%", borderRadius: 16, borderWidth: 1, overflow: "hidden",
  },
  contextTitle: {
    fontSize: 13, fontWeight: "600", padding: 14,
    opacity: 0.6, fontFamily: "Inter_600SemiBold",
  },
  contextItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1,
  },
  contextItemText: { fontSize: 15, fontWeight: "500", fontFamily: "Inter_500Medium" },
});
