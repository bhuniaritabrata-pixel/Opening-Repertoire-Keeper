import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRepertoire } from "@/context/RepertoireContext";
import { useColors } from "@/hooks/useColors";
import { Opening } from "@/types/chess";

const COLOR_OPTIONS: Array<{ value: Opening["color"]; label: string; icon: string }> = [
  { value: "white", label: "White", icon: "○" },
  { value: "black", label: "Black", icon: "●" },
  { value: "both", label: "Both", icon: "◑" },
];

export default function RepertoireListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { openings, addOpening, deleteOpening, setCurrentOpeningId, isLoading } = useRepertoire();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<Opening["color"]>("white");
  const [newDesc, setNewDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOpenings = openings.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!newName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = addOpening(newName.trim(), newColor, newDesc.trim() || undefined);
    setCurrentOpeningId(id);
    setNewName("");
    setNewDesc("");
    setNewColor("white");
    setShowAddModal(false);
    router.push(`/board/${id}`);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Opening", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteOpening(id);
        },
      },
    ]);
  };

  const handleOpenOpening = (opening: Opening) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentOpeningId(opening.id);
    router.push(`/board/${opening.id}`);
  };

  const renderOpening = ({ item }: { item: Opening }) => {
    const colorInfo = COLOR_OPTIONS.find(c => c.value === item.color)!;
    const moveCount = countMoves(item.moveTree);
    const date = new Date(item.updatedAt).toLocaleDateString();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleOpenOpening(item)}
        activeOpacity={0.75}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.colorDot, { backgroundColor: item.color === "white" ? "#f0f0f0" : item.color === "black" ? "#2d2d2d" : "#888" }]}>
            <Text style={styles.colorDotText}>{colorInfo.icon}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              {moveCount} move{moveCount !== 1 ? "s" : ""} · {date}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name)}
            style={styles.deleteBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
    );
  };

  function countMoves(nodes: any[]): number {
    let count = nodes.length;
    for (const n of nodes) count += countMoves(n.children);
    return count;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? insets.top + 67 : 0 }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS !== "web" ? insets.top : 0 }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.headerForeground }]}>Repertoire</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={[styles.searchInput, { color: colors.headerForeground }]}
            placeholder="Search openings..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading...</Text>
        </View>
      ) : filteredOpenings.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="book-open" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No openings yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery ? "No openings match your search" : "Tap + to add your first opening"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOpenings}
          keyExtractor={item => item.id}
          renderItem={renderOpening}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Opening Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Opening</Text>
            <TouchableOpacity
              onPress={handleAdd}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: newName.trim() ? 1 : 0.5 }]}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Opening Name *</Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Sicilian Defense, Najdorf Variation"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Play as</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.colorOption,
                    { borderColor: newColor === opt.value ? colors.primary : colors.border },
                    newColor === opt.value && { backgroundColor: colors.primary + "22" },
                  ]}
                  onPress={() => setNewColor(opt.value)}
                >
                  <Text style={{ fontSize: 20 }}>{opt.icon}</Text>
                  <Text style={[styles.colorOptionLabel, { color: newColor === opt.value ? colors.primary : colors.mutedForeground }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Notes about this opening..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  colorDotText: { fontSize: 18 },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalBody: {
    padding: 20,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 12,
    fontFamily: "Inter_600SemiBold",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  colorOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  colorOptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
