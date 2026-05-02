import { Feather } from "@expo/vector-icons";
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
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface PgnImportProps {
  visible: boolean;
  onClose: () => void;
  onImport: (pgn: string) => boolean;
}

const EXAMPLE_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.15"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

export default function PgnImport({ visible, onClose, onImport }: PgnImportProps) {
  const colors = useColors();
  const [pgn, setPgn] = useState("");
  const [importing, setImporting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleImport = () => {
    if (!pgn.trim()) {
      Alert.alert("Nothing to import", "Paste a PGN string first.");
      return;
    }
    setImporting(true);
    // Small delay so UI updates before sync work
    setTimeout(() => {
      const success = onImport(pgn.trim());
      setImporting(false);
      if (success) {
        setPgn("");
        onClose();
      } else {
        Alert.alert(
          "Import failed",
          "Could not read any moves from this PGN.\n\n" +
          "Make sure the PGN contains valid chess moves (e.g. 1. e4 e5 2. Nf3 Nc6...).\n\n" +
          "Chess.com PGN is fully supported — copy it from Share → PGN.",
        );
      }
    }, 50);
  };

  const handlePaste = () => {
    setPgn(EXAMPLE_PGN);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Import PGN</Text>
          <TouchableOpacity onPress={() => setShowHelp(!showHelp)} style={styles.headerBtn}>
            <Feather name="help-circle" size={20} color={showHelp ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* How-to panel */}
          {showHelp && (
            <View style={[styles.helpBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.helpTitle, { color: colors.foreground }]}>How to export from Chess.com</Text>
              {[
                { icon: "1", text: "Open any game in the Chess.com app" },
                { icon: "2", text: 'Tap the Share icon → "Share as PGN"' },
                { icon: "3", text: "Copy all the text" },
                { icon: "4", text: "Paste it into the box below and tap Import" },
              ].map((step) => (
                <View key={step.icon} style={styles.helpStep}>
                  <View style={[styles.helpNum, { backgroundColor: colors.primary }]}>
                    <Text style={styles.helpNumText}>{step.icon}</Text>
                  </View>
                  <Text style={[styles.helpText, { color: colors.mutedForeground }]}>{step.text}</Text>
                </View>
              ))}
              <View style={[styles.helpNote, { backgroundColor: colors.muted + "40", borderColor: colors.border }]}>
                <Feather name="check-circle" size={13} color="#5c8a3c" />
                <Text style={[styles.helpNoteText, { color: colors.mutedForeground }]}>
                  Supports Chess.com PGN with headers, comments, NAG annotations, and result tokens. Variations are skipped (only the main line is imported).
                </Text>
              </View>
            </View>
          )}

          {/* Source chips */}
          <View style={styles.sourceRow}>
            <View style={[styles.sourceChip, { borderColor: "#81b64c", backgroundColor: "#81b64c18" }]}>
              <Text style={[styles.sourceChipText, { color: "#81b64c" }]}>Chess.com ✓</Text>
            </View>
            <View style={[styles.sourceChip, { borderColor: colors.primary, backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.sourceChipText, { color: colors.primary }]}>Lichess ✓</Text>
            </View>
            <View style={[styles.sourceChip, { borderColor: colors.border, backgroundColor: colors.muted + "40" }]}>
              <Text style={[styles.sourceChipText, { color: colors.mutedForeground }]}>Standard PGN ✓</Text>
            </View>
          </View>

          {/* Input area */}
          <View style={[styles.inputWrapper, { borderColor: pgn ? colors.primary : colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={pgn}
              onChangeText={setPgn}
              placeholder={"Paste PGN here…\n\n[Event \"Live Chess\"]\n[White \"Player\"]\n\n1. e4 e5 2. Nf3 Nc6 ..."}
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
          </View>

          {/* Character count + try example */}
          <View style={styles.inputMeta}>
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {pgn.length > 0 ? `${pgn.length} chars` : ""}
            </Text>
            {!pgn && (
              <TouchableOpacity onPress={handlePaste}>
                <Text style={[styles.tryExample, { color: colors.primary }]}>Try example PGN</Text>
              </TouchableOpacity>
            )}
            {pgn.length > 0 && (
              <TouchableOpacity onPress={() => setPgn("")}>
                <Text style={[styles.tryExample, { color: colors.destructive }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Action buttons */}
        <View style={[styles.actions, { borderTopColor: colors.border, paddingBottom: Platform.OS !== "web" ? 24 : 16 }]}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.importBtn, { backgroundColor: pgn.trim() ? colors.primary : colors.muted }]}
            onPress={handleImport}
            disabled={importing || !pgn.trim()}
          >
            <Feather name="download" size={16} color={pgn.trim() ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.importText, { color: pgn.trim() ? "#fff" : colors.mutedForeground }]}>
              {importing ? "Importing…" : "Import"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // Help box
  helpBox: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  helpTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  helpStep: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  helpNum: { width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", marginTop: 1 },
  helpNumText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  helpText: { flex: 1, fontSize: 13, lineHeight: 19 },
  helpNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  helpNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Source chips
  sourceRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  sourceChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sourceChipText: { fontSize: 12, fontWeight: "700" },

  // Input
  inputWrapper: { borderWidth: 1.5, borderRadius: 12, overflow: "hidden" },
  input: {
    padding: 14, fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 200, lineHeight: 20,
  },
  inputMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  charCount: { fontSize: 12 },
  tryExample: { fontSize: 12, fontWeight: "600" },

  // Actions
  actions: {
    flexDirection: "row", gap: 12,
    paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "600" },
  importBtn: {
    flex: 2, borderRadius: 12, paddingVertical: 14,
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
  },
  importText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
