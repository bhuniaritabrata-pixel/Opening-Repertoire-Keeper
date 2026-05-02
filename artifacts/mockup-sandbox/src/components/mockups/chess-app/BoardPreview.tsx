import { useState } from "react";

const LIGHT = "#f0d9b5";
const DARK = "#b58863";
const BG = "#1a1a2e";
const HEADER = "#16213e";
const CARD = "#0f3460";
const ACCENT = "#e94560";
const TEXT = "#e8e8e8";
const MUTED = "#9a9a9a";
const SELECTED = "rgba(20,85,30,0.55)";
const LEGAL = "rgba(20,85,30,0.35)";
const LASTMOVE = "rgba(255,215,0,0.38)";

type Board = (string | null)[][];

function parseFen(fen: string): Board {
  const pos = fen.split(" ")[0];
  const rows = pos.split("/");
  return rows.map(row => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < parseInt(ch); i++) cells.push(null);
      else cells.push(ch);
    }
    return cells;
  });
}

const PIECE_UNICODE: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

const VARIATIONS = [
  {
    label: "Main Line (Najdorf)",
    moves: [
      { num: "1", w: "e4",   b: "c5"  },
      { num: "2", w: "Nf3",  b: "d6"  },
      { num: "3", w: "d4",   b: "cxd4"},
      { num: "4", w: "Nxd4", b: "Nf6" },
      { num: "5", w: "Nc3",  b: "a6"  },
    ],
    fen: "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6",
    lastFrom: "b8", lastTo: "c6",
  },
  {
    label: "Dragon Variation",
    moves: [
      { num: "1", w: "e4",   b: "c5"  },
      { num: "2", w: "Nf3",  b: "d6"  },
      { num: "3", w: "d4",   b: "cxd4"},
      { num: "4", w: "Nxd4", b: "Nf6" },
      { num: "5", w: "Nc3",  b: "g6"  },
    ],
    fen: "rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6",
    lastFrom: "f7", lastTo: "g6",
  },
  {
    label: "Classical Variation",
    moves: [
      { num: "1", w: "e4",   b: "c5"  },
      { num: "2", w: "Nf3",  b: "Nc6" },
      { num: "3", w: "d4",   b: "cxd4"},
      { num: "4", w: "Nxd4", b: "Nf6" },
      { num: "5", w: "Nc3",  b: "d6"  },
    ],
    fen: "r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6",
    lastFrom: "d7", lastTo: "d6",
  },
];

