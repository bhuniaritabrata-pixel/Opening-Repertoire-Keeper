/**
 * Built-in chess engine — alpha-beta search with piece-square tables.
 * Performance: FEN is parsed ONCE per node, not in sort comparators or evaluate.
 * Runs fully offline in the JS thread using iterative deepening.
 */

import { parseFenToBoard, getLegalMoves, applyMove, coordsToSquare, squareToCoords } from "@/utils/chess";
import { Square } from "@/types/chess";

// ─── Piece values (centipawns) ────────────────────────────────────────────────
const PIECE_VALUE: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

// ─── Piece-square tables (white's perspective, rank-8 = row 0) ────────────────
const PST: Record<string, number[]> = {
  p: [
     0,   0,   0,   0,   0,   0,   0,   0,
    50,  50,  50,  50,  50,  50,  50,  50,
    10,  10,  20,  30,  30,  20,  10,  10,
     5,   5,  10,  25,  25,  10,   5,   5,
     0,   0,   0,  20,  20,   0,   0,   0,
     5,  -5, -10,   0,   0, -10,  -5,   5,
     5,  10,  10, -20, -20,  10,  10,   5,
     0,   0,   0,   0,   0,   0,   0,   0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20,   0,   0,   0,   0, -20, -40,
    -30,   0,  10,  15,  15,  10,   0, -30,
    -30,   5,  15,  20,  20,  15,   5, -30,
    -30,   0,  15,  20,  20,  15,   0, -30,
    -30,   5,  10,  15,  15,  10,   5, -30,
    -40, -20,   0,   5,   5,   0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10,   0,   5,  10,  10,   5,   0, -10,
    -10,   5,   5,  10,  10,   5,   5, -10,
    -10,   0,  10,  10,  10,  10,   0, -10,
    -10,  10,  10,  10,  10,  10,  10, -10,
    -10,   5,   0,   0,   0,   0,   5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
     0,   0,   0,   0,   0,   0,   0,   0,
     5,  10,  10,  10,  10,  10,  10,   5,
    -5,   0,   0,   0,   0,   0,   0,  -5,
    -5,   0,   0,   0,   0,   0,   0,  -5,
    -5,   0,   0,   0,   0,   0,   0,  -5,
    -5,   0,   0,   0,   0,   0,   0,  -5,
    -5,   0,   0,   0,   0,   0,   0,  -5,
     0,   0,   0,   5,   5,   0,   0,   0,
  ],
  q: [
    -20, -10, -10,  -5,  -5, -10, -10, -20,
    -10,   0,   0,   0,   0,   0,   0, -10,
    -10,   0,   5,   5,   5,   5,   0, -10,
     -5,   0,   5,   5,   5,   5,   0,  -5,
      0,   0,   5,   5,   5,   5,   0,  -5,
    -10,   5,   5,   5,   5,   5,   0, -10,
    -10,   0,   5,   0,   0,   0,   0, -10,
    -20, -10, -10,  -5,  -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
     20,  20,   0,   0,   0,   0,  20,  20,
     20,  30,  10,   0,   0,  10,  30,  20,
  ],
};

function pstScore(type: string, row: number, col: number, isWhite: boolean): number {
  const idx = isWhite ? row * 8 + col : (7 - row) * 8 + col;
  return (PST[type]?.[idx] ?? 0);
}

// ─── Board state type (from parseFenToBoard) ──────────────────────────────────
type BoardState = ReturnType<typeof parseFenToBoard>;

// ─── Static evaluation — takes pre-parsed board state (no FEN re-parse) ───────
function evaluateState(state: BoardState): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const v = PIECE_VALUE[p.type] ?? 0;
      const ps = pstScore(p.type, r, c, p.color === "w");
      if (p.color === "w") score += v + ps;
      else score -= v + ps;
    }
  }
  return score;
}

// ─── Move generation — uses pre-parsed state for piece iteration ──────────────
function collectMoves(fen: string, state: BoardState): Array<[Square, Square]> {
  const moves: Array<[Square, Square]> = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p || p.color !== state.activeColor) continue;
      const from = coordsToSquare(r, c) as Square;
      const dests = getLegalMoves(fen, from);
      for (const to of dests) moves.push([from, to as Square]);
    }
  }
  return moves;
}

// ─── Negamax alpha-beta ───────────────────────────────────────────────────────
const CHECKMATE = 1_000_000;
const TEMPO = 10;

