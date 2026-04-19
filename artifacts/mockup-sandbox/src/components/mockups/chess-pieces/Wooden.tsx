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
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#2c1a0e" }}>
      <p className="text-lg font-bold mb-4 tracking-wide" style={{ color: "#d4a256", fontFamily: "Georgia, serif" }}>Wooden</p>
      <div className="rounded-lg overflow-hidden" style={{
        border: "6px solid #6b3a1f",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7), inset 0 0 0 2px #a0622a",
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
                      ? "linear-gradient(135deg, #e8c98a 0%, #d4a050 50%, #c4902a 100%)"
                      : "linear-gradient(135deg, #6b3a1f 0%, #4a2510 50%, #3a1a08 100%)",
                  }}
                >
                  {piece && (
                    <span style={{
                      fontSize: 36,
                      lineHeight: 1,
                      color: isWhite ? "#f5e6c8" : "#1a0a00",
                      textShadow: isWhite
                        ? "0 1px 3px rgba(60,30,0,0.8), 0 0 1px rgba(60,30,0,0.6)"
                        : "0 1px 2px rgba(200,150,80,0.5)",
                      filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.6))",
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
      <p className="text-sm mt-4" style={{ color: "#a06030" }}>Rich mahogany &amp; maple</p>
    </div>
  );
}
