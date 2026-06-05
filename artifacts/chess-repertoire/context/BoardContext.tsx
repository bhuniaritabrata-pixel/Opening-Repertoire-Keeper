import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BoardTheme, BOARD_THEMES, ChessMove, Line, STARTING_FEN } from "@/types/chess";
import { applyMove, getLegalMoves } from "@/utils/chess";

// ─── Context A: Selection ─────────────────────────────────────────────────────
interface BoardSelectionContextType {
  selectedSquare:    string | null;
  legalMovesSet:     Set<string>;
  handleSquarePress: (sq: string) => void;
  pendingPromotion:  { from: string; to: string } | null;
  promotionSquare:   string | null;
  confirmPromotion:  (piece: string) => void;
  cancelPromotion:   () => void;
}

// ─── Context B: Board / navigation ────────────────────────────────────────────
interface BoardContextType {
  fen:              string;
  flipped:          boolean;
  setFlipped:       (f: boolean) => void;
  boardTheme:       BoardTheme;
  setBoardTheme:    (theme: BoardTheme) => void;
  customLight:      string;
  customDark:       string;
  setCustomLight:   (c: string) => void;
  setCustomDark:    (c: string) => void;
  moves:            ChessMove[];
  currentMoveIndex: number;
  goBack:           () => void;
  goForward:        () => void;
  goToStart:        () => void;
  goToEnd:          () => void;
  isDirty:          boolean;
  squareAnnotations: Record<string, never>;
  showBoardAnnotations: boolean;
  toggleBoardAnnotations: () => void;
}

const BoardContext          = createContext<BoardContextType | null>(null);
const BoardSelectionContext = createContext<BoardSelectionContextType | null>(null);

interface BoardProviderProps {
  children:  React.ReactNode;
  line:      Line | null;
  startFen?: string;
  onMovePlayed?: (moves: ChessMove[]) => void;
}

export function BoardProvider({ children, line, startFen, onMovePlayed }: BoardProviderProps) {
  const effectiveStartFen = line?.startFen || startFen || STARTING_FEN;
  const initialMoves      = line?.moves || [];

  const [moves,            setMoves]            = useState<ChessMove[]>(initialMoves);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(initialMoves.length);
  const [flipped,          setFlipped]          = useState(line?.color === "black");
  const [boardTheme,       setBoardTheme]       = useState<BoardTheme>(BOARD_THEMES[0]);
  const [customLight,      setCustomLight]      = useState("#f0d9b5");
  const [customDark,       setCustomDark]       = useState("#b58863");
  const [isDirty,          setIsDirty]          = useState(false);
  const [showBoardAnnotations, setShowBoardAnnotations] = useState(true);

  const toggleBoardAnnotations = useCallback(() => setShowBoardAnnotations(v => !v), []);

  // Current FEN: start + moves up to currentMoveIndex
  const fen = useMemo(() => {
    if (currentMoveIndex === 0) return effectiveStartFen;
    return moves[currentMoveIndex - 1]?.fen ?? effectiveStartFen;
  }, [moves, currentMoveIndex, effectiveStartFen]);

  // Sync when line changes (e.g. navigating to a different line)
  const lineIdRef = useRef(line?.id);
  useEffect(() => {
    if (line?.id !== lineIdRef.current) {
      lineIdRef.current = line?.id;
      const newMoves = line?.moves || [];
      setMoves(newMoves);
      setCurrentMoveIndex(newMoves.length);
      setIsDirty(false);
    }
  }, [line]);

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedSquare,  setSelectedSquare]  = useState<string | null>(null);
  const [legalMoves,      setLegalMoves]      = useState<string[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [promotionSquare,  setPromotionSquare]  = useState<string | null>(null);

  const legalMovesSet = useMemo(() => new Set(legalMoves), [legalMoves]);

  const playMove = useCallback((from: string, to: string, promotion?: string) => {
    const result = applyMove(fen, from, to, promotion as any);
    if (!result) return;

    setMoves(prev => {
      const truncated = prev.slice(0, currentMoveIndex);
      const move: ChessMove = {
        from, to, san: result.san, fen: result.fen,
        promotion: promotion as any,
      };
      const newMoves = [...truncated, move];
      onMovePlayed?.(newMoves);
      return newMoves;
    });
    setCurrentMoveIndex(prev => prev + 1);
    setIsDirty(true);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [fen, currentMoveIndex, onMovePlayed]);

  const handleSquarePress = useCallback((sq: string) => {
    if (pendingPromotion) return;

    if (selectedSquare === sq) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (selectedSquare && legalMovesSet.has(sq)) {
      const isWhiteTurn = fen.split(" ")[1] === "w";
      const toRank = sq.charCodeAt(1) - "1".charCodeAt(0);
      if ((toRank === 7 && isWhiteTurn) || (toRank === 0 && !isWhiteTurn)) {
        const result = applyMove(fen, selectedSquare, sq, "q");
        if (result && result.san.includes("=")) {
          setPendingPromotion({ from: selectedSquare, to: sq });
          setPromotionSquare(sq);
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
      }
      playMove(selectedSquare, sq);
      return;
    }

    const moves = getLegalMoves(fen, sq);
    if (moves.length > 0) {
      setSelectedSquare(sq);
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [selectedSquare, legalMovesSet, fen, pendingPromotion, playMove]);

  const confirmPromotion = useCallback((piece: string) => {
    if (!pendingPromotion) return;
    playMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
    setPromotionSquare(null);
  }, [pendingPromotion, playMove]);

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setPromotionSquare(null);
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    setCurrentMoveIndex(prev => Math.max(0, prev - 1));
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const goForward = useCallback(() => {
    setCurrentMoveIndex(prev => {
      const maxIdx = moves.length;
      return Math.min(maxIdx, prev + 1);
    });
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [moves.length]);

  const goToStart = useCallback(() => {
    setCurrentMoveIndex(0);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const goToEnd = useCallback(() => {
    setCurrentMoveIndex(moves.length);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [moves.length]);

  // ── Context values ────────────────────────────────────────────────────────
  const boardContextValue = useMemo<BoardContextType>(() => ({
    fen, flipped, setFlipped,
    boardTheme, setBoardTheme,
    customLight, customDark, setCustomLight, setCustomDark,
    moves, currentMoveIndex,
    goBack, goForward, goToStart, goToEnd,
    isDirty,
    squareAnnotations: {},
    showBoardAnnotations,
    toggleBoardAnnotations,
  }), [
    fen, flipped, boardTheme, customLight, customDark,
    moves, currentMoveIndex,
    goBack, goForward, goToStart, goToEnd,
    isDirty, showBoardAnnotations, toggleBoardAnnotations,
  ]);

  const selectionContextValue = useMemo<BoardSelectionContextType>(() => ({
    selectedSquare, legalMovesSet,
    handleSquarePress,
    pendingPromotion, promotionSquare,
    confirmPromotion, cancelPromotion,
  }), [
    selectedSquare, legalMovesSet,
    handleSquarePress,
    pendingPromotion, promotionSquare,
    confirmPromotion, cancelPromotion,
  ]);

  return (
    <BoardContext.Provider value={boardContextValue}>
      <BoardSelectionContext.Provider value={selectionContextValue}>
        {children}
      </BoardSelectionContext.Provider>
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used inside BoardProvider");
  return ctx;
}

export function useBoardSelection() {
  const ctx = useContext(BoardSelectionContext);
  if (!ctx) throw new Error("useBoardSelection must be used inside BoardProvider");
  return ctx;
}
