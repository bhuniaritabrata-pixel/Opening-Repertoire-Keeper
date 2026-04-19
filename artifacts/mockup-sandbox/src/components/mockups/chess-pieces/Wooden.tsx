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

export function Wooden() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#0e0c1a" }}>
      <p className="text-base font-bold mb-4 tracking-widest uppercase" style={{
        color: "#d4af37",
        fontFamily: "Georgia, serif",
        letterSpacing: "0.2em",
      }}>Outlined</p>
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
                      fontSize: 38,
                      lineHeight: 1,
                      color: "transparent",
                      WebkitTextStroke: isWhite ? "2px #f0d580" : "2px #a0a8d0",
                      filter: isWhite
                        ? "drop-shadow(0 0 4px rgba(212,175,55,0.6))"
                        : "drop-shadow(0 0 4px rgba(140,150,200,0.5))",
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
      <p className="text-xs mt-3" style={{ color: "#d4af3766", fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>Hollow outline pieces, fully transparent fill</p>
    </div>
  );
}
