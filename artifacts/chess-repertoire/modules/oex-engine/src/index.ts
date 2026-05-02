import { EventEmitter, requireNativeModule } from "expo-modules-core";

const OexEngineNative = requireNativeModule("OexEngine");

// EventEmitter generic expects function signatures
const emitter = new EventEmitter<{
  onEngineOutput: (e: EngineOutputEvent) => void;
  onConnected: (e: EngineConnectedEvent) => void;
  onDisconnected: (e: EngineConnectedEvent) => void;
  onError: (e: EngineErrorEvent) => void;
}>(OexEngineNative);

export interface InstalledEngine {
  packageName: string;
  name: string;
  serviceName: string;
  action: string;
}

export interface EngineOutputEvent {
  line: string;
}

export interface EngineConnectedEvent {
  packageName: string;
}

export interface EngineErrorEvent {
  message: string;
}

/** Scans for installed OEX-compatible engine apps (Android only, returns [] on iOS). */
export function getInstalledEngines(): Promise<InstalledEngine[]> {
  return OexEngineNative.getInstalledEngines();
}

/**
 * Binds to an OEX engine service.
 * @param packageName  e.g. "com.calc.stockfish"
 * @param serviceName  fully-qualified service class, or "" to auto-detect
 */
export function connect(packageName: string, serviceName = ""): Promise<void> {
  return OexEngineNative.connect(packageName, serviceName);
}

/** Sends a raw UCI command string to the bound engine. */
export function sendCommand(command: string): void {
  OexEngineNative.sendCommand(command);
}

/** Unbinds from the engine and releases all resources. */
export function disconnect(): void {
  OexEngineNative.disconnect();
}

/** Returns true when the engine service is bound. */
export function isConnected(): boolean {
  return OexEngineNative.isConnected();
}

export function addOutputListener(listener: (e: EngineOutputEvent) => void) {
  return emitter.addListener("onEngineOutput", listener);
}

export function addConnectedListener(listener: (e: EngineConnectedEvent) => void) {
  return emitter.addListener("onConnected", listener);
}

export function addDisconnectedListener(listener: (e: EngineConnectedEvent) => void) {
  return emitter.addListener("onDisconnected", listener);
}

export function addErrorListener(listener: (e: EngineErrorEvent) => void) {
  return emitter.addListener("onError", listener);
}
