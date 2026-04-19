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
      <p className="text-base font-bold mb-4 tracking-widest uppercase" style={{
        color: "#d4af37",
        fontFamily: "Georgia, serif",
        letterSpacing: "0.2em",
      }}>Gradient Glow</p>
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
                    <span
                      style={{
                        fontSize: 38,
                        lineHeight: 1,
                        background: isWhite
                          ? "linear-gradient(160deg, #fff8c0 0%, #d4af37 50%, #a0780a 100%)"
                          : "linear-gradient(160deg, #9090c0 0%, #6060a0 50%, #303060 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        filter: isWhite
                          ? "drop-shadow(0 0 6px rgba(212,175,55,0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                          : "drop-shadow(0 0 6px rgba(100,100,200,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
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
      <p className="text-xs mt-3" style={{ color: "#d4af3766", fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>Metallic gradient with soft glow</p>
    </div>
  );
}
