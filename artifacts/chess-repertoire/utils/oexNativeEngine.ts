/**
 * OexNativeEngine — wraps the native OEX Android IPC module in exactly the
 * same interface as UCIEngine (WebSocket), so EngineContext can swap between
 * them transparently.
 *
 * On iOS (or in Expo Go) connect() rejects immediately; callers should fall
 * back to the built-in JS engine.
 */
// Subscription type inferred from the module's addListener return value
type Subscription = { remove: () => void };

// Guard: native module only exists in a real APK build, not in Expo Go
let OexModule: typeof import("oex-engine") | null = null;
let nativeOexAvailable = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  OexModule = require("oex-engine") as typeof import("oex-engine");
  nativeOexAvailable = true;
} catch {}

export { nativeOexAvailable };

export type EngineAnalysis = {
  depth: number;
  score: number | null;
  mate: number | null;
  pv: string[];
  bestMove: string | null;
};

type AnalysisCallback = (result: EngineAnalysis) => void;
type StatusCallback = (
  status: "connecting" | "ready" | "error" | "disconnected",
  msg?: string
) => void;

export class OexNativeEngine {
  private packageName: string;
  private serviceName: string;

  private ready = false;
  private uciOk = false;
  private onStatus: StatusCallback | null = null;
  private onAnalysis: AnalysisCallback | null = null;
  private pendingAnalysis: EngineAnalysis = {
    depth: 0, score: null, mate: null, pv: [], bestMove: null,
  };

  private subs: Subscription[] = [];

  constructor(packageName: string, serviceName = "") {
    this.packageName = packageName;
    this.serviceName = serviceName;
  }

  async connect(onStatus: StatusCallback): Promise<void> {
    this.onStatus = onStatus;
    onStatus("connecting");

    if (!OexModule) {
      onStatus("error", "Native OEX module not available — requires APK build");
      throw new Error("Native OEX module not available");
    }
    const mod = OexModule;

    // Wire up event listeners before binding
    this.subs.push(
      mod.addOutputListener(({ line }) => this.handleLine(line))
    );
    this.subs.push(
      mod.addConnectedListener(() => {
        // Service is bound — start the UCI handshake
        this.sendRaw("uci");
      })
    );
    this.subs.push(
      mod.addDisconnectedListener(() => {
        this.ready = false;
        onStatus("disconnected");
      })
    );
    this.subs.push(
      mod.addErrorListener(({ message }) => {
        this.ready = false;
        onStatus("error", message);
      })
    );

    // Kick off the Android service binding
    return new Promise<void>((resolve, reject) => {
      const origStatus = onStatus;
      this.onStatus = (status, msg) => {
        origStatus(status, msg);
        if (status === "ready") resolve();
        if (status === "error") reject(new Error(msg ?? "Connection failed"));
      };

      mod.connect(this.packageName, this.serviceName).catch((e: Error) => {
        onStatus("error", e.message ?? "Bind failed");
        reject(e);
      });

      setTimeout(() => {
        if (!this.ready) {
          onStatus("error", "Engine did not respond to UCI handshake within 10 s");
          reject(new Error("UCI handshake timeout"));
        }
      }, 10_000);
    });
  }

  private handleLine(line: string) {
    if (line === "uciok") {
      this.uciOk = true;
      this.sendRaw("isready");
      return;
    }

    if (line === "readyok") {
      this.ready = true;
      this.onStatus?.("ready");
      return;
    }

    if (line.startsWith("info")) {
      this.parseInfo(line);
      return;
    }

    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      const bm = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
      this.pendingAnalysis.bestMove = bm;
      if (this.onAnalysis) {
        this.onAnalysis({ ...this.pendingAnalysis });
        this.onAnalysis = null;
      }
    }
  }

  private parseInfo(line: string) {
    const tokens = line.split(" ");
    let depth = 0;
    let score: number | null = null;
    let mate: number | null = null;
    const pv: string[] = [];
    let inPv = false;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === "depth") depth = parseInt(tokens[i + 1]) || 0;
      if (tokens[i] === "score") {
        if (tokens[i + 1] === "cp") {
          score = parseInt(tokens[i + 2]) ?? null;
          mate = null;
        } else if (tokens[i + 1] === "mate") {
          mate = parseInt(tokens[i + 2]) ?? null;
          score = null;
        }
      }
      if (tokens[i] === "pv") inPv = true;
      else if (inPv) pv.push(tokens[i]);
    }

    if (depth > (this.pendingAnalysis.depth ?? 0)) {
      this.pendingAnalysis = { depth, score, mate, pv, bestMove: null };
    }
  }

  analyze(fen: string, depth: number, onResult: AnalysisCallback): void {
    if (!this.ready) return;
    this.pendingAnalysis = { depth: 0, score: null, mate: null, pv: [], bestMove: null };
    this.onAnalysis = onResult;
    this.sendRaw("stop");
    this.sendRaw(`position fen ${fen}`);
    this.sendRaw(`go depth ${depth}`);
  }

  stop() {
    this.sendRaw("stop");
  }

  disconnect() {
    this.sendRaw("quit");
    OexModule?.disconnect();
    this.ready = false;
    this.uciOk = false;
    this.onAnalysis = null;
    for (const sub of this.subs) sub.remove();
    this.subs = [];
  }

  isReady() {
    return this.ready;
  }

  private sendRaw(cmd: string) {
    try {
      OexModule?.sendCommand(cmd);
    } catch (_) {}
  }
}
