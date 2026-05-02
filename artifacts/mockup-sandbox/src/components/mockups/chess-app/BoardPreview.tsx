const LIGHT = "#f0d9b5";
const DARK = "#b58863";
const BG = "#1a1a2e";
const HEADER = "#16213e";
const ACCENT = "#e94560";
const TEXT = "#e8e8e8";
const MUTED = "#9a9a9a";
const LASTMOVE = "rgba(255,215,0,0.38)";
const PRIMARY = "#6366f1";

type Board = (string | null)[][];

function parseFen(fen: string): Board {
  const pos = fen.split(" ")[0];
  return pos.split("/").map(row => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < parseInt(ch); i++) cells.push(null);
      else cells.push(ch);
    }
    return cells;
  });
}

const UNICODE: Record<string, string> = {
  K:"♔", Q:"♕", R:"♖", B:"♗", N:"♘", P:"♙",
  k:"♚", q:"♛", r:"♜", b:"♝", n:"♞", p:"♟",
};

function ChessBoard({ fen, lastFrom, lastTo }: { fen: string; lastFrom: string; lastTo: string }) {
  const board = parseFen(fen);
  const sqSize = 38;
  const sqName = (r: number, c: number) =>
    String.fromCharCode("a".charCodeAt(0) + c) + (8 - r);

  return (
    <div style={{ display:"inline-flex", flexDirection:"column", border:"2px solid #2d3748", borderRadius:4, overflow:"hidden" }}>
      {board.map((row, r) => (
        <div key={r} style={{ display:"flex" }}>
          {row.map((piece, c) => {
            const light = (r + c) % 2 === 0;
            const sq = sqName(r, c);
            const isLast = sq === lastFrom || sq === lastTo;
            return (
              <div key={c} style={{
                width: sqSize, height: sqSize,
                background: light ? LIGHT : DARK,
                display:"flex", alignItems:"center", justifyContent:"center",
                position:"relative", fontSize: 24, userSelect:"none",
              }}>
                {isLast && <div style={{ position:"absolute", inset:0, background:LASTMOVE }} />}
                {r === 7 && <span style={{ position:"absolute", bottom:1, right:2, fontSize:7, fontWeight:700, color: light ? DARK : LIGHT, zIndex:1 }}>{String.fromCharCode("a".charCodeAt(0)+c)}</span>}
                {c === 0 && <span style={{ position:"absolute", top:1, left:2, fontSize:7, fontWeight:700, color: light ? DARK : LIGHT, zIndex:1 }}>{8-r}</span>}
                {piece && <span style={{ position:"relative", zIndex:2, lineHeight:1 }}>{UNICODE[piece] ?? piece}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Inline move token component
function MoveToken({ san, num, numSuffix, isActive, isVariation }: {
  san: string; num?: string; numSuffix?: string; isActive?: boolean; isVariation?: boolean;
}) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:1 }}>
      {num && (
        <span style={{ color: MUTED, fontSize: 12, fontWeight: 600 }}>
          {num}{numSuffix ?? ""}
        </span>
      )}
      <span style={{
        padding: "1px 5px", borderRadius: 3,
        background: isActive ? PRIMARY + "44" : "transparent",
        color: isActive ? "#a5b4fc" : isVariation ? MUTED : TEXT,
        fontStyle: isVariation ? "italic" : "normal",
        fontSize: isVariation ? 12 : 13,
        fontWeight: isActive ? 700 : 500,
        cursor: "pointer",
      }}>
        {san}
      </span>
    </span>
  );
}

function Paren({ children, open }: { children?: React.ReactNode; open: boolean }) {
  return <span style={{ color: MUTED, fontSize: 13, fontWeight: 600 }}>{open ? " (" : ")"}</span>;
}

export function BoardPreview() {
  // Position after 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 (Najdorf)
  // with variations from move 2 and move 5
  const fen = "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6";

  return (
    <div style={{
      minHeight:"100vh", background: BG,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        width: 360, background: BG, borderRadius: 16,
        overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.7)",
        border:"1px solid #2d3748",
      }}>

        {/* Status bar */}
        <div style={{ background:HEADER, padding:"8px 16px", display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"#888", fontSize:11 }}>9:41</span>
          <span style={{ color:"#888", fontSize:11 }}>●●● 100%</span>
        </div>

        {/* Header */}
        <div style={{ background:HEADER, padding:"8px 14px 10px", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:14, background:"#2d3748", display:"flex", alignItems:"center", justifyContent:"center", color:TEXT, fontSize:14 }}>←</div>
          <div style={{ flex:1 }}>
            <div style={{ color:TEXT, fontWeight:700, fontSize:14 }}>Sicilian — Najdorf</div>
            <div style={{ color:MUTED, fontSize:11 }}>Playing as White</div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <div style={{ width:26, height:26, borderRadius:13, background:"#2d3748", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>🔒</div>
            <div style={{ width:26, height:26, borderRadius:13, background:"#2d3748", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>⚙</div>
          </div>
        </div>

        {/* Board */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 6px", background:"#111827" }}>
          <ChessBoard fen={fen} lastFrom="b8" lastTo="a6" />
        </div>

        {/* Controls */}
        <div style={{ background:"#111827", display:"flex", justifyContent:"center", gap:12, padding:"6px 0 10px" }}>
          {["⟪","◀","▶","⟫","⇄"].map((ic, i) => (
            <div key={i} style={{
              width:34, height:34, borderRadius:17,
              background:"#1f2937", border:"1px solid #374151",
              color:TEXT, fontSize:13, display:"flex",
              alignItems:"center", justifyContent:"center", cursor:"pointer",
            }}>{ic}</div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ background:HEADER, borderTop:"1px solid #2d3748", display:"flex", padding:"0 10px" }}>
          {["Moves","Analysis"].map((t, i) => (
            <div key={t} style={{
              padding:"8px 12px", fontSize:12, fontWeight: i===0?700:400,
              color: i===0 ? TEXT : MUTED,
              borderBottom: i===0 ? `2px solid ${ACCENT}` : "2px solid transparent",
              cursor:"pointer",
            }}>{t}</div>
          ))}
        </div>

        {/* ── Move tree panel ─────────────────────────────────────── */}
        <div style={{
          background:"#0d1117", padding:"10px 12px 12px",
          lineHeight: "1.9", display:"flex", flexWrap:"wrap",
          alignItems:"center", gap:"0px 0px",
          minHeight: 90,
        }}>
          {/* 1. e4 c5 */}
          <MoveToken num="1." san="e4" />
          <MoveToken san="c5" />
          {/* 2. Nf3  (2.d4 d5 3.Nc3 Nf6)  2...d6 */}
          <MoveToken num=" 2." san="Nf3" />
          <Paren open={true} />
          <MoveToken num="2." san="d4" isVariation />
          <MoveToken san="d5" isVariation />
          <MoveToken num=" 3." san="Nc3" isVariation />
          <MoveToken san="Nf6" isVariation />
          <Paren open={false} />
          <MoveToken num=" 2…" san="d6" />
          {/* 3. d4 cxd4 */}
          <MoveToken num=" 3." san="d4" />
          <MoveToken san="cxd4" />
          {/* 4. Nxd4 Nf6 */}
          <MoveToken num=" 4." san="Nxd4" />
          <MoveToken san="Nf6" />
          {/* 5. Nc3  (5.f4 g6 6.Nf3)  5...a6  (5...g6 6.Be3)  */}
          <MoveToken num=" 5." san="Nc3" />
          <Paren open={true} />
          <MoveToken num="5." san="f4" isVariation />
          <MoveToken san="g6" isVariation />
          <MoveToken num=" 6." san="Nf3" isVariation />
          <Paren open={false} />
          <MoveToken num=" 5…" san="a6" isActive />
          <Paren open={true} />
          <MoveToken num="5…" san="g6" isVariation />
          <MoveToken num=" 6." san="Be3" isVariation />
          <MoveToken san="Bg7" isVariation />
          <Paren open={false} />
        </div>

        {/* Bottom nav */}
        <div style={{
          background:HEADER, borderTop:"1px solid #2d3748",
          display:"flex", justifyContent:"space-around", padding:"10px 0 14px",
        }}>
          {[["🏠","Home"],["♟","Board"],["📊","Stats"]].map(([icon, label]) => (
            <div key={String(label)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:17 }}>{icon}</span>
              <span style={{ fontSize:9, color: label==="Board" ? ACCENT : MUTED }}>{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
