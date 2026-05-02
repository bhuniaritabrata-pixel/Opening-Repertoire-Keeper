import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useEngine } from "@/context/EngineContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function EngineSlotModal({ visible, onClose }: Props) {
  const colors = useColors();
  const {
    engineType, setEngineType,
    externalConfig, saveExternalEngine, removeExternalEngine,
    connectionStatus, connectionError,
    connectEngine, disconnectEngine,
    testConnection,
  } = useEngine();

  const [name, setName] = useState(externalConfig?.name ?? "My Stockfish");
  const [url, setUrl] = useState(externalConfig?.url ?? "ws://192.168.1.x:3004");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    if (visible) {
      setName(externalConfig?.name ?? "My Stockfish");
      setUrl(externalConfig?.url ?? "ws://192.168.1.x:3004");
      setTestResult(null);
    }
  }, [visible, externalConfig]);

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
    setEngineType("external");
    connectEngine();
    onClose();
  };

  const handleUseBuiltin = () => {
    setEngineType("builtin");
    disconnectEngine();
    onClose();
  };

  const statusColor = {
    idle: colors.mutedForeground,
    connecting: colors.primary,
    ready: "#4caf50",
    error: colors.destructive,
    disconnected: colors.mutedForeground,
  }[connectionStatus];

  const statusLabel = {
    idle: "Not connected",
    connecting: "Connecting…",
    ready: "Connected ✓",
    error: connectionError ?? "Error",
    disconnected: "Disconnected",
  }[connectionStatus];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title */}
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <Feather name="cpu" size={18} color={colors.primary} />
                <Text style={[styles.title, { color: colors.foreground }]}>Engine Slot</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Built-in option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                { borderColor: engineType === "builtin" ? colors.primary : colors.border,
                  backgroundColor: engineType === "builtin" ? colors.primary + "15" : colors.muted + "40" },
              ]}
              onPress={handleUseBuiltin}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name="zap" size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>Built-in Engine</Text>
                  <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>Material evaluation (fast, offline)</Text>
                </View>
              </View>
              {engineType === "builtin" && (
                <Feather name="check-circle" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* External engine option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                { borderColor: engineType === "external" ? "#4caf50" : colors.border,
                  backgroundColor: engineType === "external" ? "#4caf5015" : colors.muted + "40" },
              ]}
              onPress={() => setEngineType("external")}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, { backgroundColor: "#4caf5022" }]}>
                  <Feather name="link" size={16} color="#4caf50" />
                </View>
                <View>
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>External UCI Engine</Text>
                  <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>Stockfish, Lc0, or any UCI server</Text>
                </View>
              </View>
              {engineType === "external" && (
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              )}
            </TouchableOpacity>

            {/* External engine config */}
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
                onChangeText={(t) => { setUrl(t); setTestResult(null); }}
                placeholder="ws://192.168.1.x:3004"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              {/* Status row */}
              {engineType === "external" && (
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              )}

              {/* Test button */}
              <TouchableOpacity
                style={[styles.testBtn, { borderColor: colors.border }]}
                onPress={handleTest}
                disabled={testing || !url.trim().startsWith("ws")}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name="wifi" size={14} color={colors.primary} />
                )}
                <Text style={[styles.testBtnText, { color: colors.primary }]}>
                  {testing ? "Testing…" : "Test connection"}
                </Text>
                {testResult === "ok" && <Feather name="check" size={14} color="#4caf50" />}
                {testResult === "fail" && <Feather name="x" size={14} color={colors.destructive} />}
              </TouchableOpacity>

              {testResult === "ok" && (
                <Text style={[styles.hint, { color: "#4caf50" }]}>Engine responded — ready to connect!</Text>
              )}
              {testResult === "fail" && (
                <Text style={[styles.hint, { color: colors.destructive }]}>Could not reach engine. Check URL and server.</Text>
              )}
            </View>

            {/* How-to instructions */}
            <View style={[styles.howto, { backgroundColor: colors.muted + "30", borderColor: colors.border }]}>
              <Text style={[styles.howtoTitle, { color: colors.foreground }]}>
                <Feather name="info" size={13} /> How to use a UCI engine
              </Text>
              {[
                "Install Stockfish on your PC or a server.",
                "Run a UCI-WebSocket bridge (e.g. stockfish-ws-proxy):",
                "npx stockfish-ws-proxy --port 3004",
                "Make sure your phone and PC are on the same Wi-Fi.",
                "Enter the PC's local IP above, e.g. ws://192.168.1.5:3004",
              ].map((line, i) => (
                <Text
                  key={i}
                  style={[
                    styles.howtoLine,
                    { color: line.startsWith("npx") ? colors.primary : colors.mutedForeground,
                      fontFamily: line.startsWith("npx") ? "monospace" : undefined,
                      fontSize: line.startsWith("npx") ? 11 : 12 },
                  ]}
                >
                  {i !== 2 ? `${i + 1}. ${line}` : `   ${line}`}
                </Text>
              ))}
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveAndConnect}
            >
              <Feather name="link" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Save & Connect</Text>
            </TouchableOpacity>

            {externalConfig && (
              <TouchableOpacity
                style={[styles.removeBtn, { borderColor: colors.destructive }]}
                onPress={() => { removeExternalEngine(); onClose(); }}
              >
                <Feather name="trash-2" size={14} color={colors.destructive} />
                <Text style={[styles.removeBtnText, { color: colors.destructive }]}>Remove external engine</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 10,
    maxHeight: "90%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16,
  },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  closeBtn: { padding: 4 },
  optionCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 2, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  optionTitle: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  optionSub: { fontSize: 12, marginTop: 1 },
  configBox: {
    borderWidth: 1, borderRadius: 12, padding: 14,
    gap: 8, marginBottom: 12,
  },
  configLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 9, fontSize: 13,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
  testBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: 8, paddingVertical: 8,
    paddingHorizontal: 12, alignSelf: "flex-start", marginTop: 4,
  },
  testBtnText: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12, marginTop: 2 },
  howto: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    marginBottom: 14, gap: 4,
  },
  howtoTitle: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  howtoLine: { lineHeight: 18 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  removeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  removeBtnText: { fontSize: 13, fontWeight: "600" },
});
