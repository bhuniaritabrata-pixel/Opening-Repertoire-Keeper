import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { UCIEngine } from "@/utils/uciEngine";

export type EngineSlot = "builtin" | "oex" | "external";
export type ConnectionStatus = "idle" | "connecting" | "ready" | "error" | "disconnected";

export interface ExternalEngineConfig {
  name: string;
  url: string;
}

export interface OexEngineEntry {
  id: string;
  name: string;
  packageName: string;
}

interface EngineContextType {
  activeSlot: EngineSlot;
  setActiveSlot: (s: EngineSlot) => void;
  // OEX
  oexEngines: OexEngineEntry[];
  activeOexId: string | null;
  addOexEngine: (name: string, packageName: string) => void;
  removeOexEngine: (id: string) => void;
  selectOexEngine: (id: string) => void;
  // External / WebSocket
  externalConfig: ExternalEngineConfig | null;
  saveExternalEngine: (cfg: ExternalEngineConfig) => Promise<void>;
  removeExternalEngine: () => void;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  connectEngine: () => Promise<void>;
  disconnectEngine: () => void;
  engine: UCIEngine | null;
  testConnection: (cfg: ExternalEngineConfig) => Promise<boolean>;
  // Legacy aliases so AnalysisPanel keeps working
  engineType: EngineSlot;
  setEngineType: (s: EngineSlot) => void;
}

const EngineContext = createContext<EngineContextType | null>(null);
const STORAGE_KEY = "@chess_engine_config_v3";

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const [activeSlot, setActiveSlotState] = useState<EngineSlot>("builtin");
  const [externalConfig, setExternalConfig] = useState<ExternalEngineConfig | null>(null);
  const [oexEngines, setOexEngines] = useState<OexEngineEntry[]>([]);
  const [activeOexId, setActiveOexId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const engineRef = useRef<UCIEngine | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.activeSlot) setActiveSlotState(data.activeSlot);
        if (data.externalConfig) setExternalConfig(data.externalConfig);
        if (Array.isArray(data.oexEngines)) setOexEngines(data.oexEngines);
        if (data.activeOexId) setActiveOexId(data.activeOexId);
      } catch {}
    });
  }, []);

  const persist = useCallback((
    slot: EngineSlot,
    cfg: ExternalEngineConfig | null,
    oex: OexEngineEntry[],
    oexId: string | null,
  ) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeSlot: slot, externalConfig: cfg, oexEngines: oex, activeOexId: oexId,
    }));
  }, []);

  const setActiveSlot = useCallback((s: EngineSlot) => {
    setActiveSlotState(s);
    persist(s, externalConfig, oexEngines, activeOexId);
    if (s !== "external") {
      engineRef.current?.disconnect();
      engineRef.current = null;
      setConnectionStatus("idle");
      setConnectionError(null);
    }
  }, [externalConfig, oexEngines, activeOexId, persist]);

  // ── OEX management ────────────────────────────────────────────────────────
  const addOexEngine = useCallback((name: string, packageName: string) => {
    const entry: OexEngineEntry = {
      id: Date.now().toString(),
      name: name.trim() || packageName,
      packageName: packageName.trim(),
    };
    const next = [...oexEngines, entry];
    setOexEngines(next);
    // Auto-select if this is the first one
    const newActiveId = oexEngines.length === 0 ? entry.id : activeOexId;
    setActiveOexId(newActiveId);
    persist(activeSlot, externalConfig, next, newActiveId);
  }, [oexEngines, activeOexId, activeSlot, externalConfig, persist]);

  const removeOexEngine = useCallback((id: string) => {
    const next = oexEngines.filter(e => e.id !== id);
    const newActiveId = activeOexId === id
      ? (next.length > 0 ? next[0].id : null)
      : activeOexId;
    setOexEngines(next);
    setActiveOexId(newActiveId);
    if (next.length === 0 && activeSlot === "oex") {
      setActiveSlotState("builtin");
      persist("builtin", externalConfig, next, null);
    } else {
      persist(activeSlot, externalConfig, next, newActiveId);
    }
  }, [oexEngines, activeOexId, activeSlot, externalConfig, persist]);

  const selectOexEngine = useCallback((id: string) => {
    setActiveOexId(id);
    persist(activeSlot, externalConfig, oexEngines, id);
  }, [activeSlot, externalConfig, oexEngines, persist]);

  // ── External WebSocket ────────────────────────────────────────────────────
  const saveExternalEngine = useCallback(async (cfg: ExternalEngineConfig) => {
    setExternalConfig(cfg);
    persist(activeSlot, cfg, oexEngines, activeOexId);
  }, [activeSlot, oexEngines, activeOexId, persist]);

  const removeExternalEngine = useCallback(() => {
    engineRef.current?.disconnect();
    engineRef.current = null;
    setExternalConfig(null);
    setActiveSlotState("builtin");
    setConnectionStatus("idle");
    setConnectionError(null);
    persist("builtin", null, oexEngines, activeOexId);
  }, [oexEngines, activeOexId, persist]);

  const connectEngine = useCallback(async () => {
    if (!externalConfig) return;
    engineRef.current?.disconnect();
    engineRef.current = null;
    setConnectionError(null);
    setConnectionStatus("connecting");

    const eng = new UCIEngine(externalConfig.url);
    engineRef.current = eng;

    try {
      await eng.connect((status, msg) => {
        setConnectionStatus(status);
        if (status === "error" || status === "disconnected") {
          setConnectionError(msg ?? null);
        } else {
          setConnectionError(null);
        }
      });
    } catch (e: any) {
      setConnectionStatus("error");
      setConnectionError(e?.message ?? "Failed to connect");
    }
  }, [externalConfig]);

  const disconnectEngine = useCallback(() => {
    engineRef.current?.disconnect();
    engineRef.current = null;
    setConnectionStatus("idle");
    setConnectionError(null);
  }, []);

  const testConnection = useCallback(async (cfg: ExternalEngineConfig): Promise<boolean> => {
    const probe = new UCIEngine(cfg.url);
    try {
      await probe.connect(() => {});
      probe.disconnect();
      return true;
    } catch {
      return false;
    }
  }, []);

  const value: EngineContextType = {
    activeSlot,
    setActiveSlot,
    oexEngines,
    activeOexId,
    addOexEngine,
    removeOexEngine,
    selectOexEngine,
    externalConfig,
    saveExternalEngine,
    removeExternalEngine,
    connectionStatus,
    connectionError,
    connectEngine,
    disconnectEngine,
    engine: engineRef.current,
    testConnection,
    engineType: activeSlot,
    setEngineType: setActiveSlot,
  };

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEngine must be inside EngineProvider");
  return ctx;
}
