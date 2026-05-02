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
import { useEngine } from "@/context/EngineContext";
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
    oexEngines, activeOexId,
    addOexEngine, updateOexEngine, removeOexEngine, selectOexEngine,
    connectionStatus, connectionError,
    connectEngine, disconnectEngine,
    testConnection,
  } = useEngine();

  // Add form state
  const [showOexForm, setShowOexForm] = useState(false);
  const [oexName, setOexName] = useState("");
  const [oexPackage, setOexPackage] = useState("");
  const [oexWsUrl, setOexWsUrl] = useState("");

  // Per-entry edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWsUrl, setEditWsUrl] = useState("");

  // Connection testing
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    if (visible) {
      setShowOexForm(false);
      setOexName(""); setOexPackage(""); setOexWsUrl("");
      setEditingId(null); setEditWsUrl("");
      setTestResult(null);
    }
  }, [visible]);

  const activeEntry = oexEngines.find(e => e.id === activeOexId);

  const handleSelectBuiltin = () => {
    setActiveSlot("builtin");
    disconnectEngine();
    onClose();
  };

  const handleAddOex = () => {
    if (!oexPackage.trim()) return;
    addOexEngine(oexName, oexPackage, oexWsUrl || undefined);
    setOexName(""); setOexPackage(""); setOexWsUrl("");
    setShowOexForm(false);
    setActiveSlot("oex");
    onClose();
  };

  const handleSelectOex = (id: string) => {
    selectOexEngine(id);
    setActiveSlot("oex");
    onClose();
  };

  const handleConnect = () => {
    if (connectionStatus === "ready" || connectionStatus === "connecting") {
      disconnectEngine();
    } else {
      connectEngine();
    }
  };

  const handleTest = async (url: string) => {
    setTesting(true);
    setTestResult(null);
    const ok = await testConnection(url);
    setTestResult(ok ? "ok" : "fail");
    setTesting(false);
  };

  const handleSaveWsUrl = (id: string) => {
    updateOexEngine(id, { wsUrl: editWsUrl.trim() || undefined });
    setEditingId(null);
    setEditWsUrl("");
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

            {/* ── Slot 1 — Built-in ───────────────────────────────────── */}
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

            {/* ── Slot 2 — OEX engines ────────────────────────────────── */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
              SLOT 2  ·  OEX ENGINE
            </Text>

            {/* Empty state */}
            {oexEngines.length === 0 && !showOexForm && (
              <View style={[styles.emptyOex, { borderColor: colors.border, backgroundColor: colors.muted + "30" }]}>
                <Feather name="package" size={22} color={colors.mutedForeground} style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyOexTitle, { color: colors.foreground }]}>No OEX engines added</Text>
                <Text style={[styles.emptyOexSub, { color: colors.mutedForeground }]}>
                  Add Stockfish or any OEX-compatible engine. For live analysis, also enter its WebSocket bridge URL.
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

            {/* Engine entries */}
            {oexEngines.map(eng => {
              const isSelected = activeOexId === eng.id;
              const isActive = activeSlot === "oex" && isSelected;
              const isConnectedEntry = isActive && (connectionStatus === "ready" || connectionStatus === "connecting");
              const isEditingThis = editingId === eng.id;

              return (
                <View
                  key={eng.id}
                  style={[
                    styles.oexCard,
                    {
                      borderColor: isActive
                        ? (connectionStatus === "ready" ? "#4caf50" : OEX_GREEN)
                        : colors.border,
                      backgroundColor: isActive ? OEX_GREEN_BG : colors.muted + "30",
                    },
                  ]}
                >
                  {/* Engine header row */}
                  <TouchableOpacity
                    style={styles.oexCardHeader}
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
                    {isActive ? (
                      <View style={[styles.activeBadge, { backgroundColor: connectionStatus === "ready" ? "#4caf50" : OEX_GREEN }]}>
                        <Text style={styles.activeBadgeText}>
                          {connectionStatus === "ready" ? "Live" : "Active"}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.selectCircle, { borderColor: isSelected ? OEX_GREEN : colors.border }]}>
                        {isSelected && <View style={[styles.selectDot, { backgroundColor: OEX_GREEN }]} />}
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => removeOexEngine(eng.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* WebSocket section — visible when selected */}
                  {isSelected && (
                    <View style={[styles.wsSection, { borderTopColor: colors.border }]}>
                      {/* WS URL display / edit */}
                      {isEditingThis ? (
                        <View style={styles.wsEditRow}>
                          <TextInput
                            style={[styles.wsInput, { color: colors.foreground, borderColor: OEX_GREEN, backgroundColor: colors.card }]}
                            value={editWsUrl}
                            onChangeText={setEditWsUrl}
                            placeholder="ws://192.168.1.x:3004"
                            placeholderTextColor={colors.mutedForeground}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            autoFocus
                          />
                          <TouchableOpacity
                            style={[styles.wsActionBtn, { backgroundColor: OEX_GREEN }]}
                            onPress={() => handleSaveWsUrl(eng.id)}
                          >
                            <Feather name="check" size={14} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.wsActionBtn, { backgroundColor: colors.muted }]}
                            onPress={() => { setEditingId(null); setEditWsUrl(""); }}
                          >
                            <Feather name="x" size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.wsUrlRow, { borderColor: colors.border, backgroundColor: colors.card + "80" }]}
                          onPress={() => { setEditingId(eng.id); setEditWsUrl(eng.wsUrl ?? ""); setTestResult(null); }}
                          activeOpacity={0.7}
                        >
                          <Feather name="wifi" size={13} color={eng.wsUrl ? OEX_GREEN : colors.mutedForeground} />
                          <Text
                            style={[styles.wsUrlText, { color: eng.wsUrl ? colors.foreground : colors.mutedForeground, fontFamily: "monospace" }]}
                            numberOfLines={1}
                          >
                            {eng.wsUrl || "Tap to set WebSocket bridge URL…"}
                          </Text>
                          <Feather name="edit-2" size={12} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      )}

                      {/* Test + Connect row */}
                      {eng.wsUrl && !isEditingThis && (
                        <View style={styles.wsActionsRow}>
                          {/* Test button */}
                          <TouchableOpacity
                            style={[styles.testBtn, { borderColor: colors.border }]}
                            onPress={() => handleTest(eng.wsUrl!)}
                            disabled={testing}
                          >
                            {testing
                              ? <ActivityIndicator size="small" color={colors.primary} />
                              : <Feather name="activity" size={13} color={colors.primary} />}
                            <Text style={[styles.testBtnText, { color: colors.primary }]}>
                              {testing ? "Testing…" : "Test"}
                            </Text>
                            {testResult === "ok" && <Feather name="check" size={12} color="#4caf50" />}
                            {testResult === "fail" && <Feather name="x" size={12} color={colors.destructive} />}
                          </TouchableOpacity>

                          {/* Connect / Disconnect button */}
                          <TouchableOpacity
                            style={[
                              styles.connectBtn,
                              {
                                backgroundColor:
                                  connectionStatus === "ready" ? "#4caf50" :
                                  connectionStatus === "connecting" ? colors.primary + "aa" :
                                  connectionStatus === "error" ? colors.destructive :
                                  OEX_GREEN,
                              },
                            ]}
                            onPress={handleConnect}
                            disabled={connectionStatus === "connecting"}
                          >
                            {connectionStatus === "connecting" ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Feather
                                name={connectionStatus === "ready" ? "wifi-off" : "link"}
                                size={13}
                                color="#fff"
                              />
                            )}
                            <Text style={styles.connectBtnText}>
                              {connectionStatus === "ready" ? "Disconnect" :
                               connectionStatus === "connecting" ? "Connecting…" :
                               "Connect"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Status line */}
                      {isActive && eng.wsUrl && !isEditingThis && (
                        <View style={styles.statusRow}>
                          <View style={[styles.statusDot, { backgroundColor: statusColor[connectionStatus] }]} />
                          <Text style={[styles.statusText, { color: statusColor[connectionStatus] }]}>
                            {statusLabel[connectionStatus]}
                          </Text>
                        </View>
                      )}

                      {/* No wsUrl hint */}
                      {!eng.wsUrl && !isEditingThis && (
                        <Text style={[styles.wsHint, { color: colors.mutedForeground }]}>
                          Set a WebSocket URL to enable live analysis. Run{" "}
                          <Text style={{ fontFamily: "monospace", color: colors.primary }}>
                            npx stockfish-ws-proxy
                          </Text>{" "}
                          on your PC and enter its address. OEX native IPC activates in signed APK builds.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

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

                <Text style={[styles.configLabel, { color: colors.mutedForeground }]}>
                  WebSocket bridge URL{" "}
                  <Text style={{ fontWeight: "400", fontSize: 11 }}>(optional — for live analysis)</Text>
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, fontFamily: "monospace", fontSize: 12 }]}
                  value={oexWsUrl}
                  onChangeText={setOexWsUrl}
                  placeholder="ws://192.168.1.x:3004"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

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

            <View style={{ height: 28 }} />
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
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 6, marginTop: 4 },

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

  // OEX card (expandable)
  oexCard: {
    borderWidth: 1.5, borderRadius: 14, marginBottom: 8, overflow: "hidden",
  },
  oexCardHeader: {
    flexDirection: "row", alignItems: "center",
    padding: 12, gap: 10,
  },
  oexNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  oexBadge: { borderWidth: 1.5, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  oexBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  selectCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  selectDot: { width: 10, height: 10, borderRadius: 5 },
  deleteBtn: { padding: 6 },

  // WebSocket section inside OEX card
  wsSection: {
    borderTopWidth: 1, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10, gap: 8,
  },
  wsUrlRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
  },
  wsUrlText: { flex: 1, fontSize: 12 },
  wsEditRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  wsInput: {
    flex: 1, borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 12, fontFamily: "monospace",
  },
  wsActionBtn: {
    width: 34, height: 34, borderRadius: 8, justifyContent: "center", alignItems: "center",
  },
  wsActionsRow: { flexDirection: "row", gap: 8 },
  testBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, flex: 1,
  },
  testBtnText: { fontSize: 12, fontWeight: "600" },
  connectBtn: {
    flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 8, paddingVertical: 8,
  },
  connectBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },
  wsHint: { fontSize: 11, lineHeight: 17 },

  // Empty state
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

  // Add trigger
  addOexTrigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed",
    paddingVertical: 11, marginBottom: 10,
  },
  addOexTriggerText: { fontSize: 13, fontWeight: "700" },

  // Add form
  oexForm: { borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  oexFormTitle: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 4 },
  configLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3, marginTop: 4 },
  input: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 13,
  },
  oexFormActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  cancelBtnText: { fontSize: 13, fontWeight: "600" },
  addOexBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, paddingVertical: 9 },
  addOexBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
