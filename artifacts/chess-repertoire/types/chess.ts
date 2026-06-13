export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceColor = "w" | "b";

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export type Square = string; // e.g. "e4", "d7"

export interface ChessMove {
  from: Square;
  to: Square;
  promotion?: PieceType;
  san: string;
  fen: string;
  annotation?: MoveAnnotation;
  comment?: string;
}

export type MoveAnnotation =
  | "brilliant"    // !!
  | "great"        // !
  | "good"         // ✓
  | "best"         // ★
  | "second_best"  // ✦
  | "book"         // book icon
  | "inaccuracy"   // !?
  | "mistake"      // ?
  | "blunder";     // ??

export const ANNOTATION_SYMBOLS: Record<MoveAnnotation, string> = {
  brilliant: "!!",
  great: "!",
  good: "✓",
  best: "★",
  second_best: "✦",
  book: "📖",
  inaccuracy: "!?",
  mistake: "?",
  blunder: "??",
};

export const ANNOTATION_COLORS: Record<MoveAnnotation, string> = {
  brilliant:   "#1baca6",   // Chess.com teal
  best:        "#5c8a3c",   // Chess.com green
  second_best: "#5c8a3c",   // same green
  great:       "#3b6ea8",   // Chess.com deep blue
  good:        "#97af8b",   // Chess.com light green
  book:        "#c8a45a",   // warm amber
  inaccuracy:  "#f0c865",   // Chess.com yellow
  mistake:     "#e6912c",   // Chess.com orange
  blunder:     "#ca3431",   // Chess.com red
};

export interface MoveNode {
  id: string;
  move: ChessMove;
  children: MoveNode[];
  parentId: string | null;
  note?: string;
}

export interface Opening {
  id: string;
  name: string;
  color: "white" | "black" | "both";
  description?: string;
  rootFen: string;
  moveTree: MoveNode[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  folderId?: string | null;
  order?: number;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  order?: number;
}

export type SortMode = "az" | "za" | "manual";

export interface StockfishEval {
  score: number; // centipawns from white's perspective
  depth: number;
  bestMove: string;
  pv: string[]; // principal variation
  mate: number | null; // null if no forced mate
}

export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: "classic", name: "Classic", lightSquare: "#f0d9b5", darkSquare: "#b58863" },
  { id: "green", name: "Green", lightSquare: "#eeeed2", darkSquare: "#769656" },
  { id: "blue", name: "Blue Ocean", lightSquare: "#dee3e6", darkSquare: "#8ca2ad" },
  { id: "purple", name: "Purple", lightSquare: "#e4d0f5", darkSquare: "#8b4db8" },
  { id: "red", name: "Red", lightSquare: "#f5dada", darkSquare: "#b8374d" },
  { id: "midnight", name: "Midnight", lightSquare: "#c0c0d0", darkSquare: "#4a5568" },
  { id: "coral", name: "Coral", lightSquare: "#fde8d8", darkSquare: "#e07048" },
  { id: "custom", name: "Custom", lightSquare: "#f0d9b5", darkSquare: "#b58863" },
];

export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
