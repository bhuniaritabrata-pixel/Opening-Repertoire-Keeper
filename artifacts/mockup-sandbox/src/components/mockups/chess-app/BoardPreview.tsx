const LIGHT = "#f0d9b5";
const DARK = "#b58863";
const BG = "#0f172a";
const HEADER = "#1e293b";
const PRIMARY = "#6366f1";
const TEXT = "#f1f5f9";
const MUTED = "#64748b";
const LAST_MOVE = "rgba(255,215,0,0.42)";

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
  brilliant:"!!", great:"!", good:"✓", best:"★",
  second_best:"✦", book:"B", inaccuracy:"!?", mistake:"?", blunder:"??",
};

// After 1.e4 e5 2.Nf3 — now at this position.
// Children (possible Black moves) with annotations:
//  Nc6 = best (★),  Nf6 = great (!),  d6 = good (✓),  f5 = mistake (?)
const ANNOTATIONS: Record<string, { ann: string; from: string }> = {
  c6: { ann: "best",    from: "b8" },
  f6: { ann: "great",   from: "g8" },
  d6: { ann: "good",    from: "d7" },
  f5: { ann: "mistake", from: "f7" },
};

// Last move: 2.Nf3 (f1→f3 wait — Nf3 means g1→f3)
const LAST_FROM = "g1";
const LAST_TO   = "f3";

// FEN after 1.e4 e5 2.Nf3
const FEN = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

type Board = (string|null)[][];
function parseFen(fen: string): Board {
  return fen.split(" ")[0].split("/").map(row => {
    const cells: (string|null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i=0;i<+ch;i++) cells.push(null);
      else cells.push(ch);
    }
    return cells;
  });
}

const UNICODE: Record<string,string> = {
  K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",
  k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟",
};

function sqName(r:number, c:number){ return String.fromCharCode(97+c)+(8-r); }

