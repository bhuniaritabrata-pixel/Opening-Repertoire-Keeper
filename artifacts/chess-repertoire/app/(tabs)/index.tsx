import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRepertoire } from "@/context/RepertoireContext";
import { useColors } from "@/hooks/useColors";
import { Folder, Opening, SortMode } from "@/types/chess";

const COLOR_OPTIONS: Array<{ value: Opening["color"]; label: string; icon: string }> = [
  { value: "white", label: "White", icon: "○" },
  { value: "black", label: "Black", icon: "●" },
  { value: "both", label: "Both", icon: "◑" },
];

type ContextMenuTarget =
  | { kind: "opening"; id: string; name: string }
  | { kind: "folder"; id: string; name: string };

type AddModalMode = "opening" | "folder";

function countMoves(nodes: any[]): number {
  let count = nodes.length;
  for (const n of nodes) count += countMoves(n.children);
  return count;
}

export default function RepertoireListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    openings, folders, sortMode, setSortMode,
    addOpening, deleteOpening, renameOpening, updateOpening,
    moveOpeningToFolder, reorderOpenings,
    addFolder, deleteFolder, renameFolder,
    reorderFolders,
    setCurrentOpeningId, isLoading,
  } = useRepertoire();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState<AddModalMode | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);
  const [renameModal, setRenameModal] = useState<{ kind: "opening" | "folder"; id: string; current: string } | null>(null);
  const [moveToFolderModal, setMoveToFolderModal] = useState<string | null>(null);
  const [showAddSubMenu, setShowAddSubMenu] = useState(false);
  const [colorChangeModal, setColorChangeModal] = useState<{ id: string; current: Opening["color"] } | null>(null);
  const [pendingColor, setPendingColor] = useState<Opening["color"]>("white");

  // Add form state
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<Opening["color"]>("white");
  const [newDesc, setNewDesc] = useState("");
  const [renameText, setRenameText] = useState("");

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const dragItemHeight = useRef(0);
  const dragStartY = useRef(0);
  const dragCurrentAbsY = useRef(0);
  const itemRefs = useRef<Map<string, View | null>>(new Map());
  const itemPositions = useRef<Map<string, { y: number; height: number }>>(new Map());
  // Absolute (pageY) folder positions captured at drag-start — fixes offset mismatch
  const folderAbsPositions = useRef<Map<string, { y: number; height: number }>>(new Map());
  const folderRefs = useRef<Map<string, View | null>>(new Map());
  const listRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const isScrollEnabled = useRef(true);

  // ── Memoized move counts — avoids recursive tree walk on every render ─────
  const moveCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of openings) counts[o.id] = countMoves(o.moveTree);
    return counts;
  }, [openings]);

  // ── Sorting helpers — memoized so they don't re-sort on unrelated state ───
  const sortedFolders = useMemo(() => [...folders].sort((a, b) => {
    if (sortMode === "az") return a.name.localeCompare(b.name);
    if (sortMode === "za") return b.name.localeCompare(a.name);
    return (a.order ?? 0) - (b.order ?? 0);
  }), [folders, sortMode]);

  const sortedOpenings = useMemo(() => [...openings].sort((a, b) => {
    if (sortMode === "az") return a.name.localeCompare(b.name);
    if (sortMode === "za") return b.name.localeCompare(a.name);
    return (a.order ?? 0) - (b.order ?? 0);
  }), [openings, sortMode]);

  const filteredOpenings = useMemo(() =>
    sortedOpenings.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [sortedOpenings, searchQuery]
  );

  const rootOpenings = useMemo(() =>
    filteredOpenings.filter(o => !o.folderId),
    [filteredOpenings]
  );

  const getFolderOpenings = useCallback((folderId: string) =>
    filteredOpenings.filter(o => o.folderId === folderId),
    [filteredOpenings]
  );

  // ── Folder toggle ─────────────────────────────────────────────
  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Add handlers ─────────────────────────────────────────────
  const handleAddOpening = () => {
    if (!newName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = addOpening(newName.trim(), newColor, newDesc.trim() || undefined);
    setCurrentOpeningId(id);
    setNewName(""); setNewDesc(""); setNewColor("white");
    setShowAddModal(null);
    router.push(`/board/${id}`);
  };

  const handleAddFolder = () => {
    if (!newName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = addFolder(newName.trim());
    setNewName("");
    setShowAddModal(null);
    setExpandedFolders(prev => new Set([...prev, id]));
  };

  // ── Context menu actions ──────────────────────────────────────
  const handleLongPress = (target: ContextMenuTarget) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextMenu(target);
  };

  const handleRename = () => {
    if (!contextMenu) return;
    setRenameText(contextMenu.name);
    setRenameModal({ kind: contextMenu.kind, id: contextMenu.id, current: contextMenu.name });
    setContextMenu(null);
  };

  const commitRename = () => {
    if (!renameModal || !renameText.trim()) return;
    if (renameModal.kind === "opening") renameOpening(renameModal.id, renameText.trim());
    else renameFolder(renameModal.id, renameText.trim());
    setRenameModal(null);
    setRenameText("");
  };

  const handleMoveToFolder = () => {
    if (!contextMenu || contextMenu.kind !== "opening") return;
    setMoveToFolderModal(contextMenu.id);
    setContextMenu(null);
  };

  const handleChangeColor = () => {
    if (!contextMenu || contextMenu.kind !== "opening") return;
    const opening = openings.find(o => o.id === contextMenu.id);
    setPendingColor(opening?.color ?? "white");
    setColorChangeModal({ id: contextMenu.id, current: opening?.color ?? "white" });
    setContextMenu(null);
  };

  const commitColorChange = () => {
    if (!colorChangeModal) return;
    updateOpening(colorChangeModal.id, { color: pendingColor });
    setColorChangeModal(null);
  };

  const handleDeleteFromMenu = () => {
    if (!contextMenu) return;
    const target = contextMenu;
    setContextMenu(null);
    if (target.kind === "opening") {
      Alert.alert("Delete Opening", `Delete "${target.name}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); deleteOpening(target.id); }
        },
      ]);
    } else {
      const folderOpenings = openings.filter(o => o.folderId === target.id);
      if (folderOpenings.length > 0) {
        Alert.alert("Delete Folder", `Delete "${target.name}"?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Keep openings", onPress: () => deleteFolder(target.id, false) },
          { text: "Delete all", style: "destructive", onPress: () => deleteFolder(target.id, true) },
        ]);
      } else {
        Alert.alert("Delete Folder", `Delete "${target.name}"?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteFolder(target.id, false) },
        ]);
      }
    }
  };

  // ── Drag-drop ─────────────────────────────────────────────────
  const buildPanResponder = (item: Opening) => {
    if (sortMode !== "manual") return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4,
      onPanResponderGrant: (e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        dragStartY.current = e.nativeEvent.pageY;
        dragY.setValue(0);
        setDraggingId(item.id);
        isScrollEnabled.current = false;
        // Snapshot absolute pageY of every folder row so move-checks are accurate
        folderAbsPositions.current.clear();
        for (const [folderId, ref] of folderRefs.current.entries()) {
          if (ref) {
            ref.measure((_x, _y, _w, height, _px, pageY) => {
              folderAbsPositions.current.set(folderId, { y: pageY, height });
            });
          }
        }
      },
      onPanResponderMove: (e, gs) => {
        dragCurrentAbsY.current = e.nativeEvent.pageY;
        dragY.setValue(gs.dy);
        // Use absolute positions captured at drag-start — no scroll/header offset math needed
        let foundFolder: string | null = null;
        for (const [folderId, pos] of folderAbsPositions.current.entries()) {
          if (e.nativeEvent.pageY > pos.y && e.nativeEvent.pageY < pos.y + pos.height) {
            foundFolder = folderId;
            break;
          }
        }
        setDragOverFolderId(foundFolder);
      },
      onPanResponderRelease: () => {
        isScrollEnabled.current = true;
        if (dragOverFolderId !== null) {
          // Move into folder
          moveOpeningToFolder(item.id, dragOverFolderId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          // Reorder based on final Y position
          const absY = dragCurrentAbsY.current + scrollOffset.current;
          const allItems = [...rootOpenings, ...folders.flatMap(f => getFolderOpenings(f.id))];
          let bestIdx = rootOpenings.findIndex(o => o.id === item.id);
          let bestDist = Infinity;
          rootOpenings.forEach((o, idx) => {
            const pos = itemPositions.current.get(`opening-${o.id}`);
            if (pos) {
              const dist = Math.abs(pos.y + scrollOffset.current - absY);
              if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
            }
          });
          const ids = rootOpenings.map(o => o.id);
          const fromIdx = ids.indexOf(item.id);
          if (fromIdx !== -1 && bestIdx !== fromIdx) {
            ids.splice(fromIdx, 1);
            ids.splice(bestIdx, 0, item.id);
            reorderOpenings(ids);
          }
        }
        setDraggingId(null);
        setDragOverFolderId(null);
        dragY.setValue(0);
      },
      onPanResponderTerminate: () => {
        isScrollEnabled.current = true;
        setDraggingId(null);
        setDragOverFolderId(null);
        dragY.setValue(0);
      },
    });
  };

  // ── Render items ─────────────────────────────────────────────
  const renderOpening = (opening: Opening, inFolder = false) => {
    const colorInfo = COLOR_OPTIONS.find(c => c.value === opening.color)!;
    const moveCount = moveCounts[opening.id] ?? 0;
    const date = new Date(opening.updatedAt).toLocaleDateString();
    const isDragging = draggingId === opening.id;
    const panHandlers = buildPanResponder(opening)?.panHandlers;

    return (
      <Animated.View
        key={opening.id}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, marginLeft: inFolder ? 16 : 0 },
          isDragging && { opacity: 0.4, transform: [{ translateY: dragY }] },
        ]}
        onLayout={(e) => {
          itemPositions.current.set(`opening-${opening.id}`, {
            y: e.nativeEvent.layout.y,
            height: e.nativeEvent.layout.height,
          });
        }}
      >
        {sortMode === "manual" && (
          <View style={styles.dragHandle} {...panHandlers}>
            <Feather name="menu" size={18} color={colors.mutedForeground} />
          </View>
        )}
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCurrentOpeningId(opening.id);
            router.push(`/board/${opening.id}`);
          }}
          onLongPress={() => handleLongPress({ kind: "opening", id: opening.id, name: opening.name })}
          activeOpacity={0.75}
          delayLongPress={400}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.colorDot, {
              backgroundColor: opening.color === "white" ? "#f0f0f0" : opening.color === "black" ? "#2d2d2d" : "#888"
            }]}>
              <Text style={styles.colorDotText}>{colorInfo.icon}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                {opening.name}
              </Text>
              {opening.description ? (
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {opening.description}
                </Text>
              ) : null}
              <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                {moveCount} move{moveCount !== 1 ? "s" : ""} · {date}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFolder = (folder: Folder) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderOpenings = getFolderOpenings(folder.id);
    const isDropTarget = dragOverFolderId === folder.id;

    return (
      <View
        key={folder.id}
        ref={(r) => { folderRefs.current.set(folder.id, r); }}
        onLayout={(e) => {
          itemPositions.current.set(`folder-${folder.id}`, {
            y: e.nativeEvent.layout.y,
            height: e.nativeEvent.layout.height,
          });
        }}
      >
        <TouchableOpacity
          style={[
            styles.folderHeader,
            { backgroundColor: isDropTarget ? colors.primary + "22" : colors.card, borderColor: isDropTarget ? colors.primary : colors.border },
          ]}
          onPress={() => toggleFolder(folder.id)}
          onLongPress={() => handleLongPress({ kind: "folder", id: folder.id, name: folder.name })}
          activeOpacity={0.8}
          delayLongPress={400}
        >
          <View style={styles.folderLeft}>
            <Feather
              name="folder"
              size={20}
              color={isExpanded ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.folderName, { color: colors.foreground }]} numberOfLines={1}>
              {folder.name}
            </Text>
            <View style={[styles.folderBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.folderBadgeText, { color: colors.mutedForeground }]}>
                {folderOpenings.length}
              </Text>
            </View>
          </View>
          <View style={styles.folderRight}>
            {isDropTarget && (
              <Text style={[styles.dropHint, { color: colors.primary }]}>Drop here</Text>
            )}
            <Feather
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.mutedForeground}
            />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={[styles.folderContents, { borderColor: colors.border }]}>
            {folderOpenings.length === 0 ? (
              <Text style={[styles.emptyFolderText, { color: colors.mutedForeground }]}>
                Empty folder · long-press an opening to move it here
              </Text>
            ) : (
              folderOpenings.map(o => (
                <View key={o.id} style={{ marginBottom: 8 }}>
                  {renderOpening(o, true)}
                </View>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  // Build flat list sections
  const sections = [
    ...sortedFolders.map(f => ({ type: "folder" as const, folder: f })),
    ...rootOpenings.map(o => ({ type: "opening" as const, opening: o })),
  ];

  const allEmpty = folders.length === 0 && openings.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? insets.top + 67 : 0 }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS !== "web" ? insets.top : 0 }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.headerForeground }]}>Repertoire</Text>
          <View style={styles.headerRight}>
            {/* Sort controls */}
            <View style={[styles.sortRow, { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10 }]}>
              {(["az", "za", "manual"] as SortMode[]).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.sortBtn, sortMode === mode && { backgroundColor: colors.primary, borderRadius: 8 }]}
                  onPress={() => setSortMode(mode)}
                >
                  <Text style={[styles.sortBtnText, { color: sortMode === mode ? "#fff" : "rgba(255,255,255,0.6)" }]}>
                    {mode === "az" ? "A→Z" : mode === "za" ? "Z→A" : "≡"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Add button */}
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddSubMenu(true)}
            >
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
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
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {sortMode === "manual" && (
          <Text style={styles.manualHint}>Long-press drag ≡ to reorder · Drag opening onto a folder to move it</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading...</Text>
        </View>
      ) : allEmpty ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="book-open" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No openings yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to add your first opening or folder</Text>
        </View>
      ) : (
        <ScrollView
          ref={listRef}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!draggingId}
          onScroll={e => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
        >
          {sections.map(item => (
            item.type === "folder"
              ? renderFolder(item.folder)
              : <View key={item.opening.id} style={{ marginBottom: 8 }}>{renderOpening(item.opening, false)}</View>
          ))}
          {sections.length === 0 && searchQuery ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center", marginTop: 40 }]}>
              No openings match "{searchQuery}"
            </Text>
          ) : null}
        </ScrollView>
      )}

      {/* Add sub-menu as Modal so it always renders on top */}
      <Modal visible={showAddSubMenu} animationType="fade" transparent onRequestClose={() => setShowAddSubMenu(false)}>
        <TouchableWithoutFeedback onPress={() => setShowAddSubMenu(false)}>
          <View style={styles.contextOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.contextSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.contextTitle, { color: colors.foreground }]}>Add New</Text>
                <View style={[styles.contextDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity
                  style={styles.contextItem}
                  onPress={() => { setShowAddSubMenu(false); setNewName(""); setShowAddModal("opening"); }}
                >
                  <Feather name="book-open" size={18} color={colors.foreground} />
                  <Text style={[styles.contextLabel, { color: colors.foreground }]}>New Opening</Text>
                </TouchableOpacity>
                <View style={[styles.contextDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity
                  style={styles.contextItem}
                  onPress={() => { setShowAddSubMenu(false); setNewName(""); setShowAddModal("folder"); }}
                >
                  <Feather name="folder-plus" size={18} color={colors.foreground} />
                  <Text style={[styles.contextLabel, { color: colors.foreground }]}>New Folder</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add Modal */}
      <Modal visible={showAddModal !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddModal(null)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(null)}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {showAddModal === "folder" ? "New Folder" : "New Opening"}
            </Text>
            <TouchableOpacity
              onPress={showAddModal === "folder" ? handleAddFolder : handleAddOpening}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: newName.trim() ? 1 : 0.5 }]}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              {showAddModal === "folder" ? "Folder Name *" : "Opening Name *"}
            </Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={newName}
              onChangeText={setNewName}
              placeholder={showAddModal === "folder" ? "e.g. My Favorites" : "e.g. Sicilian Defense"}
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            {showAddModal === "opening" && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Play as</Text>
                <View style={styles.colorRow}>
                  {COLOR_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.colorOption, { borderColor: newColor === opt.value ? colors.primary : colors.border },
                        newColor === opt.value && { backgroundColor: colors.primary + "22" }]}
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
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Context Menu Modal */}
      <Modal visible={contextMenu !== null} animationType="fade" transparent onRequestClose={() => setContextMenu(null)}>
        <TouchableWithoutFeedback onPress={() => setContextMenu(null)}>
          <View style={styles.contextOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.contextSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.contextTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {contextMenu?.name}
                </Text>
                <View style={[styles.contextDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.contextItem} onPress={handleRename}>
                  <Feather name="edit-2" size={18} color={colors.foreground} />
                  <Text style={[styles.contextLabel, { color: colors.foreground }]}>Rename</Text>
                </TouchableOpacity>
                {contextMenu?.kind === "opening" && (
                  <>
                    <TouchableOpacity style={styles.contextItem} onPress={handleChangeColor}>
                      <Feather name="circle" size={18} color={colors.foreground} />
                      <Text style={[styles.contextLabel, { color: colors.foreground }]}>Change Color</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.contextItem} onPress={handleMoveToFolder}>
                      <Feather name="folder" size={18} color={colors.foreground} />
                      <Text style={[styles.contextLabel, { color: colors.foreground }]}>Move to Folder</Text>
                    </TouchableOpacity>
                  </>
                )}
                <View style={[styles.contextDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.contextItem} onPress={handleDeleteFromMenu}>
                  <Feather name="trash-2" size={18} color={colors.destructive} />
                  <Text style={[styles.contextLabel, { color: colors.destructive }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={renameModal !== null} animationType="fade" transparent onRequestClose={() => setRenameModal(null)}>
        <TouchableWithoutFeedback onPress={() => setRenameModal(null)}>
          <View style={styles.contextOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.renameSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.contextTitle, { color: colors.foreground }]}>
                  Rename {renameModal?.kind === "folder" ? "Folder" : "Opening"}
                </Text>
                <TextInput
                  style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, marginTop: 12, marginBottom: 16 }]}
                  value={renameText}
                  onChangeText={setRenameText}
                  autoFocus
                  selectTextOnFocus
                />
                <View style={styles.renameButtons}>
                  <TouchableOpacity style={[styles.renameCancelBtn, { borderColor: colors.border }]} onPress={() => setRenameModal(null)}>
                    <Text style={[styles.renameBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.renameSaveBtn, { backgroundColor: colors.primary, opacity: renameText.trim() ? 1 : 0.5 }]}
                    onPress={commitRename}
                  >
                    <Text style={[styles.renameBtnText, { color: "#fff" }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Change Color Modal */}
      <Modal visible={colorChangeModal !== null} animationType="fade" transparent onRequestClose={() => setColorChangeModal(null)}>
        <TouchableWithoutFeedback onPress={() => setColorChangeModal(null)}>
          <View style={styles.contextOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.renameSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.contextTitle, { color: colors.foreground }]}>Change Color</Text>
                <View style={[styles.colorRow, { marginTop: 8, marginBottom: 20 }]}>
                  {COLOR_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.colorOption,
                        { borderColor: pendingColor === opt.value ? colors.primary : colors.border },
                        pendingColor === opt.value && { backgroundColor: colors.primary + "22" },
                      ]}
                      onPress={() => setPendingColor(opt.value)}
                    >
                      <Text style={{ fontSize: 20 }}>{opt.icon}</Text>
                      <Text style={[styles.colorOptionLabel, { color: pendingColor === opt.value ? colors.primary : colors.mutedForeground }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.renameButtons}>
                  <TouchableOpacity style={[styles.renameCancelBtn, { borderColor: colors.border }]} onPress={() => setColorChangeModal(null)}>
                    <Text style={[styles.renameBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.renameSaveBtn, { backgroundColor: colors.primary }]} onPress={commitColorChange}>
                    <Text style={[styles.renameBtnText, { color: "#fff" }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Move to Folder Modal */}
      <Modal visible={moveToFolderModal !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMoveToFolderModal(null)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMoveToFolderModal(null)}>
              <Feather name="x" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Move to Folder</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <TouchableOpacity
              style={[styles.folderPickItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                if (moveToFolderModal) moveOpeningToFolder(moveToFolderModal, null);
                setMoveToFolderModal(null);
              }}
            >
              <Feather name="home" size={18} color={colors.mutedForeground} />
              <Text style={[styles.folderPickLabel, { color: colors.foreground }]}>Root (no folder)</Text>
            </TouchableOpacity>
            {folders.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.folderPickItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  if (moveToFolderModal) moveOpeningToFolder(moveToFolderModal, f.id);
                  setMoveToFolderModal(null);
                  setExpandedFolders(prev => new Set([...prev, f.id]));
                }}
              >
                <Feather name="folder" size={18} color={colors.primary} />
                <Text style={[styles.folderPickLabel, { color: colors.foreground }]}>{f.name}</Text>
                <Text style={[styles.folderPickCount, { color: colors.mutedForeground }]}>
                  {openings.filter(o => o.folderId === f.id).length} openings
                </Text>
              </TouchableOpacity>
            ))}
            {folders.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center", marginTop: 20 }]}>
                No folders yet. Create one with the + button.
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 14 },
  headerTitle: { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sortRow: { flexDirection: "row", padding: 2, gap: 2 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  sortBtnText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  addBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  addSubMenu: {
    position: "absolute", top: 44, right: 0, width: 170, borderRadius: 12, borderWidth: 1,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8, zIndex: 999,
  },
  addSubItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  addSubLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  addSubDivider: { height: 1, marginHorizontal: 12 },
  searchContainer: {
    flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  manualHint: { fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular", textAlign: "center" },
  list: { padding: 14, gap: 0 },
  card: {
    flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1,
    justifyContent: "space-between", marginBottom: 8,
  },
  dragHandle: { paddingLeft: 14, paddingVertical: 14, paddingRight: 4 },
  cardTouchable: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 14, paddingRight: 14, paddingLeft: 10,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  colorDot: {
    width: 40, height: 40, borderRadius: 10, justifyContent: "center",
    alignItems: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)",
  },
  colorDotText: { fontSize: 18 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 2 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  cardMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  folderHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, marginBottom: 4,
  },
  folderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  folderName: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", flex: 1 },
  folderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  folderBadgeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  folderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  dropHint: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  folderContents: { marginLeft: 12, marginBottom: 8, borderLeftWidth: 2, paddingLeft: 8, paddingTop: 4 },
  emptyFolderText: { fontSize: 13, fontFamily: "Inter_400Regular", paddingVertical: 12, paddingLeft: 4 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22, fontFamily: "Inter_400Regular" },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, paddingTop: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontSize: 15, fontWeight: "700" },
  modalBody: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4, marginTop: 12, fontFamily: "Inter_600SemiBold" },
  textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  colorRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  colorOption: { flex: 1, borderWidth: 2, borderRadius: 12, paddingVertical: 12, alignItems: "center", gap: 4 },
  colorOptionLabel: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  contextOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  contextSheet: { width: "100%", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  contextTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", padding: 18, paddingBottom: 12 },
  contextDivider: { height: 1 },
  contextItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  contextLabel: { fontSize: 16, fontFamily: "Inter_400Regular" },
  renameSheet: { width: "100%", borderRadius: 18, borderWidth: 1, padding: 20 },
  renameButtons: { flexDirection: "row", gap: 12 },
  renameCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  renameSaveBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  renameBtnText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  folderPickItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  folderPickLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  folderPickCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
