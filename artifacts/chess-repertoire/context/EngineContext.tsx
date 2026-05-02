import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { UCIEngine } from "@/utils/uciEngine";

export type EngineSlot = "builtin" | "oex";
export type ConnectionStatus = "idle" | "connecting" | "ready" | "error" | "disconnected";

export interface OexEngineEntry {
  id: string;
  name: string;
  packageName: string;
  wsUrl?: string; // Optional UCI-over-WebSocket bridge URL, e.g. ws://192.168.1.5:3004
}

interface EngineContextType {
  activeSlot: EngineSlot;
  setActiveSlot: (s: EngineSlot) => void;
  oexEngines: OexEngineEntry[];
  activeOexId: string | null;
  addOexEngine: (name: string, packageName: string, wsUrl?: string) => void;
  updateOexEngine: (id: string, updates: Partial<OexEngineEntry>) => void;
  removeOexEngine: (id: string) => void;
  selectOexEngine: (id: string) => void;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  connectEngine: () => Promise<void>;
  disconnectEngine: () => void;
  engine: UCIEngine | null;
  testConnection: (url: string) => Promise<boolean>;
  // Legacy aliases so AnalysisPanel keeps working
  engineType: EngineSlot;
  setEngineType: (s: EngineSlot) => void;
  externalConfig: null; // kept for API compatibility
}

const EngineContext = createContext<EngineContextType | null>(null);
const STORAGE_KEY = "@chess_engine_config_v4";

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const [activeSlot, setActiveSlotState] = useState<EngineSlot>("builtin");
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
        if (data.activeSlot && (data.activeSlot === "builtin" || data.activeSlot === "oex")) {
          setActiveSlotState(data.activeSlot);
        }
        if (Array.isArray(data.oexEngines)) setOexEngines(data.oexEngines);
        if (data.activeOexId) setActiveOexId(data.activeOexId);
      } catch {}
    });
  }, []);

  const persist = useCallback((
    slot: EngineSlot,
    oex: OexEngineEntry[],
    oexId: string | null,
  ) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ activeSlot: slot, oexEngines: oex, activeOexId: oexId }));
  }, []);

  const setActiveSlot = useCallback((s: EngineSlot) => {
    setActiveSlotState(s);
    persist(s, oexEngines, activeOexId);
    if (s === "builtin") {
      engineRef.current?.disconnect();
      engineRef.current = null;
      setConnectionStatus("idle");
      setConnectionError(null);
    }
  }, [oexEngines, activeOexId, persist]);

  // ── OEX management ────────────────────────────────────────────────────────
  const addOexEngine = useCallback((name: string, packageName: string, wsUrl?: string) => {
    const entry: OexEngineEntry = {
      id: Date.now().toString(),
      name: name.trim() || packageName,
      packageName: packageName.trim(),
      wsUrl: wsUrl?.trim() || undefined,
    };
    const next = [...oexEngines, entry];
    const newActiveId = oexEngines.length === 0 ? entry.id : activeOexId;
    setOexEngines(next);
    setActiveOexId(newActiveId);
    persist(activeSlot, next, newActiveId);
  }, [oexEngines, activeOexId, activeSlot, persist]);

  const updateOexEngine = useCallback((id: string, updates: Partial<OexEngineEntry>) => {
    const next = oexEngines.map(e => e.id === id ? { ...e, ...updates } : e);
    setOexEngines(next);
    persist(activeSlot, next, activeOexId);
  }, [oexEngines, activeOexId, activeSlot, persist]);

  const removeOexEngine = useCallback((id: string) => {
    const next = oexEngines.filter(e => e.id !== id);
    const newActiveId = activeOexId === id
      ? (next.length > 0 ? next[0].id : null)
      : activeOexId;
    setOexEngines(next);
    setActiveOexId(newActiveId);
    if (next.length === 0 && activeSlot === "oex") {
      setActiveSlotState("builtin");
      persist("builtin", next, null);
    } else {
      persist(activeSlot, next, newActiveId);
    }
    // Disconnect if removed engine was the connected one
    if (activeOexId === id) {
      engineRef.current?.disconnect();
      engineRef.current = null;
      setConnectionStatus("idle");
      setConnectionError(null);
    }
  }, [oexEngines, activeOexId, activeSlot, persist]);

  const selectOexEngine = useCallback((id: string) => {
    // Disconnect from previous before switching
    engineRef.current?.disconnect();
    engineRef.current = null;
    setConnectionStatus("idle");
    setConnectionError(null);
    setActiveOexId(id);
    persist(activeSlot, oexEngines, id);
  }, [activeSlot, oexEngines, persist]);

  // ── WebSocket connection (used when OEX entry has a wsUrl) ─────────────────
  const connectEngine = useCallback(async () => {
    const activeEntry = oexEngines.find(e => e.id === activeOexId);
    const wsUrl = activeEntry?.wsUrl?.trim();
    if (!wsUrl) return;

    engineRef.current?.disconnect();
    engineRef.current = null;
    setConnectionError(null);
    setConnectionStatus("connecting");

    const eng = new UCIEngine(wsUrl);
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
  }, [oexEngines, activeOexId]);

  const disconnectEngine = useCallback(() => {
    engineRef.current?.disconnect();
    engineRef.current = null;
    setConnectionStatus("idle");
    setConnectionError(null);
  }, []);

  const testConnection = useCallback(async (url: string): Promise<boolean> => {
    const probe = new UCIEngine(url);
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
    updateOexEngine,
    removeOexEngine,
    selectOexEngine,
    connectionStatus,
    connectionError,
    connectEngine,
    disconnectEngine,
    engine: engineRef.current,
    testConnection,
    engineType: activeSlot,
    setEngineType: setActiveSlot,
    externalConfig: null,
  };

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEngine must be inside EngineProvider");
  return ctx;
}
