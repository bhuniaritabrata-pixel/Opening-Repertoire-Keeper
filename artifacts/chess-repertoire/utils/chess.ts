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

// Returns legal destinations for a piece at a given square
export function getLegalMoves(fen: string, from: Square): Square[] {
  const state = parseFen(fen);
  const piece = getPieceAtSquare(state, from);
  if (!piece || piece.color !== state.activeColor) return [];

  const [fromRow, fromCol] = squareToCoords(from);
  const destinations: Square[] = [];
  const color = piece.color;
  const opp: PieceColor = color === "w" ? "b" : "w";

  const addIfValid = (r: number, c: number, mustCapture = false): boolean => {
    if (!isValidSquare(r, c)) return false;
    const target = state.board[r][c];
    if (target && target.color === color) return false;
    if (mustCapture && !target) return false;
    if (!mustCapture && target && target.color === opp) {
      destinations.push(coordsToSquare(r, c));
      return false;
    }
    destinations.push(coordsToSquare(r, c));
    return !target;
  };

  const addSliding = (dr: number, dc: number) => {
    let r = fromRow + dr;
    let c = fromCol + dc;
    while (isValidSquare(r, c)) {
      const target = state.board[r][c];
      if (target) {
        if (target.color !== color) destinations.push(coordsToSquare(r, c));
        break;
      }
      destinations.push(coordsToSquare(r, c));
      r += dr;
      c += dc;
    }
  };

  switch (piece.type) {
    case "p": {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      // forward
      if (isValidSquare(fromRow + dir, fromCol) && !state.board[fromRow + dir][fromCol]) {
        destinations.push(coordsToSquare(fromRow + dir, fromCol));
        if (fromRow === startRow && !state.board[fromRow + 2 * dir][fromCol]) {
          destinations.push(coordsToSquare(fromRow + 2 * dir, fromCol));
        }
      }
      // captures
      for (const dc of [-1, 1]) {
        const r = fromRow + dir;
        const c = fromCol + dc;
        if (isValidSquare(r, c)) {
          const target = state.board[r][c];
          if (target && target.color === opp) {
            destinations.push(coordsToSquare(r, c));
          }
          // en passant
          if (state.enPassant === coordsToSquare(r, c)) {
            destinations.push(coordsToSquare(r, c));
          }
        }
      }
      break;
    }
    case "n": {
      const moves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of moves) addIfValid(fromRow + dr, fromCol + dc);
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
      const moves = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      for (const [dr, dc] of moves) addIfValid(fromRow + dr, fromCol + dc);
      // castling (simplified)
      if (color === "w" && fromRow === 7 && fromCol === 4) {
        if (state.castling.includes("K") && !state.board[7][5] && !state.board[7][6] && state.board[7][7]?.type === "r")
          destinations.push("g1");
        if (state.castling.includes("Q") && !state.board[7][3] && !state.board[7][2] && !state.board[7][1] && state.board[7][0]?.type === "r")
          destinations.push("c1");
      }
      if (color === "b" && fromRow === 0 && fromCol === 4) {
        if (state.castling.includes("k") && !state.board[0][5] && !state.board[0][6] && state.board[0][7]?.type === "r")
          destinations.push("g8");
        if (state.castling.includes("q") && !state.board[0][3] && !state.board[0][2] && !state.board[0][1] && state.board[0][0]?.type === "r")
          destinations.push("c8");
      }
      break;
    }
  }

  return destinations;
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

export function parsePgn(pgn: string): { moves: Array<{ from: string; to: string; san: string; fen: string }> } | null {
  try {
    // Very simplified PGN parser - just extracts move text
    const cleaned = pgn
      .replace(/\{[^}]*\}/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\d+\./g, "")
      .replace(/\s+/g, " ")
      .trim();

    const tokens = cleaned.split(" ").filter(t => t && !["*", "1-0", "0-1", "1/2-1/2"].includes(t));
    return { moves: tokens.map(san => ({ from: "", to: "", san, fen: "" })) };
  } catch {
    return null;
  }
}

