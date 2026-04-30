import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnalysisPanel from "@/components/AnalysisPanel";
import AnnotationPicker from "@/components/AnnotationPicker";
import BoardControls from "@/components/BoardControls";
import BoardThemePanel from "@/components/BoardThemePanel";
import ChessBoard from "@/components/ChessBoard";
import EvalBar from "@/components/EvalBar";
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
  const { openings, importPgn, updateOpening } = useRepertoire();
  const { currentNodeId, annotateNode, currentPath, analysisEnabled, setAnalysisEnabled, deleteCurrentMove } = useBoard();
  const [showTheme, setShowTheme] = useState(false);
  const [showPgn, setShowPgn] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [activeTab, setActiveTab] = useState<"moves" | "analysis">("moves");

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
        {/* Board + Eval Bar */}
        <View style={styles.boardRow}>
          <EvalBar />
          <ChessBoard />
        </View>

        {/* Board Controls */}
        <BoardControls />

        {/* Tab selector */}
        <View style={[styles.tabs, { backgroundColor: colors.muted, marginTop: 12 }]}>
          {(["moves", "analysis"] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { backgroundColor: colors.card }]}
              onPress={() => setActiveTab(tab)}
            >
              <Feather
                name={tab === "moves" ? "list" : "cpu"}
                size={14}
                color={activeTab === tab ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.foreground : colors.mutedForeground }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "moves" ? (
          <View style={[styles.movesPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MoveTree opening={opening} />
            {currentNodeId && (
              <View style={[styles.annotationContainer, { borderTopColor: colors.border }]}>
                <AnnotationPicker
                  currentAnnotation={currentAnnotation}
                  onSelect={handleAnnotate}
                />
                <TouchableOpacity
                  style={[styles.deleteMoveBtn, { borderColor: colors.destructive }]}
                  onPress={handleDeleteMove}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.deleteMoveText, { color: colors.destructive }]}>
                    Delete this move
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <AnalysisPanel />
        )}
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
  boardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    alignSelf: "stretch",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
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
});
