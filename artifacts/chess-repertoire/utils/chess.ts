import { Piece, PieceColor, PieceType, Square, STARTING_FEN } from "@/types/chess";

export interface BoardState {
  board: (Piece | null)[][];
  activeColor: PieceColor;
  castling: string;
  enPassant: string | null;
  halfMove: number;
  fullMove: number;
  fen: string;
}

function parseFen(fen: string): BoardState {
  const parts = fen.split(" ");
  const position = parts[0];
  const activeColor = (parts[1] || "w") as PieceColor;
  const castling = parts[2] || "-";
  const enPassantStr = parts[3] || "-";
  const halfMove = parseInt(parts[4] || "0");
  const fullMove = parseInt(parts[5] || "1");

  const board: (Piece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  const rows = position.split("/");
  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        col += parseInt(ch);
      } else {
        const color: PieceColor = ch === ch.toUpperCase() ? "w" : "b";
        const type = ch.toLowerCase() as PieceType;
        board[r][col] = { type, color };
        col++;
      }
    }
  }

  return {
    board,
    activeColor,
    castling,
    enPassant: enPassantStr === "-" ? null : enPassantStr,
    halfMove,
    fullMove,
    fen,
  };
}

export function squareToCoords(sq: Square): [number, number] {
  const file = sq.charCodeAt(0) - "a".charCodeAt(0);
  const rank = 8 - parseInt(sq[1]);
  return [rank, file];
}

export function coordsToSquare(row: number, col: number): Square {
  return String.fromCharCode("a".charCodeAt(0) + col) + (8 - row);
}

export function getPieceAtSquare(boardState: BoardState, sq: Square): Piece | null {
  const [row, col] = squareToCoords(sq);
  return boardState.board[row][col];
}

export function parseFenToBoard(fen: string): BoardState {
  return parseFen(fen || STARTING_FEN);
}

export function fenToBoard(fen: string): (Piece | null)[][] {
  return parseFen(fen || STARTING_FEN).board;
}

export function getActiveColor(fen: string): PieceColor {
  return parseFen(fen).activeColor;
}

// Simple chess move generation
interface MoveResult {
  fen: string;
  san: string;
  captured?: PieceType;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

function boardToFenPosition(board: (Piece | null)[][]): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let row = "";
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        const ch = piece.type;
        row += piece.color === "w" ? ch.toUpperCase() : ch;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }
  return rows.join("/");
}

export function isValidSquare(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Returns true if the square (row, col) is attacked by any piece of attackerColor
function isSquareAttackedBy(
  board: (Piece | null)[][],
  row: number,
  col: number,
  attackerColor: PieceColor
): boolean {
  // Pawn attacks: white pawns stand one row below and attack diagonally up (row+1 → row),
  // black pawns stand one row above and attack diagonally down (row-1 → row)
  const pawnSourceRow = attackerColor === "w" ? row + 1 : row - 1;
  for (const dc of [-1, 1]) {
    const pc = col + dc;
    if (isValidSquare(pawnSourceRow, pc)) {
      const p = board[pawnSourceRow][pc];
      if (p && p.type === "p" && p.color === attackerColor) return true;
    }
  }

  // Knight attacks
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = row + dr, nc = col + dc;
    if (isValidSquare(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.type === "n" && p.color === attackerColor) return true;
    }
  }

  // Bishop / Queen diagonals
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    let r = row + dr, c = col + dc;
    while (isValidSquare(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === attackerColor && (p.type === "b" || p.type === "q")) return true;
        break;
      }
      r += dr; c += dc;
    }
  }

  // Rook / Queen straight lines
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let r = row + dr, c = col + dc;
    while (isValidSquare(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === attackerColor && (p.type === "r" || p.type === "q")) return true;
        break;
      }
      r += dr; c += dc;
    }
  }

  // King adjacency
  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr = row + dr, nc = col + dc;
    if (isValidSquare(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.type === "k" && p.color === attackerColor) return true;
    }
  }

  return false;
}

// Find king position
function findKing(board: (Piece | null)[][], color: PieceColor): [number, number] | null {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === "k" && p.color === color) return [r, c];
    }
  return null;
}

// Returns true if 'color' king is currently in check on this board
function isInCheck(board: (Piece | null)[][], color: PieceColor): boolean {
  const opp: PieceColor = color === "w" ? "b" : "w";
  const kp = findKing(board, color);
  if (!kp) return false;
  return isSquareAttackedBy(board, kp[0], kp[1], opp);
}

