import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnnotationPicker from "@/components/AnnotationPicker";
import BoardControls from "@/components/BoardControls";
import BoardThemePanel from "@/components/BoardThemePanel";
import ChessBoard from "@/components/ChessBoard";
import MoveTree from "@/components/MoveTree";
import PgnImport from "@/components/PgnImport";
import { BoardProvider, useBoard } from "@/context/BoardContext";
import { useRepertoire } from "@/context/RepertoireContext";
import { useColors } from "@/hooks/useColors";
import { MoveAnnotation } from "@/types/chess";

function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { openings, importPgn } = useRepertoire();
  const { currentNodeId, annotateNode, currentPath, deleteCurrentMove, noteNode, currentNote } = useBoard();
  const [showTheme, setShowTheme] = useState(false);
  const [showPgn, setShowPgn] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState("");

  const opening = openings.find(o => o.id === id);

  const currentAnnotation = currentPath.length > 0
    ? currentPath[currentPath.length - 1]?.move.annotation
    : undefined;

  const handleAnnotate = (annotation: MoveAnnotation | undefined) => {
    if (currentNodeId) {
      annotateNode(currentNodeId, annotation);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDeleteMove = () => {
    if (!currentNodeId) return;
    const moveSan = currentPath[currentPath.length - 1]?.move.san || "this move";
    const doDelete = () => {
      deleteCurrentMove();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };
    if (Platform.OS === "web") {
      if (confirm(`Delete "${moveSan}" and all moves that follow it?`)) doDelete();
      return;
    }
    Alert.alert(
      "Delete move?",
      `Delete "${moveSan}" and all moves that follow it?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ],
    );
  };

  if (!opening) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, textAlign: "center", marginTop: 100 }}>
          Opening not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS !== "web" ? insets.top : 67 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.headerForeground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.headerForeground }]} numberOfLines={1}>
            {opening.name}
          </Text>
          <Text style={[styles.headerSub, { color: "rgba(255,255,255,0.5)" }]}>
            {opening.color.charAt(0).toUpperCase() + opening.color.slice(1)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowPgn(true)}
          >
            <Feather name="download" size={18} color={colors.headerForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowTheme(true)}
          >
            <Feather name="sliders" size={18} color={colors.headerForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <ChessBoard />
        <BoardControls />

        <View style={[styles.movesPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MoveTree opening={opening} />
          {currentNodeId && (
            <View style={[styles.annotationContainer, { borderTopColor: colors.border }]}>
              <AnnotationPicker
                currentAnnotation={currentAnnotation}
                onSelect={handleAnnotate}
              />

              {/* Delete + Note buttons row */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.deleteMoveBtn, { borderColor: colors.destructive }]}
                  onPress={handleDeleteMove}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.deleteMoveText, { color: colors.destructive }]}>
                    Delete this move
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.noteBtn,
                    { borderColor: "#1976d2", backgroundColor: editingNote ? "#1976d2" : "transparent" },
                  ]}
                  onPress={() => {
                    if (!editingNote) {
                      setDraftNote(currentNote);
                      setEditingNote(true);
                    } else {
                      // Save on second tap
                      if (currentNodeId) noteNode(currentNodeId, draftNote.trim());
                      setEditingNote(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Feather
                    name={editingNote ? "check" : "edit-2"}
                    size={14}
                    color={editingNote ? "#fff" : "#1976d2"}
                  />
                  <Text style={[styles.noteBtnText, { color: editingNote ? "#fff" : "#1976d2" }]}>
                    {editingNote ? "Save note" : "Add note"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Note box — shown when editing OR when a saved note exists */}
              {(editingNote || currentNote.length > 0) && (
                <View style={[styles.noteBox, { borderColor: "#1976d2" + "55", backgroundColor: "#1976d2" + "0d" }]}>
                  {/* "note:" label pinned to top-right */}
                  <Text style={[styles.noteLabel, { color: "#1976d2" }]}>note:</Text>

                  {editingNote ? (
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                      <TextInput
                        style={[styles.noteInput, { color: colors.foreground }]}
                        value={draftNote}
                        onChangeText={setDraftNote}
                        multiline
                        autoFocus
                        placeholder="Write your note here…"
                        placeholderTextColor={colors.mutedForeground}
                        onSubmitEditing={() => {
                          if (currentNodeId) noteNode(currentNodeId, draftNote.trim());
                          setEditingNote(false);
                        }}
                      />
                    </KeyboardAvoidingView>
                  ) : (
                    <ScrollView
                      style={styles.noteScroll}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={[styles.noteText, { color: colors.foreground }]}>
                        {currentNote}
                      </Text>
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <BoardThemePanel visible={showTheme} onClose={() => setShowTheme(false)} />
      <PgnImport
        visible={showPgn}
        onClose={() => setShowPgn(false)}
        onImport={(pgn) => importPgn(opening.id, pgn)}
      />
    </View>
  );
}

export default function BoardScreenWrapper() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { openings } = useRepertoire();
  const opening = openings.find(o => o.id === id) || null;

  return (
    <BoardProvider opening={opening}>
      <BoardScreen />
    </BoardProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 12,
    alignItems: "center",
  },
  movesPanel: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    alignSelf: "stretch",
    minHeight: 120,
    overflow: "hidden",
  },
  annotationContainer: {
    borderTopWidth: 1,
    padding: 12,
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  deleteMoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  deleteMoveText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  noteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  noteBtnText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  noteBox: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    paddingTop: 22,   // room for the "note:" label
    minHeight: 60,
    maxHeight: 140,
    position: "relative",
  },
  noteLabel: {
    position: "absolute",
    top: 6,
    left: 10,
    fontSize: 11,
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: 0.2,
  },
  noteScroll: {
    maxHeight: 110,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  noteInput: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    minHeight: 60,
    textAlignVertical: "top",
  },
});
