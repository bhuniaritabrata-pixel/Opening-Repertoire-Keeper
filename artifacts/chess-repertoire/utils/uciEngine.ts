export type EngineAnalysis = {
  depth: number;
  score: number | null;       // centipawns, white-relative
  mate: number | null;        // moves to mate (+ = white wins)
  pv: string[];               // principal variation (UCI move notation)
  bestMove: string | null;
};

type AnalysisCallback = (result: EngineAnalysis) => void;
type StatusCallback = (status: "connecting" | "ready" | "error" | "disconnected", msg?: string) => void;

export class UCIEngine {
  private ws: WebSocket | null = null;
  private url: string;
  private ready = false;
  private uciOk = false;
  private onAnalysis: AnalysisCallback | null = null;
  private onStatus: StatusCallback | null = null;
  private pendingAnalysis: EngineAnalysis = { depth: 0, score: null, mate: null, pv: [], bestMove: null };
  private stopped = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(onStatus: StatusCallback): Promise<void> {
    this.onStatus = onStatus;
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        onStatus("error", "Invalid URL");
        reject(e);
        return;
      }

      onStatus("connecting");

      const timeout = setTimeout(() => {
        reject(new Error("Connection timed out"));
        onStatus("error", "Connection timed out");
        this.ws?.close();
      }, 8000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.send("uci");
      };

      this.ws.onmessage = (e) => {
        const lines: string[] = String(e.data).split("\n");
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;

          if (line === "uciok") {
            this.uciOk = true;
            this.send("isready");
          }

          if (line === "readyok") {
            this.ready = true;
            onStatus("ready");
            resolve();
          }

          if (line.startsWith("info")) {
            this.parseInfo(line);
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
      };

      this.ws.onerror = () => {
        clearTimeout(timeout);
        onStatus("error", "Cannot connect — check URL & engine server");
        reject(new Error("WebSocket error"));
      };

      this.ws.onclose = () => {
        this.ready = false;
        if (!this.stopped) onStatus("disconnected");
      };
    });
  }

  private parseInfo(line: string) {
    const tokens = line.split(" ");
    let depth = 0, score: number | null = null, mate: number | null = null;
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
    if (!this.ready || !this.ws) return;
    this.pendingAnalysis = { depth: 0, score: null, mate: null, pv: [], bestMove: null };
    this.onAnalysis = onResult;
    this.send("stop");
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
  }

  stop() {
    this.send("stop");
  }

  disconnect() {
    this.stopped = true;
    this.ready = false;
    this.send("quit");
    this.ws?.close();
    this.ws = null;
  }

  isReady() {
    return this.ready;
  }

  private send(cmd: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(cmd + "\n");
    }
  }
}
