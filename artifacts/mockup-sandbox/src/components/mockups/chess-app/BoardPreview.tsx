const BG = "#0f172a";
const HEADER = "#1e293b";
const CARD = "#1e293b";
const PRIMARY = "#6366f1";
const TEXT = "#f1f5f9";
const MUTED = "#64748b";
const BORDER = "#334155";
const GREEN = "#4caf50";

export function BoardPreview() {
  return (
    <div style={{
      minHeight: "100vh", background: BG,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      gap: 32, flexWrap: "wrap", padding: 16,
    }}>

      {/* Screen 1: Analysis tab with engine chip */}
      <div>
        <div style={{ color: MUTED, fontSize: 11, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Analysis Tab</div>
        <div style={{
          width: 330, background: BG, borderRadius: 20, overflow: "hidden",
          boxShadow: "0 16px 60px rgba(0,0,0,0.7)", border: `1px solid ${BORDER}`,
        }}>
          <div style={{ background: HEADER, padding: "8px 16px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#475569", fontSize: 11 }}>9:41</span>
            <span style={{ color: "#475569", fontSize: 11 }}>100%</span>
          </div>
          <div style={{ background: HEADER, padding: "8px 14px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 15, background: "#0f172a", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>←</div>
            <div style={{ flex: 1 }}><div style={{ color: TEXT, fontWeight: 700, fontSize: 14 }}>Ruy Lopez</div></div>
          </div>

          {/* Mini board */}
          <div style={{ background: "#0d1b2a", display: "flex", justifyContent: "center", padding: "8px 0 6px" }}>
            {(() => {
              const L = "#f0d9b5", D = "#b58863";
              const rows = ["rnbqkbnr","pppppppp","........","........","....P...","........","PPPP.PPP","RNBQKBNR"];
              const U: Record<string,string> = {r:"♜",n:"♞",b:"♝",q:"♛",k:"♚",p:"♟",R:"♖",N:"♘",B:"♗",Q:"♕",K:"♔",P:"♙"};
              return (
                <div style={{ display: "inline-flex", flexDirection: "column", border: `2px solid ${BORDER}`, borderRadius: 3 }}>
                  {rows.map((row,r) => (
                    <div key={r} style={{ display: "flex" }}>
                      {row.split("").map((ch,c) => {
                        const light = (r+c)%2===0;
                        const isE4 = r===4&&c===4, isE2 = r===6&&c===4;
                        return (
                          <div key={c} style={{ width:28, height:28, background: light?L:D, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", fontSize:18 }}>
                            {(isE4||isE2)&&<div style={{position:"absolute",inset:0,background:"rgba(255,215,0,0.4)"}}/>}
                            {isE4&&<div style={{position:"absolute",bottom:1,right:1,width:13,height:13,borderRadius:7,background:PRIMARY,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}><span style={{color:"#fff",fontSize:7,fontWeight:900}}>★</span></div>}
                            {ch!=="."&&<span style={{position:"relative",zIndex:2,lineHeight:1}}>{U[ch]}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Tabs */}
          <div style={{ background: "#0d1b2a", display: "flex", gap: 6, padding: "5px 10px 7px" }}>
            {["📋 Moves","🤖 Analysis"].map((t,i) => (
              <div key={i} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"6px 0", borderRadius:8, background: i===1?CARD:"transparent" }}>
                <span style={{ fontSize:11, color: i===1?TEXT:MUTED, fontWeight:600 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Analysis panel */}
          <div style={{ padding: "0 10px 12px" }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: PRIMARY, fontSize: 13 }}>⚙</span>
                  <span style={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>Analysis</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "3px 8px", background: "#0f172a" }}>
                    <div style={{ width: 7, height: 7, borderRadius: 4, background: GREEN }} />
                    <span style={{ color: MUTED, fontSize: 11, fontWeight: 600 }}>Stockfish 17</span>
                    <span style={{ color: MUTED, fontSize: 10 }}>▾</span>
                  </div>
                </div>
                <div style={{ width: 40, height: 24, borderRadius: 12, background: PRIMARY, position: "relative" }}>
                  <div style={{ position: "absolute", right: 2, top: 2, width: 20, height: 20, borderRadius: 10, background: "#fff" }} />
                </div>
              </div>
              <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: MUTED, fontSize: 12 }}>Eval:</span>
                  <span style={{ color: PRIMARY, fontSize: 20, fontWeight: 800 }}>+0.34</span>
                  <div style={{ background: "#4caf5022", borderRadius: 6, padding: "2px 7px" }}>
                    <span style={{ color: GREEN, fontSize: 11, fontWeight: 700 }}>★ Best</span>
                  </div>
                </div>
                <span style={{ color: MUTED, fontSize: 11 }}>Depth 18  +0.34  Best: e2e4 e7e5 g1f3</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: MUTED, fontSize: 11, minWidth: 54 }}>Depth: 18</span>
                  {[10,15,18,20].map(d=>(
                    <div key={d} style={{ padding:"3px 8px", borderRadius:5, background:d===18?PRIMARY:"#334155", fontSize:11, color:d===18?"#fff":MUTED, fontWeight:600 }}>{d}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen 2: Engine Slot Modal */}
      <div>
        <div style={{ color: MUTED, fontSize: 11, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Engine Slot Modal</div>
        <div style={{
          width: 330, background: BG, borderRadius: 20, overflow: "hidden",
          boxShadow: "0 16px 60px rgba(0,0,0,0.7)", border: `1px solid ${BORDER}`,
          position: "relative",
        }}>
          {/* Dimmed background hint */}
          <div style={{ background: HEADER, padding: "8px 16px", display: "flex", justifyContent: "space-between", opacity: 0.4 }}>
            <span style={{ color: "#475569", fontSize: 11 }}>9:41</span>
            <span style={{ color: "#475569", fontSize: 11 }}>100%</span>
          </div>
          <div style={{ height: 80, background: "#06090f", opacity: 0.7 }} />

          {/* Modal sheet */}
          <div style={{ background: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, border: `1px solid ${BORDER}`, padding: "10px 14px 20px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: BORDER, margin: "0 auto 12px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: PRIMARY }}>⚙</span>
                <span style={{ color: TEXT, fontWeight: 700, fontSize: 15 }}>Engine Slot</span>
              </div>
              <div style={{ width: 26, height: 26, borderRadius: 13, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>✕</div>
            </div>

            {/* Built-in */}
            <div style={{ border: `2px solid ${BORDER}`, borderRadius: 11, padding: "11px 12px", marginBottom: 8, background: "#0f172a40", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: PRIMARY+"22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
                <div>
                  <div style={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>Built-in Engine</div>
                  <div style={{ color: MUTED, fontSize: 11 }}>Material eval (fast, offline)</div>
                </div>
              </div>
            </div>

            {/* External — active */}
            <div style={{ border: `2px solid ${GREEN}`, borderRadius: 11, padding: "11px 12px", marginBottom: 11, background: GREEN+"10", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: GREEN+"22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔗</div>
                <div>
                  <div style={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>External UCI Engine</div>
                  <div style={{ color: MUTED, fontSize: 11 }}>Stockfish, Lc0, any UCI server</div>
                </div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: GREEN }} />
            </div>

            {/* Config */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 11, padding: 12, marginBottom: 10, background: BG, display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Engine name</span>
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 11px", color: TEXT, fontSize: 12, background: CARD }}>Stockfish 17</div>
              <span style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>WebSocket URL</span>
              <div style={{ border: `1px solid ${GREEN}44`, borderRadius: 7, padding: "8px 11px", color: GREEN, fontSize: 11, fontFamily: "monospace", background: CARD }}>ws://192.168.1.5:3004</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: 4, background: GREEN }} />
                <span style={{ color: GREEN, fontSize: 11, fontWeight: 600 }}>Connected ✓</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "6px 11px", width: "fit-content" }}>
                <span style={{ color: PRIMARY, fontSize: 12 }}>📶</span>
                <span style={{ color: PRIMARY, fontSize: 12, fontWeight: 600 }}>Test connection</span>
                <span style={{ color: GREEN, fontSize: 11 }}>✓</span>
              </div>
            </div>

            {/* How-to hint */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 9, padding: "10px 12px", marginBottom: 10, background: "#0a0f1a" }}>
              <div style={{ color: TEXT, fontSize: 12, fontWeight: 700, marginBottom: 5 }}>ℹ️ Setup guide</div>
              {["1. Install Stockfish on your PC/server", "2. Run: npx stockfish-ws-proxy --port 3004", "3. Connect phone & PC to same Wi-Fi", "4. Enter PC's local IP address above"].map((l,i) => (
                <div key={i} style={{ color: l.includes("npx") ? PRIMARY : MUTED, fontSize: l.includes("npx") ? 10 : 11, fontFamily: l.includes("npx") ? "monospace" : undefined, lineHeight: "1.7" }}>{l}</div>
              ))}
            </div>

            {/* Save */}
            <div style={{ background: PRIMARY, borderRadius: 11, padding: "13px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>🔗  Save & Connect</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
