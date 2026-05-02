const LIGHT = "#f0d9b5";
const DARK = "#b58863";
const BG = "#0f172a";
const HEADER = "#1e293b";
const PRIMARY = "#6366f1";
const TEXT = "#f1f5f9";
const MUTED = "#64748b";

const ANN_COLORS: Record<string, string> = {
  brilliant:"#00bcd4", great:"#4caf50", good:"#8bc34a", best:"#2196f3",
  second_best:"#7c3aed", book:"#7c4a03", inaccuracy:"#ff9800",
  mistake:"#ff5722", blunder:"#f44336",
};
const ANN_SYMBOLS: Record<string, string> = {
  brilliant:"!!", great:"!", good:"✓", best:"★",
  second_best:"✦", book:"B", inaccuracy:"!?", mistake:"?", blunder:"??",
};

// FEN after 1.e4 — badge should show ON e4 (destination of the current move)
const FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
// Current move: e2 → e4, annotated as "best"
const CURRENT_MOVE = { from: "e2", to: "e4", ann: "best" };

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
function sqName(r:number,c:number){ return String.fromCharCode(97+c)+(8-r); }

function Board1({ label, showAnn, highlightFrom, highlightTo }: {
  label: string; showAnn: boolean; highlightFrom: string; highlightTo: string;
}) {
  const board = parseFen(FEN);
  const S = 36;
  const annColor = ANN_COLORS[CURRENT_MOVE.ann];

  return (
    <div style={{flex:1}}>
      <div style={{textAlign:"center",color:MUTED,fontSize:11,fontWeight:600,marginBottom:6}}>{label}</div>
      <div style={{display:"inline-flex",flexDirection:"column",border:"2px solid #334155",borderRadius:4,overflow:"hidden"}}>
        {board.map((row,r)=>(
          <div key={r} style={{display:"flex"}}>
            {row.map((piece,c)=>{
              const sq = sqName(r,c);
              const isTo = sq === highlightTo;
              const isFrom = sq === highlightFrom;
              const isCurrTo = sq === CURRENT_MOVE.to;
              const isCurrFrom = sq === CURRENT_MOVE.from;
              const light = (r+c)%2===0;

              return (
                <div key={c} style={{
                  width:S,height:S,background:light?LIGHT:DARK,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  position:"relative",fontSize:22,userSelect:"none",
                }}>
                  {/* Last-move highlight */}
                  {(isTo||isFrom) && (
                    <div style={{position:"absolute",inset:0,background:"rgba(255,215,0,0.42)",zIndex:1}}/>
                  )}
                  {/* Annotation destination tint */}
                  {showAnn && isCurrTo && (
                    <div style={{position:"absolute",inset:0,background:annColor+"55",zIndex:2}}/>
                  )}
                  {/* Annotation source tint */}
                  {showAnn && isCurrFrom && !isCurrTo && (
                    <div style={{position:"absolute",inset:0,background:annColor+"28",zIndex:2}}/>
                  )}
                  {piece && <span style={{position:"relative",zIndex:3,lineHeight:1}}>{UNICODE[piece]??piece}</span>}
                  {/* Coord labels */}
                  {r===7 && <span style={{position:"absolute",bottom:1,right:2,fontSize:7,fontWeight:700,color:light?DARK:LIGHT,zIndex:3,lineHeight:1}}>{String.fromCharCode(97+c)}</span>}
                  {c===0 && <span style={{position:"absolute",top:1,left:2,fontSize:7,fontWeight:700,color:light?DARK:LIGHT,zIndex:3,lineHeight:1}}>{8-r}</span>}
                  {/* Badge */}
                  {showAnn && isCurrTo && (
                    <div style={{
                      position:"absolute",bottom:2,right:2,zIndex:5,
                      minWidth:15,height:15,borderRadius:8,padding:"0 2px",
                      background:annColor,display:"flex",alignItems:"center",
                      justifyContent:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.6)",
                    }}>
                      <span style={{color:"#fff",fontSize:8,fontWeight:900,lineHeight:1}}>
                        {ANN_SYMBOLS[CURRENT_MOVE.ann]}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
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
      <div style={{width:390,background:BG,borderRadius:20,overflow:"hidden",
        boxShadow:"0 24px 80px rgba(0,0,0,0.7)",border:"1px solid #1e293b"}}>

        {/* Status bar */}
        <div style={{background:HEADER,padding:"8px 16px",display:"flex",justifyContent:"space-between"}}>
          <span style={{color:"#475569",fontSize:11}}>9:41</span>
          <span style={{color:"#475569",fontSize:11}}>100%</span>
        </div>

        {/* Header */}
        <div style={{background:HEADER,padding:"8px 14px 12px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:16,background:"#1e293b",border:"1px solid #334155",
            display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:16}}>←</div>
          <div style={{flex:1}}>
            <div style={{color:TEXT,fontWeight:700,fontSize:15}}>Ruy Lopez</div>
            <div style={{color:MUTED,fontSize:11}}>Playing as White · Move 1</div>
          </div>
        </div>

        {/* Two boards side by side: before/after */}
        <div style={{background:"#0d1b2a",padding:"12px 16px 8px"}}>
          <div style={{color:"#94a3b8",fontSize:11,fontWeight:600,marginBottom:10,textAlign:"center"}}>
            Badge appears ON e4 (after playing 1.e4★)
          </div>
          <div style={{display:"flex",gap:16,justifyContent:"center"}}>
            <Board1
              label="❌ Old: badge on wrong square"
              showAnn={false}
              highlightFrom="e2"
              highlightTo="e4"
            />
            <Board1
              label="✅ Fixed: badge on e4"
              showAnn={true}
              highlightFrom="e2"
              highlightTo="e4"
            />
          </div>
        </div>

        {/* Controls */}
        <div style={{background:"#0d1b2a",display:"flex",justifyContent:"center",gap:8,padding:"6px 0 12px"}}>
          {[["⟪","#6366f1"],["◀","#f1f5f9"],["▶","#f1f5f9"],["⟫","#6366f1"],["⇄","#06b6d4"]].map(([ic,col],i)=>(
            <div key={i} style={{width:34,height:34,borderRadius:17,background:"#1e293b",border:"1px solid #334155",
              color:col,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>{ic}</div>
          ))}
          <div style={{width:34,height:34,borderRadius:17,background:PRIMARY+"33",border:`2px solid ${PRIMARY}`,
            color:PRIMARY,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>👁</div>
          <div style={{width:34,height:34,borderRadius:17,background:"#1e293b",border:"1px solid #334155",
            color:"#94a3b8",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>🔓</div>
        </div>

        {/* Move tree */}
        <div style={{background:"#0d1b2a",borderTop:"1px solid #1e293b",padding:"10px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",lineHeight:"2"}}>
            <span style={{color:MUTED,fontSize:12,fontWeight:600}}>1.</span>
            <span style={{color:"#a5b4fc",fontSize:13,padding:"2px 6px",borderRadius:5,
              background:PRIMARY+"33",fontWeight:700,display:"inline-flex",alignItems:"center",gap:3}}>
              e4
              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",
                width:14,height:14,borderRadius:7,background:ANN_COLORS["best"],fontSize:7,fontWeight:900,color:"#fff"}}>★</span>
            </span>
            <span style={{color:MUTED,fontSize:11,marginLeft:4}}>← you are here · annotation visible on board</span>
          </div>
        </div>

        {/* Annotation picker */}
        <div style={{background:"#111827",borderTop:"1px solid #1e293b",padding:"10px 14px 14px"}}>
          <div style={{color:MUTED,fontSize:11,fontWeight:600,marginBottom:8}}>Annotate this move:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
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