// Apply a move on a board copy and return the new board (no FEN update, just position)
function applyMoveOnBoard(
  board: (Piece | null)[][],
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  enPassant: string | null,
  promotion?: PieceType
): (Piece | null)[][] {
  const nb = board.map(row => [...row]);
  const piece = nb[fromRow][fromCol]!;

  // En passant capture
  if (piece.type === "p" && enPassant) {
    const [epR, epC] = squareToCoords(enPassant as Square);
    if (toRow === epR && toCol === epC) {
      nb[fromRow][toCol] = null; // remove captured pawn
    }
  }

  nb[toRow][toCol] = promotion ? { type: promotion, color: piece.color } : piece;
  nb[fromRow][fromCol] = null;

  // Move rook when castling
  if (piece.type === "k") {
    if (fromRow === 7 && fromCol === 4 && toRow === 7 && toCol === 6) { nb[7][5] = { type: "r", color: "w" }; nb[7][7] = null; }
    if (fromRow === 7 && fromCol === 4 && toRow === 7 && toCol === 2) { nb[7][3] = { type: "r", color: "w" }; nb[7][0] = null; }
    if (fromRow === 0 && fromCol === 4 && toRow === 0 && toCol === 6) { nb[0][5] = { type: "r", color: "b" }; nb[0][7] = null; }
    if (fromRow === 0 && fromCol === 4 && toRow === 0 && toCol === 2) { nb[0][3] = { type: "r", color: "b" }; nb[0][0] = null; }
  }

  return nb;
}

// Returns legal destinations for a piece at a given square (fully legal — no moves leaving king in check)
export function getLegalMoves(fen: string, from: Square): Square[] {
  const state = parseFen(fen);
  const piece = getPieceAtSquare(state, from);
  if (!piece || piece.color !== state.activeColor) return [];

  const [fromRow, fromCol] = squareToCoords(from);
  const color = piece.color;
  const opp: PieceColor = color === "w" ? "b" : "w";
  const pseudo: Square[] = [];

  const addIfFree = (r: number, c: number): boolean => {
    if (!isValidSquare(r, c)) return false;
    const t = state.board[r][c];
    if (t && t.color === color) return false;
    pseudo.push(coordsToSquare(r, c));
    return !t;
  };

  const addSliding = (dr: number, dc: number) => {
    let r = fromRow + dr, c = fromCol + dc;
    while (isValidSquare(r, c)) {
      const t = state.board[r][c];
      if (t) { if (t.color !== color) pseudo.push(coordsToSquare(r, c)); break; }
      pseudo.push(coordsToSquare(r, c));
      r += dr; c += dc;
    }
  };

  switch (piece.type) {
    case "p": {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      if (isValidSquare(fromRow + dir, fromCol) && !state.board[fromRow + dir][fromCol]) {
        pseudo.push(coordsToSquare(fromRow + dir, fromCol));
        if (fromRow === startRow && !state.board[fromRow + 2 * dir][fromCol])
          pseudo.push(coordsToSquare(fromRow + 2 * dir, fromCol));
      }
      for (const dc of [-1, 1]) {
        const r = fromRow + dir, c = fromCol + dc;
        if (isValidSquare(r, c)) {
          const t = state.board[r][c];
          if ((t && t.color === opp) || state.enPassant === coordsToSquare(r, c))
            pseudo.push(coordsToSquare(r, c));
        }
      }
      break;
    }
    case "n": {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        addIfFree(fromRow + dr, fromCol + dc);
      break;
    }
    case "b": {
      addSliding(-1,-1); addSliding(-1,1); addSliding(1,-1); addSliding(1,1);
      break;
    }
    case "r": {
      addSliding(-1,0); addSliding(1,0); addSliding(0,-1); addSliding(0,1);
      break;
    }
    case "q": {
      addSliding(-1,-1); addSliding(-1,1); addSliding(1,-1); addSliding(1,1);
      addSliding(-1,0); addSliding(1,0); addSliding(0,-1); addSliding(0,1);
      break;
    }
    case "k": {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        addIfFree(fromRow + dr, fromCol + dc);
      // Castling — king must not be in check, must not pass through attacked square, must not land in check
      if (color === "w" && fromRow === 7 && fromCol === 4 && !isInCheck(state.board, color)) {
        if (state.castling.includes("K") &&
            !state.board[7][5] && !state.board[7][6] && state.board[7][7]?.type === "r" &&
            !isSquareAttackedBy(state.board, 7, 5, opp) && !isSquareAttackedBy(state.board, 7, 6, opp))
          pseudo.push("g1");
        if (state.castling.includes("Q") &&
            !state.board[7][3] && !state.board[7][2] && !state.board[7][1] && state.board[7][0]?.type === "r" &&
            !isSquareAttackedBy(state.board, 7, 3, opp) && !isSquareAttackedBy(state.board, 7, 2, opp))
          pseudo.push("c1");
      }
      if (color === "b" && fromRow === 0 && fromCol === 4 && !isInCheck(state.board, color)) {
        if (state.castling.includes("k") &&
            !state.board[0][5] && !state.board[0][6] && state.board[0][7]?.type === "r" &&
            !isSquareAttackedBy(state.board, 0, 5, opp) && !isSquareAttackedBy(state.board, 0, 6, opp))
          pseudo.push("g8");
        if (state.castling.includes("q") &&
            !state.board[0][3] && !state.board[0][2] && !state.board[0][1] && state.board[0][0]?.type === "r" &&
            !isSquareAttackedBy(state.board, 0, 3, opp) && !isSquareAttackedBy(state.board, 0, 2, opp))
          pseudo.push("c8");
      }
      break;
    }
  }

  // Filter: only keep moves that don't leave own king in check
  return pseudo.filter(to => {
    const [toRow, toCol] = squareToCoords(to as Square);
    const afterBoard = applyMoveOnBoard(
      state.board, fromRow, fromCol, toRow, toCol, state.enPassant
    );
    return !isInCheck(afterBoard, color);
  });
}

