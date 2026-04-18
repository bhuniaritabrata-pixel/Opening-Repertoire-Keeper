import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BOARD_THEMES, BoardTheme } from "@/types/chess";
import { useBoard } from "@/context/BoardContext";
import { useColors } from "@/hooks/useColors";

interface BoardThemePanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function BoardThemePanel({ visible, onClose }: BoardThemePanelProps) {
  const colors = useColors();
  const { boardTheme, setBoardTheme, customLight, customDark, setCustomLight, setCustomDark } = useBoard();
  const [localLight, setLocalLight] = useState(customLight);
  const [localDark, setLocalDark] = useState(customDark);
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  const applyCustom = () => {
    setCustomLight(localLight);
    setCustomDark(localDark);
    setBoardTheme(BOARD_THEMES.find(t => t.id === "custom")!);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Board Theme</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.tabs, { borderColor: colors.border }]}>
          {(["presets", "custom"] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.primaryForeground : colors.mutedForeground }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "presets" ? (
          <ScrollView contentContainerStyle={styles.presetGrid}>
            {BOARD_THEMES.filter(t => t.id !== "custom").map(theme => (
              <TouchableOpacity
                key={theme.id}
                style={[styles.themeCard, boardTheme.id === theme.id && { borderColor: colors.primary, borderWidth: 2 }]}
                onPress={() => setBoardTheme(theme)}
              >
                <View style={styles.miniBoard}>
                  {[0,1,2,3].map(r => (
                    <View key={r} style={styles.miniRow}>
                      {[0,1,2,3].map(c => (
                        <View
                          key={c}
                          style={[styles.miniSquare, { backgroundColor: (r+c)%2===0 ? theme.lightSquare : theme.darkSquare }]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
                <Text style={[styles.themeName, { color: colors.foreground }]}>{theme.name}</Text>
                {boardTheme.id === theme.id && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.customContainer}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Preview</Text>
            <View style={styles.customPreview}>
              {[0,1,2,3].map(r => (
                <View key={r} style={styles.customPreviewRow}>
                  {[0,1,2,3].map(c => (
                    <View
                      key={c}
                      style={[styles.customSquare, { backgroundColor: (r+c)%2===0 ? localLight : localDark }]}
                    />
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.colorInputRow}>
              <View style={styles.colorInputGroup}>
                <Text style={[styles.colorLabel, { color: colors.foreground }]}>Light Square</Text>
                <View style={styles.colorInputContainer}>
                  <View style={[styles.colorSwatch, { backgroundColor: localLight, borderColor: colors.border }]} />
                  <TextInput
                    style={[styles.colorInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    value={localLight}
                    onChangeText={setLocalLight}
                    placeholder="#f0d9b5"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.colorInputGroup}>
                <Text style={[styles.colorLabel, { color: colors.foreground }]}>Dark Square</Text>
                <View style={styles.colorInputContainer}>
                  <View style={[styles.colorSwatch, { backgroundColor: localDark, borderColor: colors.border }]} />
                  <TextInput
                    style={[styles.colorInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    value={localDark}
                    onChangeText={setLocalDark}
                    placeholder="#b58863"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Enter hex color codes (e.g. #b58863 or #eeeed2)
            </Text>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              onPress={applyCustom}
            >
              <Text style={[styles.applyBtnText, { color: colors.primaryForeground }]}>Apply Custom Theme</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: "700" },
  closeBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  closeText: { fontSize: 16, fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  themeCard: {
    width: "45%",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
  },
  miniBoard: { flexDirection: "column" },
  miniRow: { flexDirection: "row" },
  miniSquare: { width: 30, height: 30 },
  themeName: { fontSize: 13, fontWeight: "600", padding: 8 },
  checkmark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  customContainer: { padding: 16, gap: 16 },
  sectionLabel: { fontSize: 13, fontWeight: "600" },
  customPreview: { alignSelf: "center" },
  customPreviewRow: { flexDirection: "row" },
  customSquare: { width: 50, height: 50 },
  colorInputRow: { flexDirection: "row", gap: 12 },
  colorInputGroup: { flex: 1, gap: 8 },
  colorLabel: { fontSize: 13, fontWeight: "600" },
  colorInputContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorSwatch: { width: 28, height: 28, borderRadius: 6, borderWidth: 1 },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  hint: { fontSize: 12, textAlign: "center" },
  applyBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  applyBtnText: { fontSize: 15, fontWeight: "700" },
});
