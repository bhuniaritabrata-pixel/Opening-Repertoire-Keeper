import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useEngine, EngineSlot } from "@/context/EngineContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function EngineSlotModal({ visible, onClose }: Props) {
  const colors = useColors();
  const {
    activeSlot, setActiveSlot,
    externalConfig, saveExternalEngine, removeExternalEngine,
    connectionStatus, connectionError,
    connectEngine, disconnectEngine,
    testConnection,
  } = useEngine();

  const [name, setName] = useState(externalConfig?.name ?? "Stockfish");
  const [url, setUrl] = useState(externalConfig?.url ?? "ws://192.168.1.x:3004");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<EngineSlot | null>(null);

  useEffect(() => {
    if (visible) {
      setName(externalConfig?.name ?? "Stockfish");
      setUrl(externalConfig?.url ?? "ws://192.168.1.x:3004");
      setTestResult(null);
      setExpandedSlot(activeSlot === "external" ? "external" : null);
    }
  }, [visible, externalConfig, activeSlot]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const ok = await testConnection({ name, url: url.trim() });
    setTestResult(ok ? "ok" : "fail");
    setTesting(false);
  };

  const handleSaveAndConnect = async () => {
    const cfg = { name: name.trim() || "External Engine", url: url.trim() };
    await saveExternalEngine(cfg);
    setActiveSlot("external");
    connectEngine();
    onClose();
  };

  const handleSelectBuiltin = () => {
    setActiveSlot("builtin");
    disconnectEngine();
    onClose();
  };

  const statusColor: Record<string, string> = {
    idle: colors.mutedForeground,
    connecting: colors.primary,
    ready: "#4caf50",
    error: colors.destructive,
    disconnected: colors.destructive,
  };

  const statusLabel: Record<string, string> = {
    idle: "Not connected",
    connecting: "Connecting…",
    ready: "Connected ✓",
    error: connectionError ?? "Error",
    disconnected: "Disconnected",
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <Feather name="cpu" size={18} color={colors.primary} />
                <Text style={[styles.title, { color: colors.foreground }]}>Engine Slots</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* ── Slot 1 — Built-in ──────────────────────────────────── */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SLOT 1</Text>
            <TouchableOpacity
              style={[
                styles.slotCard,
                {
                  borderColor: activeSlot === "builtin" ? colors.primary : colors.border,
                  backgroundColor: activeSlot === "builtin" ? colors.primary + "12" : colors.muted + "40",
                },
              ]}
              onPress={handleSelectBuiltin}
              activeOpacity={0.75}
            >
              <View style={[styles.slotIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="zap" size={18} color={colors.primary} />
              </View>
              <View style={styles.slotInfo}>
                <Text style={[styles.slotName, { color: colors.foreground }]}>Built-in Engine</Text>
                <Text style={[styles.slotSub, { color: colors.mutedForeground }]}>
                  Alpha-beta search · ~SF 10 strength · Always offline
                </Text>
              </View>
              {activeSlot === "builtin" && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* ── Slot 2 — OEX (Play Store Stockfish) ────────────────── */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SLOT 2  ·  OEX ENGINES</Text>

            {/* OEX info card — Stockfish from Play Store */}
            <View style={[styles.oexCard, { borderColor: colors.border, backgroundColor: colors.muted + "30" }]}>
              <View style={styles.oexHeader}>
                <View style={[styles.slotIcon, { backgroundColor: "#1a6b3044" }]}>
                  <Feather name="download" size={18} color="#2e7d32" />
                </View>
                <View style={styles.slotInfo}>
                  <Text style={[styles.slotName, { color: colors.foreground }]}>Stockfish (Play Store)</Text>
                  <Text style={[styles.slotSub, { color: colors.mutedForeground }]}>
                    OEX engine · Auto-detected · Fully offline
                  </Text>
                </View>
                <View style={[styles.oexBadge, { borderColor: "#2e7d32" }]}>
                  <Text style={[styles.oexBadgeText, { color: "#2e7d32" }]}>OEX</Text>
                </View>
              </View>

              <View style={[styles.oexNote, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="info" size={13} color={colors.primary} />
                <Text style={[styles.oexNoteText, { color: colors.mutedForeground }]}>
                  OEX support requires a signed APK build. Install Stockfish from the Play Store, then rebuild your APK — it will be auto-detected just like Chessis.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.playStoreBtn, { borderColor: "#2e7d32" }]}
                onPress={() => Linking.openURL("https://play.google.com/store/apps/details?id=com.calc.stockfish")}
              >
                <Feather name="external-link" size={14} color="#2e7d32" />
                <Text style={[styles.playStoreBtnText, { color: "#2e7d32" }]}>Open Stockfish on Play Store</Text>
              </TouchableOpacity>
            </View>

            {/* ── Slot 3 — External UCI via WebSocket ─────────────────── */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SLOT 3  ·  NETWORK ENGINE</Text>

            <TouchableOpacity
              style={[
                styles.slotCard,
                {
                  borderColor: activeSlot === "external"
                    ? (connectionStatus === "ready" ? "#4caf50" : colors.primary)
                    : colors.border,
                  backgroundColor: activeSlot === "external" ? "#4caf5012" : colors.muted + "40",
                },
              ]}
              onPress={() => setExpandedSlot(expandedSlot === "external" ? null : "external")}
              activeOpacity={0.75}
            >
              <View style={[styles.slotIcon, { backgroundColor: "#4caf5022" }]}>
                <Feather name="wifi" size={18} color="#4caf50" />
              </View>
              <View style={styles.slotInfo}>
                <Text style={[styles.slotName, { color: colors.foreground }]}>
                  {externalConfig?.name ?? "UCI / WebSocket Engine"}
                </Text>
                <Text style={[styles.slotSub, { color: colors.mutedForeground }]}>
                  Any UCI engine over Wi-Fi
                </Text>
              </View>
              {activeSlot === "external" && (
                <View style={[styles.statusDot, { backgroundColor: statusColor[connectionStatus] }]} />
              )}
              <Feather
                name={expandedSlot === "external" ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedForeground}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>

            {expandedSlot === "external" && (
              <View style={[styles.configBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.configLabel, { color: colors.mutedForeground }]}>Engine name</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted + "40" }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Stockfish 17"
                  placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.configLabel, { color: colors.mutedForeground }]}>WebSocket URL</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted + "40", fontFamily: "monospace" }]}
                  value={url}
                  onChangeText={t => { setUrl(t); setTestResult(null); }}
                  placeholder="ws://192.168.1.x:3004"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                {activeSlot === "external" && (
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor[connectionStatus] }]} />
                    <Text style={[styles.statusText, { color: statusColor[connectionStatus] }]}>
                      {statusLabel[connectionStatus]}
                    </Text>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.testBtn, { borderColor: colors.border }]}
                    onPress={handleTest}
                    disabled={testing || !url.trim().startsWith("ws")}
                  >
                    {testing
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Feather name="wifi" size={14} color={colors.primary} />}
                    <Text style={[styles.testBtnText, { color: colors.primary }]}>
                      {testing ? "Testing…" : "Test"}
                    </Text>
                    {testResult === "ok" && <Feather name="check" size={13} color="#4caf50" />}
                    {testResult === "fail" && <Feather name="x" size={13} color={colors.destructive} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveAndConnect}
                  >
                    <Feather name="link" size={14} color="#fff" />
                    <Text style={styles.saveBtnText}>Save & Connect</Text>
                  </TouchableOpacity>
                </View>

                {testResult === "ok" && (
                  <Text style={[styles.hint, { color: "#4caf50" }]}>✓ Engine responded — ready to connect!</Text>
                )}
                {testResult === "fail" && (
                  <Text style={[styles.hint, { color: colors.destructive }]}>✗ Could not reach engine. Check URL and make sure both devices are on the same Wi-Fi.</Text>
                )}

                {/* How-to */}
                <View style={[styles.howto, { backgroundColor: colors.muted + "30", borderColor: colors.border }]}>
                  <Text style={[styles.howtoTitle, { color: colors.foreground }]}>How to connect</Text>
                  {[
                    "Install Stockfish on your PC.",
                    "Run a WebSocket bridge on your PC:",
                    "  npx stockfish-ws-proxy --port 3004",
                    "Your phone and PC must be on the same Wi-Fi.",
                    "Enter your PC's IP above, e.g. ws://192.168.1.5:3004",
                  ].map((line, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.howtoLine,
                        {
                          color: line.trim().startsWith("npx") ? colors.primary : colors.mutedForeground,
                          fontFamily: line.trim().startsWith("npx") ? "monospace" : undefined,
                          fontSize: line.trim().startsWith("npx") ? 11 : 12,
                        },
                      ]}
                    >
                      {line}
                    </Text>
                  ))}
                </View>

                {externalConfig && (
                  <TouchableOpacity
                    style={[styles.removeBtn, { borderColor: colors.destructive }]}
                    onPress={() => { removeExternalEngine(); onClose(); }}
                  >
                    <Feather name="trash-2" size={13} color={colors.destructive} />
                    <Text style={[styles.removeBtnText, { color: colors.destructive }]}>Remove engine config</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderWidth: 1, borderBottomWidth: 0,
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 10,
    maxHeight: "92%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  closeBtn: { padding: 4 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 6, marginTop: 6 },
  slotCard: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 10, gap: 12,
  },
  slotIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  slotInfo: { flex: 1 },
  slotName: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  slotSub: { fontSize: 12, marginTop: 2 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 4 },
  // OEX card
  oexCard: { borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 10, gap: 10 },
  oexHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  oexBadge: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  oexBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  oexNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 10,
  },
  oexNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  playStoreBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1.5, borderRadius: 8, paddingVertical: 8,
    paddingHorizontal: 12, alignSelf: "flex-start",
  },
  playStoreBtnText: { fontSize: 13, fontWeight: "600" },
  // Config box
  configBox: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8, marginBottom: 10 },
  configLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 12, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  testBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
  },
  testBtnText: { fontSize: 13, fontWeight: "600" },
  saveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8, borderRadius: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 17 },
  howto: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4, gap: 3 },
  howtoTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  howtoLine: { lineHeight: 19 },
  removeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 8, borderWidth: 1, marginTop: 4,
  },
  removeBtnText: { fontSize: 13, fontWeight: "600" },
});
