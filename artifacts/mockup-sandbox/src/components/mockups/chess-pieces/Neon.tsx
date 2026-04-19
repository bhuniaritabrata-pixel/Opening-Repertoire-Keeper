const PIECES: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

const INITIAL: (string | null)[][] = [
  ["r","n","b","q","k","b","n","r"],
  ["p","p","p","p","p","p","p","p"],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ["P","P","P","P","P","P","P","P"],
  ["R","N","B","Q","K","B","N","R"],
];

export function Neon() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#070714" }}>
      <p className="text-lg font-bold mb-4 tracking-widest uppercase" style={{
        color: "#00f5ff",
        textShadow: "0 0 10px #00f5ff, 0 0 20px #00f5ff",
        fontFamily: "monospace",
      }}>Neon</p>
      <div className="rounded overflow-hidden" style={{
        border: "2px solid #00f5ff",
        boxShadow: "0 0 20px rgba(0,245,255,0.4), 0 0 60px rgba(0,245,255,0.1)",
      }}>
        {INITIAL.map((row, r) => (
          <div key={r} className="flex">
            {row.map((piece, c) => {
              const light = (r + c) % 2 === 0;
              const isWhite = piece && piece === piece.toUpperCase();
              return (
                <div
                  key={c}
                  className="flex items-center justify-center"
                  style={{
                    width: 52, height: 52,
                    background: light ? "#0d1b2e" : "#060d1a",
                    borderRight: c < 7 ? "1px solid rgba(0,245,255,0.08)" : "none",
                    borderBottom: r < 7 ? "1px solid rgba(0,245,255,0.08)" : "none",
                  }}
                >
                  {piece && (
                    <span style={{
                      fontSize: 34,
                      lineHeight: 1,
                      color: isWhite ? "#00f5ff" : "#ff00e6",
                      textShadow: isWhite
                        ? "0 0 6px #00f5ff, 0 0 12px #00f5ff, 0 0 20px rgba(0,245,255,0.5)"
                        : "0 0 6px #ff00e6, 0 0 12px #ff00e6, 0 0 20px rgba(255,0,230,0.5)",
                    }}>
                      {PIECES[piece]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-sm mt-4 tracking-widest" style={{ color: "#00f5ff88", fontFamily: "monospace" }}>Cyan vs Magenta</p>
    </div>
  );
}