function ChessBoard() {
  const board = parseFen(FEN);
  const S = 44;

  return (
    <div style={{display:"inline-flex",flexDirection:"column",border:"2px solid #334155",borderRadius:4,overflow:"hidden"}}>
      {board.map((row,r) => (
        <div key={r} style={{display:"flex"}}>
          {row.map((piece,c) => {
            const light = (r+c)%2===0;
            const sq = sqName(r,c);
            const isLast = sq===LAST_FROM || sq===LAST_TO;
            const annDest = ANNOTATIONS[sq];
            const annFrom = Object.values(ANNOTATIONS).find(a=>a.from===sq);
            const isAnnFrom = !!annFrom && !annDest;
            const annColor = annDest ? ANN_COLORS[annDest.ann] : annFrom ? ANN_COLORS[annFrom.ann] : undefined;

            let bg = light ? LIGHT : DARK;

            return (
              <div key={c} style={{
                width:S, height:S,
                background: bg,
                display:"flex",alignItems:"center",justifyContent:"center",
                position:"relative", fontSize:28, userSelect:"none",
              }}>
                {/* Last-move highlight */}
                {isLast && <div style={{position:"absolute",inset:0,background:LAST_MOVE,zIndex:1}}/>}
                {/* Annotation destination tint */}
                {annDest && annColor && !isLast && (
                  <div style={{position:"absolute",inset:0,background:annColor+"55",zIndex:1}}/>
                )}
                {/* Annotation source tint */}
                {isAnnFrom && annColor && (
                  <div style={{position:"absolute",inset:0,background:annColor+"28",zIndex:1}}/>
                )}
                {/* Coord labels */}
                {r===7 && <span style={{position:"absolute",bottom:1,right:2,fontSize:8,fontWeight:700,color:light?DARK:LIGHT,zIndex:3,lineHeight:1}}>{String.fromCharCode(97+c)}</span>}
                {c===0 && <span style={{position:"absolute",top:1,left:2,fontSize:8,fontWeight:700,color:light?DARK:LIGHT,zIndex:3,lineHeight:1}}>{8-r}</span>}
                {/* Piece */}
                {piece && <span style={{position:"relative",zIndex:2,lineHeight:1,fontSize:30}}>{UNICODE[piece]??piece}</span>}
                {/* Annotation badge */}
                {annDest && annColor && (
                  <div style={{
                    position:"absolute",bottom:2,right:2,zIndex:5,
                    minWidth:16,height:16,borderRadius:8,padding:"0 2px",
                    background:annColor,display:"flex",alignItems:"center",
                    justifyContent:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.6)",
                  }}>
                    <span style={{color:"#fff",fontSize:9,fontWeight:900,lineHeight:1}}>
                      {ANN_SYMBOLS[annDest.ann]}
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
  return (
    <div style={{
      minHeight:"100vh",background:BG,display:"flex",
      alignItems:"center",justifyContent:"center",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
      <div style={{width:380,background:BG,borderRadius:20,overflow:"hidden",
        boxShadow:"0 24px 80px rgba(0,0,0,0.7)",border:"1px solid #1e293b"}}>

        {/* Status bar */}
        <div style={{background:HEADER,padding:"8px 16px",display:"flex",justifyContent:"space-between"}}>
          <span style={{color:"#475569",fontSize:11}}>9:41</span>
          <span style={{color:"#475569",fontSize:11}}>●●● 100%</span>
        </div>

        {/* Header */}
        <div style={{background:HEADER,padding:"8px 14px 12px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:16,background:"#1e293b",border:"1px solid #334155",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:16}}>←</div>
          <div style={{flex:1}}>
            <div style={{color:TEXT,fontWeight:700,fontSize:15}}>Italian Game</div>
            <div style={{color:MUTED,fontSize:11}}>Playing as White · Move 2</div>
          </div>
        </div>

        {/* Board */}
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 8px",background:"#0f172a"}}>
          <ChessBoard/>
        </div>

        {/* Controls */}
        <div style={{background:"#0f172a",display:"flex",justifyContent:"center",gap:8,padding:"4px 0 12px"}}>
          {[["⟪","#6366f1"],["◀","#f1f5f9"],["▶","#f1f5f9"],["⟫","#6366f1"],["⇄","#06b6d4"]].map(([ic,col],i)=>(
            <div key={i} style={{width:36,height:36,borderRadius:18,background:"#1e293b",border:"1px solid #334155",
              color:col,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{ic}</div>
          ))}
          {/* Eye toggle ON */}
          <div style={{width:36,height:36,borderRadius:18,background:PRIMARY+"33",border:`2px solid ${PRIMARY}`,
            color:PRIMARY,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>👁</div>
          <div style={{width:36,height:36,borderRadius:18,background:"#1e293b",border:"1px solid #334155",
            color:"#94a3b8",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>🔓</div>
        </div>

        {/* Legend strip */}
        <div style={{background:"#0d1b2a",borderTop:"1px solid #1e293b",padding:"8px 14px",
          display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{color:MUTED,fontSize:11,fontWeight:600}}>Board badges:</span>
          {[["best","★","Nc6"],["great","!","Nf6"],["good","✓","d6"],["mistake","?","f5"]].map(([key,sym,move])=>(
            <div key={key} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:18,height:18,borderRadius:9,background:ANN_COLORS[key],
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{color:"#fff",fontSize:8,fontWeight:900}}>{sym}</span>
              </div>
              <span style={{color:TEXT,fontSize:11,fontWeight:600}}>{move}</span>
            </div>
          ))}
        </div>

        {/* Move tree */}
        <div style={{background:"#0d1b2a",borderTop:"1px solid #1e293b",padding:"10px 14px"}}>
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:2,lineHeight:"2"}}>
            <span style={{color:MUTED,fontSize:12,fontWeight:600}}>1.</span>
            <span style={{color:TEXT,fontSize:13,padding:"0 4px"}}>e4</span>
            <span style={{color:TEXT,fontSize:13,padding:"0 4px"}}>e5</span>
            <span style={{color:MUTED,fontSize:12,fontWeight:600}}> 2.</span>
            <span style={{color:"#a5b4fc",fontSize:13,padding:"2px 6px",borderRadius:5,background:PRIMARY+"33",fontWeight:700}}>Nf3</span>
            <span style={{color:MUTED,fontSize:12,marginLeft:6}}>← you are here</span>
          </div>
          <div style={{marginTop:6,color:MUTED,fontSize:11}}>
            Badges show annotated candidate replies for Black
          </div>
        </div>

        {/* Annotation picker */}
        <div style={{background:"#111827",borderTop:"1px solid #1e293b",padding:"10px 14px 14px"}}>
          <div style={{color:MUTED,fontSize:11,fontWeight:600,marginBottom:8}}>Annotate current move:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            {Object.entries(ANN_SYMBOLS).map(([key,sym])=>(
              <div key={key} style={{width:34,height:34,borderRadius:8,
                border:`2px solid ${ANN_COLORS[key]}`,
                background: key==="best" ? ANN_COLORS[key] : "transparent",
                display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <span style={{color:key==="best"?"#fff":ANN_COLORS[key],fontSize:11,fontWeight:900}}>{sym}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
