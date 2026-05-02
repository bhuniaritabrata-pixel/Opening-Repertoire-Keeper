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

const OEX_GREEN = "#2e7d32";
const OEX_GREEN_BG = "#1a6b3033";

export default function EngineSlotModal({ visible, onClose }: Props) {
  const colors = useColors();
  const {
    activeSlot, setActiveSlot,
    oexEngines, activeOexId, addOexEngine, removeOexEngine, selectOexEngine,
    externalConfig, saveExternalEngine, removeExternalEngine,
    connectionStatus, connectionError,
    connectEngine, disconnectEngine,
    testConnection,
  } = useEngine();

  // External slot state
  const [name, setName] = useState(externalConfig?.name ?? "Stockfish");
  const [url, setUrl] = useState(externalConfig?.url ?? "ws://192.168.1.x:3004");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [expandedSlot, setExpandedSlot] = useState<EngineSlot | null>(null);

  // OEX add-engine form
  const [showOexForm, setShowOexForm] = useState(false);
  const [oexName, setOexName] = useState("");
  const [oexPackage, setOexPackage] = useState("");

  useEffect(() => {
    if (visible) {
      setName(externalConfig?.name ?? "Stockfish");
      setUrl(externalConfig?.url ?? "ws://192.168.1.x:3004");
      setTestResult(null);
      setExpandedSlot(activeSlot === "external" ? "external" : null);
      setShowOexForm(false);
      setOexName("");
      setOexPackage("");
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

  const handleAddOex = () => {
    if (!oexPackage.trim()) return;
    addOexEngine(oexName, oexPackage);
    setOexName("");
    setOexPackage("");
    setShowOexForm(false);
    // Auto-switch to OEX slot
    setActiveSlot("oex");
    onClose();
  };

  const handleSelectOex = (id: string) => {
    selectOexEngine(id);
    setActiveSlot("oex");
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
                  Alpha-beta · ~SF 10 strength · Always offline
                </Text>
              </View>
              {activeSlot === "builtin" && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* ── Slot 2 — OEX ───────────────────────────────────────── */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              SLOT 2  ·  OEX ENGINES
            </Text>

            {/* Engine list */}
            {oexEngines.length === 0 && !showOexForm && (
              <View style={[styles.emptyOex, { borderColor: colors.border, backgroundColor: colors.muted + "30" }]}>
                <Feather name="package" size={22} color={colors.mutedForeground} style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyOexTitle, { color: colors.foreground }]}>No OEX engines added</Text>
                <Text style={[styles.emptyOexSub, { color: colors.mutedForeground }]}>
                  Add Stockfish or any OEX-compatible engine installed from the Play Store.
                </Text>
                <TouchableOpacity
                  style={[styles.playStoreLink, { borderColor: OEX_GREEN }]}
                  onPress={() => Linking.openURL("https://play.google.com/store/apps/details?id=com.calc.stockfish")}
                >
                  <Feather name="external-link" size={13} color={OEX_GREEN} />
                  <Text style={[styles.playStoreLinkText, { color: OEX_GREEN }]}>Get Stockfish on Play Store</Text>
                </TouchableOpacity>
              </View>
            )}

            {oexEngines.map(eng => {
              const isSelected = activeOexId === eng.id;
              const isActive = activeSlot === "oex" && isSelected;
              return (
                <View
                  key={eng.id}
                  style={[
                    styles.oexRow,
                    {
                      borderColor: isActive ? OEX_GREEN : colors.border,
                      backgroundColor: isActive ? OEX_GREEN_BG : colors.muted + "30",
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.oexRowMain}
                    onPress={() => handleSelectOex(eng.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.slotIcon, { backgroundColor: OEX_GREEN_BG }]}>
                      <Feather name="cpu" size={16} color={OEX_GREEN} />
                    </View>
                    <View style={styles.slotInfo}>
                      <View style={styles.oexNameRow}>
                        <Text style={[styles.slotName, { color: colors.foreground }]}>{eng.name}</Text>
                        <View style={[styles.oexBadge, { borderColor: OEX_GREEN }]}>
                          <Text style={[styles.oexBadgeText, { color: OEX_GREEN }]}>OEX</Text>
                        </View>
                      </View>
                      <Text
                        style={[styles.slotSub, { color: colors.mutedForeground, fontFamily: "monospace" }]}
                        numberOfLines={1}
                      >
                        {eng.packageName}
                      </Text>
                    </View>
                    {isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: OEX_GREEN }]}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                    {!isActive && (
                      <View style={[styles.selectCircle, { borderColor: isSelected ? OEX_GREEN : colors.border }]}>
                        {isSelected && <View style={[styles.selectDot, { backgroundColor: OEX_GREEN }]} />}
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.oexDeleteBtn}
                    onPress={() => removeOexEngine(eng.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* OEX warning note */}
            {oexEngines.length > 0 && (
              <View style={[styles.oexNote, { backgroundColor: colors.muted + "30", borderColor: colors.border }]}>
                <Feather name="info" size={12} color={colors.primary} />
                <Text style={[styles.oexNoteText, { color: colors.mutedForeground }]}>
                  OEX engine communication requires a signed APK build. Entries are saved and will activate automatically once the APK is installed alongside the engine app.
                </Text>
              </View>
            )}

            {/* Add OEX engine form */}
            {showOexForm ? (
              <View style={[styles.oexForm, { borderColor: OEX_GREEN, backgroundColor: OEX_GREEN_BG }]}>
                <Text style={[styles.oexFormTitle, { color: colors.foreground }]}>Add OEX Engine</Text>

                <Text style={[styles.configLabel, { color: colors.mutedForeground }]}>Display name</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                  value={oexName}
                  onChangeText={setOexName}
                  placeholder="e.g. Stockfish 17"
                  placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[styles.configLabel, { color: colors.mutedForeground }]}>Package name</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: "monospace", fontSize: 12 }]}
                  value={oexPackage}
                  onChangeText={setOexPackage}
                  placeholder="e.g. com.calc.stockfish"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={[styles.oexNoteText, { color: colors.mutedForeground, marginBottom: 4 }]}>
                  Find the package name on the Play Store URL or in your engine app's settings.
                </Text>

                <View style={styles.oexFormActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowOexForm(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addOexBtn, { backgroundColor: oexPackage.trim() ? OEX_GREEN : colors.muted }]}
                    onPress={handleAddOex}
                    disabled={!oexPackage.trim()}
                  >
                    <Feather name="plus" size={14} color="#fff" />
                    <Text style={styles.addOexBtnText}>Add Engine</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addOexTrigger, { borderColor: OEX_GREEN, backgroundColor: OEX_GREEN_BG }]}
                onPress={() => setShowOexForm(true)}
              >
                <Feather name="plus-circle" size={15} color={OEX_GREEN} />
                <Text style={[styles.addOexTriggerText, { color: OEX_GREEN }]}>Add OEX Engine</Text>
              </TouchableOpacity>
            )}

            {/* ── Slot 3 — External UCI via WebSocket ─────────────────── */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 4 }]}>
              SLOT 3  ·  NETWORK ENGINE
            </Text>

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

            <View style={{ height: 24 }} />
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
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 6, marginTop: 8 },

  // Generic slot card
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

  // OEX list items
  oexRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 8, gap: 8,
  },
  oexRowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  oexNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  oexBadge: { borderWidth: 1.5, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  oexBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  selectCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  selectDot: { width: 10, height: 10, borderRadius: 5 },
  oexDeleteBtn: { padding: 6 },

  // OEX empty state
  emptyOex: {
    borderWidth: 1.5, borderRadius: 14, borderStyle: "dashed",
    padding: 20, marginBottom: 10, alignItems: "center",
  },
  emptyOexTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  emptyOexSub: { fontSize: 12, textAlign: "center", lineHeight: 18, marginBottom: 12 },
  playStoreLink: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1.5, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12,
  },
  playStoreLinkText: { fontSize: 12, fontWeight: "600" },

  // OEX info note
  oexNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8,
  },
  oexNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },

  // Add OEX trigger button
  addOexTrigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed",
    paddingVertical: 11, marginBottom: 10,
  },
  addOexTriggerText: { fontSize: 13, fontWeight: "700" },

  // OEX add form
  oexForm: {
    borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6,
  },
  oexFormTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  oexFormActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  cancelBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  cancelBtnText: { fontSize: 13, fontWeight: "600" },
  addOexBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 8, paddingVertical: 8,
  },
  addOexBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Config box (network slot)
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
