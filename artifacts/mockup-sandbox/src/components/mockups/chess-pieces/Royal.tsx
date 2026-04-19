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

export function Royal() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0e0c1a" }}>
      <p className="text-lg font-bold mb-4 tracking-widest" style={{
        color: "#d4af37",
        textShadow: "0 0 8px rgba(212,175,55,0.6)",
        fontFamily: "Georgia, serif",
        letterSpacing: "0.15em",
      }}>Royal</p>
      <div className="rounded-lg overflow-hidden" style={{
        border: "3px solid #d4af37",
        boxShadow: "0 0 24px rgba(212,175,55,0.3), 0 8px 32px rgba(0,0,0,0.8)",
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
                    background: light
                      ? "linear-gradient(135deg, #1e1a2e 0%, #2a2240 100%)"
                      : "linear-gradient(135deg, #0a0814 0%, #12101e 100%)",
                  }}
                >
                  {piece && (
                    <span style={{
                      fontSize: 36,
                      lineHeight: 1,
                      color: isWhite
                        ? "#f5e070"
                        : "#c0c0d8",
                      textShadow: isWhite
                        ? "0 0 4px rgba(212,175,55,0.8), 0 1px 4px rgba(0,0,0,0.8), 0 0 12px rgba(212,175,55,0.3)"
                        : "0 0 4px rgba(180,180,220,0.6), 0 1px 4px rgba(0,0,0,0.8), 0 0 10px rgba(160,160,200,0.3)",
                      filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.9))",
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
      <p className="text-sm mt-4" style={{ color: "#d4af3788", fontFamily: "Georgia, serif" }}>Gold &amp; Silver on midnight</p>
    </div>
  );
}
