import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface PgnImportProps {
  visible: boolean;
  onClose: () => void;
  onImport: (pgn: string) => boolean;
}

export default function PgnImport({ visible, onClose, onImport }: PgnImportProps) {
  const colors = useColors();
  const [pgn, setPgn] = useState("");

  const handleImport = () => {
    if (!pgn.trim()) {
      Alert.alert("Error", "Please enter a PGN string");
      return;
    }
    const success = onImport(pgn.trim());
    if (success) {
      setPgn("");
      onClose();
    } else {
      Alert.alert("Error", "Could not parse PGN. Please check the format.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Import PGN</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Paste your PGN notation below:
        </Text>

        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          value={pgn}
          onChangeText={setPgn}
          placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Supports standard PGN format with or without game headers.
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.importBtn, { backgroundColor: colors.primary }]}
            onPress={handleImport}
          >
            <Feather name="download" size={16} color={colors.primaryForeground} />
            <Text style={[styles.importText, { color: colors.primaryForeground }]}>Import</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 180,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  importBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  importText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
