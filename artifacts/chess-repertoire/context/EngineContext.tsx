import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { UCIEngine } from "@/utils/uciEngine";

export type EngineType = "builtin" | "external";
export type ConnectionStatus = "idle" | "connecting" | "ready" | "error" | "disconnected";

export interface ExternalEngineConfig {
  name: string;
  url: string;
}

interface EngineContextType {
  engineType: EngineType;
  setEngineType: (t: EngineType) => void;
  externalConfig: ExternalEngineConfig | null;
  saveExternalEngine: (cfg: ExternalEngineConfig) => Promise<void>;
  removeExternalEngine: () => void;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  connectEngine: () => Promise<void>;
  disconnectEngine: () => void;
  engine: UCIEngine | null;
  testConnection: (cfg: ExternalEngineConfig) => Promise<boolean>;
}

const EngineContext = createContext<EngineContextType | null>(null);

const STORAGE_KEY = "@chess_engine_config";

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const [engineType, setEngineTypeState] = useState<EngineType>("builtin");
  const [externalConfig, setExternalConfig] = useState<ExternalEngineConfig | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const engineRef = useRef<UCIEngine | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        if (data.externalConfig) setExternalConfig(data.externalConfig);
        if (data.engineType) setEngineTypeState(data.engineType);
      } catch {}
    });
  }, []);

  const persist = useCallback((type: EngineType, cfg: ExternalEngineConfig | null) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ engineType: type, externalConfig: cfg }));
  }, []);

  const setEngineType = useCallback((t: EngineType) => {
    setEngineTypeState(t);
    persist(t, externalConfig);
    if (t === "builtin") {
      engineRef.current?.disconnect();
      engineRef.current = null;
      setConnectionStatus("idle");
      setConnectionError(null);
    }
  }, [externalConfig, persist]);

  const saveExternalEngine = useCallback(async (cfg: ExternalEngineConfig) => {
    setExternalConfig(cfg);
    persist("external", cfg);
  }, [persist]);

  const removeExternalEngine = useCallback(() => {
    engineRef.current?.disconnect();
    engineRef.current = null;
    setExternalConfig(null);
    setEngineTypeState("builtin");
    setConnectionStatus("idle");
    setConnectionError(null);
    persist("builtin", null);
  }, [persist]);

  const connectEngine = useCallback(async () => {
    if (!externalConfig) return;
    engineRef.current?.disconnect();
    engineRef.current = null;
    setConnectionError(null);

    const engine = new UCIEngine(externalConfig.url);
    engineRef.current = engine;

    try {
      await engine.connect((status, msg) => {
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

  return (
    <EngineContext.Provider value={{
      engineType, setEngineType,
      externalConfig, saveExternalEngine, removeExternalEngine,
      connectionStatus, connectionError,
      connectEngine, disconnectEngine,
      engine: engineRef.current,
      testConnection,
    }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEngine must be inside EngineProvider");
  return ctx;
}