// Returns the square of the king that is currently in check, or null
export function getCheckedKingSquare(fen: string): Square | null {
  const state = parseFen(fen);
  const color = state.activeColor;
  const opp: PieceColor = color === "w" ? "b" : "w";
  const kp = findKing(state.board, color);
  if (!kp) return null;
  if (isSquareAttackedBy(state.board, kp[0], kp[1], opp)) {
    return coordsToSquare(kp[0], kp[1]) as Square;
  }
  return null;
}

export function applyMove(fen: string, from: Square, to: Square, promotion: PieceType = "q"): MoveResult | null {
  const state = parseFen(fen);
  const piece = getPieceAtSquare(state, from);
  if (!piece) return null;

  const [fromRow, fromCol] = squareToCoords(from);
  const [toRow, toCol] = squareToCoords(to);

  const newBoard = state.board.map(row => [...row]);
  const captured = newBoard[toRow][toCol];
  let epCapture = false;

  // En passant
  if (piece.type === "p" && to === state.enPassant) {
    const epRow = fromRow;
    newBoard[epRow][toCol] = null;
    epCapture = true;
  }

  newBoard[toRow][toCol] = piece;
  newBoard[fromRow][fromCol] = null;

  // Castling - move rook
  if (piece.type === "k") {
    if (from === "e1" && to === "g1") {
      newBoard[7][5] = { type: "r", color: "w" };
      newBoard[7][7] = null;
    } else if (from === "e1" && to === "c1") {
      newBoard[7][3] = { type: "r", color: "w" };
      newBoard[7][0] = null;
    } else if (from === "e8" && to === "g8") {
      newBoard[0][5] = { type: "r", color: "b" };
      newBoard[0][7] = null;
    } else if (from === "e8" && to === "c8") {
      newBoard[0][3] = { type: "r", color: "b" };
      newBoard[0][0] = null;
    }
  }

  // Promotion
  if (piece.type === "p" && (toRow === 0 || toRow === 7)) {
    newBoard[toRow][toCol] = { type: promotion, color: piece.color };
  }

  // Update castling rights
  let newCastling = state.castling;
  if (piece.type === "k") {
    newCastling = newCastling.replace(piece.color === "w" ? "K" : "k", "").replace(piece.color === "w" ? "Q" : "q", "");
  }
  if (piece.type === "r") {
    if (from === "h1") newCastling = newCastling.replace("K", "");
    if (from === "a1") newCastling = newCastling.replace("Q", "");
    if (from === "h8") newCastling = newCastling.replace("k", "");
    if (from === "a8") newCastling = newCastling.replace("q", "");
  }
  if (!newCastling) newCastling = "-";

  // En passant square
  let newEp = "-";
  if (piece.type === "p" && Math.abs(toRow - fromRow) === 2) {
    const epRow = (fromRow + toRow) / 2;
    newEp = coordsToSquare(epRow, fromCol);
  }

  const newActive: PieceColor = state.activeColor === "w" ? "b" : "w";
  const newHalf = (captured || epCapture || piece.type === "p") ? 0 : state.halfMove + 1;
  const newFull = state.activeColor === "b" ? state.fullMove + 1 : state.fullMove;

  const newFenPos = boardToFenPosition(newBoard);
  const newFen = `${newFenPos} ${newActive} ${newCastling} ${newEp} ${newHalf} ${newFull}`;

  // Build SAN
  const san = buildSan(piece, from, to, captured, epCapture, newBoard, state, promotion);

  return { fen: newFen, san, captured: captured?.type };
}

