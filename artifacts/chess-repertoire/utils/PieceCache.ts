const BASE = "https://lichess1.org/assets/piece/cburnett";

const PIECE_KEYS = [
  "wK", "wQ", "wR", "wB", "wN", "wP",
  "bK", "bQ", "bR", "bB", "bN", "bP",
];

const svgCache: Map<string, string> = new Map();
let preloadPromise: Promise<void> | null = null;

export async function preloadPieces(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = Promise.allSettled(
    PIECE_KEYS.map(async (key) => {
      try {
        const res = await fetch(`${BASE}/${key}.svg`);
        if (res.ok) {
          svgCache.set(key.toLowerCase(), await res.text());
        }
      } catch {
        // silently ignore — SvgUri fallback will handle it
      }
    }),
  ).then(() => undefined);
  return preloadPromise;
}

export function getCachedPieceSvg(key: string): string | null {
  return svgCache.get(key) ?? null;
}
