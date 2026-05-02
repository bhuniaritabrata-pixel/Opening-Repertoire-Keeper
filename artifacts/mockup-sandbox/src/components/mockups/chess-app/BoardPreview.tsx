const LIGHT = "#f0d9b5";
const DARK = "#b58863";
const BG = "#1a1a2e";
const HEADER = "#16213e";
const ACCENT = "#e94560";
const TEXT = "#e8e8e8";
const MUTED = "#9a9a9a";
const LASTMOVE = "rgba(255,215,0,0.38)";
const PRIMARY = "#6366f1";

const ANN_COLORS: Record<string, string> = {
  brilliant:   "#00bcd4",
  great:       "#4caf50",
  good:        "#8bc34a",
  best:        "#2196f3",
  second_best: "#7c3aed",
  book:        "#7c4a03",
  inaccuracy:  "#ff9800",
  mistake:     "#ff5722",
  blunder:     "#f44336",
};
const ANN_SYMBOLS: Record<string, string> = {
  brilliant: "!!", great: "!", good: "✓", best: "★",
  second_best: "✦", book: "B", inaccuracy: "!?", mistake: "?", blunder: "??",
};

type Board = (string | null)[][];

function parseFen(fen: string): Board {
  return fen.split(" ")[0].split("/").map(row => {
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

// After 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 – waiting for Black's move
// Annotations on candidate responses: Nf6=best, a6=great, e6=good, g6=second_best, d5=inaccuracy
const ANNOTATIONS: Record<string, { ann: string; from: string }> = {
  f6: { ann: "best",        from: "g8" },
  a6: { ann: "great",       from: "a7" },
  e6: { ann: "good",        from: "e7" },
  g6: { ann: "second_best", from: "g7" },
  d5: { ann: "inaccuracy",  from: "d7" },
};

// Position after 4.Nxd4 (Black to move)
const FEN = "rnbqkb1r/pp2pppp/3p4/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 0 4";

function ChessBoard({ showAnn }: { showAnn: boolean }) {
  const board = parseFen(FEN);
  const sqSize = 38;
  const sqName = (r: number, c: number) =>
    String.fromCharCode("a".charCodeAt(0) + c) + (8 - r);

  return (
    <div style={{ display:"inline-flex", flexDirection:"column", border:"2px solid #2d3748", borderRadius:4, overflow:"hidden", position:"relative" }}>
      {board.map((row, r) => (
        <div key={r} style={{ display:"flex" }}>
          {row.map((piece, c) => {
            const light = (r + c) % 2 === 0;
            const sq = sqName(r, c);
            const annInfo = showAnn ? ANNOTATIONS[sq] : undefined;
            const isFrom = showAnn && Object.values(ANNOTATIONS).some(a => a.from === sq);
            const fromEntry = showAnn ? Object.values(ANNOTATIONS).find(a => a.from === sq) : undefined;
            const annColor = annInfo ? ANN_COLORS[annInfo.ann] : fromEntry ? ANN_COLORS[fromEntry.ann] : undefined;

            return (
              <div key={c} style={{
                width: sqSize, height: sqSize,
                background: light ? LIGHT : DARK,
                display:"flex", alignItems:"center", justifyContent:"center",
                position:"relative", fontSize: 24, userSelect:"none",
              }}>
                {/* Destination tint */}
                {annInfo && annColor && (
                  <div style={{ position:"absolute", inset:0, background: annColor + "55", zIndex:1 }} />
                )}
                {/* Source tint */}
                {isFrom && !annInfo && annColor && (
                  <div style={{ position:"absolute", inset:0, background: annColor + "28", zIndex:1 }} />
                )}
                {/* Coord labels */}
                {r === 7 && <span style={{ position:"absolute", bottom:1, right:2, fontSize:7, fontWeight:700, color: light ? DARK : LIGHT, zIndex:3 }}>{String.fromCharCode("a".charCodeAt(0)+c)}</span>}
                {c === 0 && <span style={{ position:"absolute", top:1, left:2, fontSize:7, fontWeight:700, color: light ? DARK : LIGHT, zIndex:3 }}>{8-r}</span>}
                {/* Piece */}
                {piece && <span style={{ position:"relative", zIndex:2, lineHeight:1 }}>{UNICODE[piece] ?? piece}</span>}
                {/* Annotation badge */}
                {annInfo && annColor && (
                  <div style={{
                    position:"absolute", bottom:2, right:2, zIndex:4,
                    minWidth:15, height:15, borderRadius:8, padding:"0 2px",
                    background: annColor, display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.5)",
                  }}>
                    <span style={{ color:"#fff", fontSize:8, fontWeight:900, lineHeight:1 }}>
                      {ANN_SYMBOLS[annInfo.ann]}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function BoardPreview() {
  const [showAnn, setShowAnn] = (window as any).__annState || [true, () => {}];

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
            <div style={{ color:MUTED, fontSize:11 }}>Playing as White · Move 4</div>
          </div>
        </div>

        {/* Board (annotation ON) */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 6px", background:"#111827" }}>
          <ChessBoard showAnn={true} />
        </div>

        {/* Controls row */}
        <div style={{ background:"#111827", display:"flex", justifyContent:"center", gap:10, padding:"6px 0 10px" }}>
          {["⟪","◀","▶","⟫","⇄"].map((ic, i) => (
            <div key={i} style={{
              width:32, height:32, borderRadius:16,
              background:"#1f2937", border:"1px solid #374151",
              color:TEXT, fontSize:13, display:"flex",
              alignItems:"center", justifyContent:"center",
            }}>{ic}</div>
          ))}
          {/* Eye toggle — ON */}
          <div style={{
            width:32, height:32, borderRadius:16,
            background: PRIMARY + "33",
            border:`1px solid ${PRIMARY}`,
            color: PRIMARY, fontSize:14, display:"flex",
            alignItems:"center", justifyContent:"center",
          }}>👁</div>
          {/* Lock */}
          <div style={{
            width:32, height:32, borderRadius:16,
            background:"#1f2937", border:"1px solid #374151",
            color:"#9ca3af", fontSize:14, display:"flex",
            alignItems:"center", justifyContent:"center",
          }}>🔓</div>
        </div>

        {/* Legend */}
        <div style={{
          background:"#0d1117", padding:"8px 12px",
          borderTop:"1px solid #1f2937",
          display:"flex", flexWrap:"wrap", gap:6,
        }}>
          {[
            ["best","★","Nf6"],["great","!","a6"],["good","✓","e6"],
            ["second_best","✦","g6"],["inaccuracy","!?","d5"],
          ].map(([key, sym, sq]) => (
            <div key={key} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{
                width:18, height:18, borderRadius:9,
                background: ANN_COLORS[key],
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <span style={{ color:"#fff", fontSize:8, fontWeight:900 }}>{sym}</span>
              </div>
              <span style={{ color: MUTED, fontSize:11 }}>{sq}</span>
            </div>
          ))}
        </div>

        {/* Move tree panel */}
        <div style={{ background:"#0d1117", padding:"8px 12px 10px", borderTop:"1px solid #1f2937" }}>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", lineHeight:"1.9" }}>
            <span style={{ color:MUTED, fontSize:12, fontWeight:600 }}>1.</span>
            <span style={{ padding:"1px 5px", color:TEXT, fontSize:13 }}>e4</span>
            <span style={{ padding:"1px 5px", color:TEXT, fontSize:13 }}>c5</span>
            <span style={{ color:MUTED, fontSize:12, fontWeight:600 }}> 2.</span>
            <span style={{ padding:"1px 5px", color:TEXT, fontSize:13 }}>Nf3</span>
            <span style={{ padding:"1px 5px", color:TEXT, fontSize:13 }}>d6</span>
            <span style={{ color:MUTED, fontSize:12, fontWeight:600 }}> 3.</span>
            <span style={{ padding:"1px 5px", color:TEXT, fontSize:13 }}>d4</span>
            <span style={{ padding:"1px 5px", color:TEXT, fontSize:13 }}>cxd4</span>
            <span style={{ color:MUTED, fontSize:12, fontWeight:600 }}> 4.</span>
            <span style={{
              padding:"1px 5px", borderRadius:4,
              background: PRIMARY + "33", color:"#a5b4fc",
              fontSize:13, fontWeight:700,
            }}>Nxd4</span>
            <span style={{ color:MUTED, fontSize:12, marginLeft:4 }}>← Black to move</span>
          </div>
        </div>

        {/* Annotation picker */}
        <div style={{ background:"#111827", padding:"8px 12px 12px", borderTop:"1px solid #1f2937" }}>
          <div style={{ color:MUTED, fontSize:11, fontWeight:600, marginBottom:6 }}>Annotate move:</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {Object.entries(ANN_SYMBOLS).map(([key, sym]) => (
              <div key={key} style={{
                width:32, height:32, borderRadius:7,
                border:`2px solid ${ANN_COLORS[key]}`,
                background: key === "best" ? ANN_COLORS[key] : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer",
              }}>
                <span style={{ color: key === "best" ? "#fff" : ANN_COLORS[key], fontSize:11, fontWeight:800 }}>
                  {sym}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