function negamax(
  fen: string,
  depth: number,
  alpha: number,
  beta: number,
  cancelled: { v: boolean },
): number {
  if (cancelled.v) return 0;

  // Parse FEN ONCE per node — reused for evaluation, move gen, and move ordering
  const state = parseFenToBoard(fen);

  if (depth === 0) {
    const raw = evaluateState(state);
    return state.activeColor === "w" ? raw + TEMPO : -raw + TEMPO;
  }

  const moves = collectMoves(fen, state);

  if (moves.length === 0) {
    const fenBoard = fen.split(" ")[0];
    const kingChar = state.activeColor === "w" ? "K" : "k";
    if (!fenBoard.includes(kingChar)) return -CHECKMATE + depth;
    return 0;
  }

  // Move ordering: captures first — uses already-parsed state, NO extra FEN parse
  const ordered = moves.slice().sort(([, a], [, b]) => {
    const [ar, ac] = squareToCoords(a as Square);
    const [br, bc] = squareToCoords(b as Square);
    const aPiece = state.board[ar][ac];
    const bPiece = state.board[br][bc];
    const av = aPiece ? (PIECE_VALUE[aPiece.type] ?? 0) : 0;
    const bv = bPiece ? (PIECE_VALUE[bPiece.type] ?? 0) : 0;
    return bv - av;
  });

  let best = -Infinity;
  for (const [from, to] of ordered) {
    if (cancelled.v) break;
    const result = applyMove(fen, from, to);
    if (!result) continue;
    const score = -negamax(result.fen, depth - 1, -beta, -alpha, cancelled);
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export interface EngineResult {
  score: number;
  mate: number | null;
  depth: number;
  bestMove: string;
  pv: string[];
}

export function analyzePosition(
  fen: string,
  maxDepth: number,
  onResult: (r: EngineResult) => void,
): () => void {
  const cancelled = { v: false };

  const run = async () => {
    // Parse the root FEN once for the top-level search
    const rootState = parseFenToBoard(fen);

    for (let depth = 1; depth <= maxDepth && !cancelled.v; depth++) {
      const moves = collectMoves(fen, rootState);
      if (moves.length === 0) break;

      let bestScore = -Infinity;
      let bestMove: [Square, Square] | null = null;
      let bestPv: string[] = [];

      // Move ordering at root — use the already-parsed rootState, NO extra parse
      const ordered = moves.slice().sort(([, a], [, b]) => {
        const [ar, ac] = squareToCoords(a as Square);
        const [br, bc] = squareToCoords(b as Square);
        const ap = rootState.board[ar][ac];
        const bp = rootState.board[br][bc];
        return (PIECE_VALUE[bp?.type ?? ""] ?? 0) - (PIECE_VALUE[ap?.type ?? ""] ?? 0);
      });

      for (const [from, to] of ordered) {
        if (cancelled.v) break;
        const result = applyMove(fen, from, to);
        if (!result) continue;
        const score = -negamax(result.fen, depth - 1, -Infinity, Infinity, cancelled);
        if (score > bestScore) {
          bestScore = score;
          bestMove = [from, to];
          bestPv = [`${from}${to}`];
        }
      }

      if (cancelled.v || !bestMove) break;

      const isWhite = rootState.activeColor === "w";
      const absScore = isWhite ? bestScore : -bestScore;

      let mate: number | null = null;
      if (Math.abs(bestScore) > CHECKMATE - 1000) {
        const mateIn = Math.ceil((CHECKMATE - Math.abs(bestScore)) / 2);
        mate = bestScore > 0 ? mateIn : -mateIn;
        if (!isWhite) mate = -mate;
      }

      onResult({
        score: absScore,
        mate,
        depth,
        bestMove: `${bestMove[0]}${bestMove[1]}`,
        pv: bestPv,
      });

      // Yield between depths so UI can update
      await new Promise<void>(r => setTimeout(r, 0));
    }
  };

  run();
  return () => { cancelled.v = true; };
}

export function formatScore(score: number, mate: number | null, _activeColor: "w" | "b"): string {
  if (mate !== null) return `M${Math.abs(mate)}`;
  const pawns = score / 100;
  const sign = pawns >= 0 ? "+" : "";
  return `${sign}${pawns.toFixed(2)}`;
}

export function evalBarPercent(score: number, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 100 : 0;
  const x = score / 400;
  const pct = 50 + 50 * (x / Math.sqrt(1 + x * x));
  return Math.max(2, Math.min(98, pct));
}
