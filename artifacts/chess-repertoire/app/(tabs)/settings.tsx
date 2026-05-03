import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeMode, SplashType, useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

const APP_VERSION = "1.0.0";

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

function RadioOption({
  label, description, selected, onSelect,
}: {
  label: string; description?: string; selected: boolean; onSelect: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[
        styles.radioOption,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + "12" : colors.card },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      activeOpacity={0.75}
    >
      <View style={styles.radioLeft}>
        <View style={[styles.radioCircle, { borderColor: selected ? colors.primary : colors.border }]}>
          {selected && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
        </View>
        <View style={styles.radioText}>
          <Text style={[styles.radioLabel, { color: selected ? colors.primary : colors.foreground }]}>
            {label}
          </Text>
          {description && (
            <Text style={[styles.radioDesc, { color: colors.mutedForeground }]}>{description}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ToggleRow({
  icon, label, description, value, onToggle,
}: {
  icon: string; label: string; description?: string; value: boolean; onToggle: () => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.toggleIcon, { backgroundColor: colors.primary + "22" }]}>
        <Feather name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        {description && (
          <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        trackColor={{ false: "#767577", true: colors.primary + "80" }}
        thumbColor={value ? colors.primary : "#f4f3f4"}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { themeMode, setThemeMode, splashType, setSplashType } = useTheme();

  const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; description: string }> = [
    { value: "auto",  label: "System default", description: "Follow device setting" },
    { value: "light", label: "Light",          description: "Always use light theme" },
    { value: "dark",  label: "Dark",           description: "Always use dark theme" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? insets.top + 67 : 0 }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, paddingTop: Platform.OS !== "web" ? insets.top : 0 }]}>
        <Text style={[styles.headerTitle, { color: colors.headerForeground }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Appearance ─────────────────────────────────────────────── */}
        <SectionHeader title="Appearance" />
        <View style={styles.group}>
          {THEME_OPTIONS.map((opt, i) => (
            <View key={opt.value}>
              <RadioOption
                label={opt.label}
                description={opt.description}
                selected={themeMode === opt.value}
                onSelect={() => setThemeMode(opt.value)}
              />
              {i < THEME_OPTIONS.length - 1 && (
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* ── General ────────────────────────────────────────────────── */}
        <SectionHeader title="General" />
        <ToggleRow
          icon="play-circle"
          label="Animated Splash Screen"
          description="Knight hops to center on app launch"
          value={splashType === "animated"}
          onToggle={() => setSplashType(splashType === "animated" ? "classic" : "animated")}
        />

        {/* ── About ──────────────────────────────────────────────────── */}
        <SectionHeader title="About" />
        <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: colors.mutedForeground }]}>Version</Text>
            <Text style={[styles.aboutVal, { color: colors.foreground }]}>{APP_VERSION}</Text>
          </View>
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: colors.mutedForeground }]}>Pieces</Text>
            <Text style={[styles.aboutVal, { color: colors.foreground }]}>cburnett via Lichess</Text>
          </View>
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: colors.mutedForeground }]}>Built with</Text>
            <Text style={[styles.aboutVal, { color: colors.foreground }]}>Expo SDK 54</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    paddingTop: 8,
  },
  scroll:   { flex: 1 },
  content:  { paddingHorizontal: 16, paddingTop: 8 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: "Inter_600SemiBold",
  },

  group: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 0,
  },
  radioLeft:   { flexDirection: "row", alignItems: "center", flex: 1 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center", marginRight: 12 },
  radioFill:   { width: 10, height: 10, borderRadius: 5 },
  radioText:   { flex: 1 },
  radioLabel:  { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  radioDesc:   { fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },
  separator:   { height: 1, marginHorizontal: 16 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  toggleIcon:  { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  toggleText:  { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  toggleDesc:  { fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },

  aboutCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  aboutKey: { fontSize: 14, fontFamily: "Inter_400Regular" },
  aboutVal: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
