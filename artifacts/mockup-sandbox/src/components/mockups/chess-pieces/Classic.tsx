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

export function Classic() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#f0d9b5" }}>
      <p className="text-lg font-bold mb-4 tracking-wide" style={{ color: "#3d2b1f", fontFamily: "Georgia, serif" }}>Classic</p>
      <div className="rounded-lg overflow-hidden shadow-2xl" style={{ border: "4px solid #8b6914" }}>
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
                    background: light ? "#f0d9b5" : "#b58863",
                  }}
                >
                  {piece && (
                    <span style={{
                      fontSize: 36,
                      lineHeight: 1,
                      color: isWhite ? "#ffffff" : "#1a1a1a",
                      textShadow: isWhite
                        ? "0 0 2px #2d2d2d, 0 0 2px #2d2d2d, 0 0 2px #2d2d2d, 0 0 2px #2d2d2d"
                        : "0 0 2px #e0e0e0, 0 0 2px #e0e0e0",
                      filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.4))",
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
      <p className="text-sm mt-4" style={{ color: "#6b4c2a" }}>Traditional Staunton style</p>
    </div>
  );
}
