import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { UCIEngine } from "@/utils/uciEngine";
import { OexNativeEngine, nativeOexAvailable } from "@/utils/oexNativeEngine";

export type EngineSlot = "builtin" | "oex";
export type ConnectionStatus = "idle" | "connecting" | "ready" | "error" | "disconnected";

export interface OexEngineEntry {
  id: string;
  name: string;
  packageName: string;
  wsUrl?: string;       // UCI-over-WebSocket bridge URL (ws://...)
  serviceName?: string; // Android service class (auto-detected when empty)
}

type AnyEngine = UCIEngine | OexNativeEngine;

interface EngineContextType {
  activeSlot: EngineSlot;
  setActiveSlot: (s: EngineSlot) => void;
  oexEngines: OexEngineEntry[];
  activeOexId: string | null;
  addOexEngine: (name: string, packageName: string, wsUrl?: string, serviceName?: string) => void;
  updateOexEngine: (id: string, updates: Partial<OexEngineEntry>) => void;
  removeOexEngine: (id: string) => void;
  selectOexEngine: (id: string) => void;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  connectEngine: () => Promise<void>;
  disconnectEngine: () => void;
  engine: AnyEngine | null;
  testConnection: (url: string) => Promise<boolean>;
  /** True when running in a real APK build (native OEX IPC available) */
  nativeOexAvailable: boolean;
  // Legacy aliases
  engineType: EngineSlot;
  setEngineType: (s: EngineSlot) => void;
  externalConfig: null;
}

const EngineContext = createContext<EngineContextType | null>(null);
const STORAGE_KEY = "@chess_engine_config_v4";

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const [activeSlot, setActiveSlotState] = useState<EngineSlot>("builtin");
  const [oexEngines, setOexEngines] = useState<OexEngineEntry[]>([]);
  const [activeOexId, setActiveOexId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const engineRef = useRef<AnyEngine | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.activeSlot === "builtin" || data.activeSlot === "oex") {
          setActiveSlotState(data.activeSlot);
        }
        if (Array.isArray(data.oexEngines)) setOexEngines(data.oexEngines);
        if (data.activeOexId) setActiveOexId(data.activeOexId);
      } catch {}
    });
  }, []);

  const persist = useCallback((
    slot: EngineSlot, oex: OexEngineEntry[], oexId: string | null,
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
  const addOexEngine = useCallback((
    name: string, packageName: string, wsUrl?: string, serviceName?: string,
  ) => {
    const entry: OexEngineEntry = {
      id: Date.now().toString(),
      name: name.trim() || packageName,
      packageName: packageName.trim(),
      wsUrl: wsUrl?.trim() || undefined,
      serviceName: serviceName?.trim() || undefined,
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
    if (activeOexId === id) {
      engineRef.current?.disconnect();
      engineRef.current = null;
      setConnectionStatus("idle");
      setConnectionError(null);
    }
  }, [oexEngines, activeOexId, activeSlot, persist]);

  const selectOexEngine = useCallback((id: string) => {
    engineRef.current?.disconnect();
    engineRef.current = null;
    setConnectionStatus("idle");
    setConnectionError(null);
    setActiveOexId(id);
    persist(activeSlot, oexEngines, id);
  }, [activeSlot, oexEngines, persist]);

  // ── Engine connection ─────────────────────────────────────────────────────
  // Priority: wsUrl → WebSocket bridge;  packageName → native Android IPC
  const connectEngine = useCallback(async () => {
    const activeEntry = oexEngines.find(e => e.id === activeOexId);
    if (!activeEntry) return;

    engineRef.current?.disconnect();
    engineRef.current = null;
    setConnectionError(null);
    setConnectionStatus("connecting");

    const statusCb = (status: ConnectionStatus, msg?: string) => {
      setConnectionStatus(status);
      setConnectionError(status === "error" || status === "disconnected" ? (msg ?? null) : null);
    };

    // ── Path A: WebSocket bridge ──────────────────────────────────────────
    if (activeEntry.wsUrl?.trim()) {
      const eng = new UCIEngine(activeEntry.wsUrl.trim());
      engineRef.current = eng;
      try {
        await eng.connect(statusCb);
      } catch (e: any) {
        setConnectionStatus("error");
        setConnectionError(e?.message ?? "WebSocket connection failed");
      }
      return;
    }

    // ── Path B: Native Android OEX IPC ────────────────────────────────────
    if (activeEntry.packageName && nativeOexAvailable) {
      const eng = new OexNativeEngine(activeEntry.packageName, activeEntry.serviceName ?? "");
      engineRef.current = eng;
      try {
        await eng.connect(statusCb);
      } catch (e: any) {
        setConnectionStatus("error");
        setConnectionError(e?.message ?? "OEX bind failed");
      }
      return;
    }

    // ── Path C: Native not available (Expo Go) ────────────────────────────
    if (activeEntry.packageName && !nativeOexAvailable) {
      setConnectionStatus("error");
      setConnectionError(
        nativeOexAvailable
          ? "Bind failed — is the engine app installed?"
          : "Native OEX IPC requires an APK build. Use the WebSocket bridge in Expo Go."
      );
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
    activeSlot, setActiveSlot,
    oexEngines, activeOexId,
    addOexEngine, updateOexEngine, removeOexEngine, selectOexEngine,
    connectionStatus, connectionError,
    connectEngine, disconnectEngine,
    engine: engineRef.current,
    testConnection,
    nativeOexAvailable,
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