function buildSan(
  piece: Piece,
  from: Square,
  to: Square,
  captured: Piece | null,
  epCapture: boolean,
  newBoard: (Piece | null)[][],
  state: BoardState,
  promotion: PieceType
): string {
  if (piece.type === "k") {
    if (from === "e1" && to === "g1") return "O-O";
    if (from === "e1" && to === "c1") return "O-O-O";
    if (from === "e8" && to === "g8") return "O-O";
    if (from === "e8" && to === "c8") return "O-O-O";
  }

  let san = "";
  if (piece.type !== "p") {
    san += piece.type.toUpperCase();
  }

  if (captured || epCapture) {
    if (piece.type === "p") san += from[0];
    san += "x";
  }

  san += to;

  if (piece.type === "p" && (to[1] === "8" || to[1] === "1")) {
    san += "=" + promotion.toUpperCase();
  }

  return san;
}

/**
 * Resolve a SAN string (e.g. "Nf3", "exd5", "O-O", "e8=Q") to { from, to, promotion }
 * given the current FEN. Returns null if the move is illegal or unrecognisable.
 */
export function sanToMove(
  fen: string,
  san: string,
): { from: Square; to: Square; promotion?: PieceType } | null {
  const state = parseFen(fen);
  const color = state.activeColor;

  // Strip decorators: check, checkmate, NAG, annotation symbols
  let s = san.replace(/[+#!?]/g, "").replace(/\$\d+/g, "").trim();

  // Castling (both O-O and 0-0 spellings)
  if (s === "O-O-O" || s === "0-0-0") {
    const from: Square = color === "w" ? "e1" : "e8";
    const to: Square  = color === "w" ? "c1" : "c8";
    return { from, to };
  }
  if (s === "O-O" || s === "0-0") {
    const from: Square = color === "w" ? "e1" : "e8";
    const to: Square  = color === "w" ? "g1" : "g8";
    return { from, to };
  }

  // Promotion: e8=Q or e8Q
  let promotion: PieceType | undefined;
  const promMatch = s.match(/=?([QRBNqrbn])$/);
  if (promMatch && s.length > 2) {
    promotion = promMatch[1].toLowerCase() as PieceType;
    s = s.replace(/=?[QRBNqrbn]$/, "");
  }

  // Piece type (uppercase = not pawn)
  let pieceType: PieceType = "p";
  if (/^[KQRBN]/.test(s)) {
    pieceType = s[0].toLowerCase() as PieceType;
    s = s.slice(1);
  }

  // Strip capture marker
  s = s.replace("x", "");

  // Last 2 chars are always the destination square
  if (s.length < 2) return null;
  const to = s.slice(-2) as Square;
  const disambig = s.slice(0, -2); // "", file char, rank char, or full square

  // Collect all pieces of pieceType+color that can legally reach 'to'
  const candidates: Square[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p || p.type !== pieceType || p.color !== color) continue;
      const sq = coordsToSquare(r, c) as Square;
      if (getLegalMoves(fen, sq).includes(to)) candidates.push(sq);
    }
  }

  if (candidates.length === 0) return null;

  let from: Square;
  if (candidates.length === 1) {
    from = candidates[0];
  } else if (disambig.length === 2) {
    // Full square disambiguation (e.g. "d1e4" → from=d1)
    from = disambig as Square;
  } else if (disambig.length === 1) {
    const code = disambig.charCodeAt(0);
    if (code >= 97 && code <= 104) {
      // File letter a-h
      const found = candidates.find(sq => sq[0] === disambig);
      if (!found) return null;
      from = found;
    } else {
      // Rank digit 1-8
      const found = candidates.find(sq => sq[1] === disambig);
      if (!found) return null;
      from = found;
    }
  } else {
    from = candidates[0];
  }

  return { from, to, promotion };
}

/**
 * Strip PGN headers and comments, then return a flat list of SAN tokens.
 * Handles Chess.com exported PGN: multi-line comments, NAG $N, variations (skipped),
 * result tokens, and move numbers.
 */
export function parsePgnToSans(pgn: string): string[] {
  // Remove header tags [Key "Value"]
  let text = pgn.replace(/\[[^\]]*\]/g, "");

  // Remove block comments { ... } — may be multi-line
  text = text.replace(/\{[^}]*\}/g, " ");

  // Remove variations ( ... ) — nested up to 3 levels deep
  for (let i = 0; i < 4; i++) text = text.replace(/\([^()]*\)/g, " ");

  // Remove NAG annotations $N
  text = text.replace(/\$\d+/g, " ");

  // Remove move numbers: "1." "1..." "12."
  text = text.replace(/\d+\.+/g, " ");

  // Normalise whitespace
  text = text.replace(/\s+/g, " ").trim();

  const RESULTS = new Set(["*", "1-0", "0-1", "1/2-1/2"]);
  return text.split(" ").filter(t => t && !RESULTS.has(t));
}

/** @deprecated kept for backwards compatibility */
export function parsePgn(pgn: string): { moves: Array<{ from: string; to: string; san: string; fen: string }> } | null {
  const sans = parsePgnToSans(pgn);
  if (!sans.length) return null;
  return { moves: sans.map(san => ({ from: "", to: "", san, fen: "" })) };
}