function ChessBoard({ fen, lastFrom, lastTo }: { fen: string; lastFrom: string; lastTo: string }) {
  const board = parseFen(fen);
  const sqSize = 40;

  function sqName(r: number, c: number) {
    return String.fromCharCode("a".charCodeAt(0) + c) + (8 - r);
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", border: "2px solid #2d3748", borderRadius: 4, overflow: "hidden" }}>
      {board.map((row, r) => (
        <div key={r} style={{ display: "flex" }}>
          {row.map((piece, c) => {
            const light = (r + c) % 2 === 0;
            const sq = sqName(r, c);
            const isLast = sq === lastFrom || sq === lastTo;
            return (
              <div
                key={c}
                style={{
                  width: sqSize,
                  height: sqSize,
                  background: light ? LIGHT : DARK,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  fontSize: 26,
                  userSelect: "none",
                }}
              >
                {isLast && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: LASTMOVE,
                  }} />
                )}
                {r === 7 && (
                  <span style={{
                    position: "absolute", bottom: 1, right: 2,
                    fontSize: 8, fontWeight: 700, color: light ? DARK : LIGHT, zIndex: 1,
                  }}>
                    {String.fromCharCode("a".charCodeAt(0) + c)}
                  </span>
                )}
                {c === 0 && (
                  <span style={{
                    position: "absolute", top: 1, left: 2,
                    fontSize: 8, fontWeight: 700, color: light ? DARK : LIGHT, zIndex: 1,
                  }}>
                    {8 - r}
                  </span>
                )}
                {piece && (
                  <span style={{ position: "relative", zIndex: 2, lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    {PIECE_UNICODE[piece] ?? piece}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MoveList({ moves, activeIdx, onSelect }: {
  moves: { num: string; w: string; b?: string }[];
  activeIdx: number;
  onSelect: (i: number, side: "w" | "b") => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: "8px 10px" }}>
      {moves.map((m, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 1 }}>
          <span style={{ color: MUTED, fontSize: 12, marginRight: 2 }}>{m.num}.</span>
          <button
            onClick={() => onSelect(i, "w")}
            style={{
              background: activeIdx === i * 2 ? ACCENT : "transparent",
              color: activeIdx === i * 2 ? "#fff" : TEXT,
              border: "none", borderRadius: 3, padding: "2px 5px",
              fontSize: 13, cursor: "pointer", fontWeight: activeIdx === i * 2 ? 700 : 400,
            }}
          >{m.w}</button>
          {m.b && (
            <button
              onClick={() => onSelect(i, "b")}
              style={{
                background: activeIdx === i * 2 + 1 ? ACCENT : "transparent",
                color: activeIdx === i * 2 + 1 ? "#fff" : TEXT,
                border: "none", borderRadius: 3, padding: "2px 5px",
                fontSize: 13, cursor: "pointer", fontWeight: activeIdx === i * 2 + 1 ? 700 : 400,
              }}
            >{m.b}</button>
          )}
        </span>
      ))}
    </div>
  );
}

export function BoardPreview() {
  const [varIdx, setVarIdx] = useState(0);
  const v = VARIATIONS[varIdx];

  return (
    <div style={{
      minHeight: "100vh",
      background: BG,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        width: 360,
        background: BG,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
        border: "1px solid #2d3748",
      }}>

        {/* Status bar */}
        <div style={{ background: HEADER, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#888", fontSize: 11 }}>9:41</span>
          <span style={{ color: "#888", fontSize: 11 }}>●●● 100%</span>
        </div>

        {/* Header */}
        <div style={{ background: HEADER, padding: "10px 16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: "#2d3748", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: TEXT, fontSize: 16 }}>←</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>Sicilian Defence</div>
            <div style={{ color: MUTED, fontSize: 11 }}>Playing as White</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: "#2d3748", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: TEXT, fontSize: 13 }}>🔒</span>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: "#2d3748", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: TEXT, fontSize: 13 }}>⚙</span>
            </div>
          </div>
        </div>

        {/* Board */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px", background: "#111827" }}>
          <ChessBoard fen={v.fen} lastFrom={v.lastFrom} lastTo={v.lastTo} />
        </div>

        {/* Controls */}
        <div style={{ background: "#111827", display: "flex", justifyContent: "center", gap: 16, padding: "8px 0 10px" }}>
          {["⟪", "◀", "▶", "⟫"].map((icon, i) => (
            <button key={i} style={{
              width: 38, height: 38, borderRadius: 19,
              background: "#1f2937", border: "1px solid #374151",
              color: TEXT, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{icon}</button>
          ))}
          <button style={{
            width: 38, height: 38, borderRadius: 19,
            background: "#1f2937", border: "1px solid #374151",
            color: TEXT, fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>⇄</button>
        </div>

        {/* Variation tabs */}
        <div style={{ background: HEADER, borderTop: "1px solid #2d3748" }}>
          <div style={{ display: "flex", gap: 0, overflowX: "auto", padding: "0 8px" }}>
            {VARIATIONS.map((v2, i) => (
              <button
                key={i}
                onClick={() => setVarIdx(i)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: varIdx === i ? `2px solid ${ACCENT}` : "2px solid transparent",
                  color: varIdx === i ? TEXT : MUTED,
                  fontSize: 11,
                  fontWeight: varIdx === i ? 700 : 400,
                  padding: "8px 10px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {i === 0 ? "Najdorf" : i === 1 ? "Dragon" : "Classical"}
              </button>
            ))}
          </div>
        </div>

        {/* Move tree */}
        <div style={{ background: "#0d1117", minHeight: 80 }}>
          <MoveList moves={v.moves} activeIdx={v.moves.length * 2 - 1} onSelect={() => {}} />
        </div>

        {/* Variation branch indicator */}
        <div style={{ background: "#0d1117", padding: "4px 10px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {varIdx === 0 && (
            <>
              <span style={{ background: "#1f2937", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: MUTED }}>
                6.Bg5 (Richter-Rauzer)
              </span>
              <span style={{ background: "#1f2937", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: MUTED }}>
                6.Be3 (English Attack)
              </span>
            </>
          )}
          {varIdx === 1 && (
            <>
              <span style={{ background: "#1f2937", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: MUTED }}>
                6.Be3 (Yugoslav)
              </span>
              <span style={{ background: "#1f2937", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: MUTED }}>
                6.f4 (Levenfish)
              </span>
            </>
          )}
          {varIdx === 2 && (
            <>
              <span style={{ background: "#1f2937", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: MUTED }}>
                6.Bg5 (Sozin)
              </span>
            </>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{
          background: HEADER,
          borderTop: "1px solid #2d3748",
          display: "flex",
          justifyContent: "space-around",
          padding: "10px 0 14px",
        }}>
          {[["🏠", "Home"], ["♟", "Board"], ["📊", "Stats"]].map(([icon, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 9, color: label === "Board" ? ACCENT : MUTED }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
