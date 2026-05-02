import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { BoardTheme, BOARD_THEMES, MoveAnnotation, MoveNode, Opening, STARTING_FEN } from "@/types/chess";
import { applyMove, getLegalMoves } from "@/utils/chess";
import { useRepertoire } from "@/context/RepertoireContext";

function findNodeById(nodes: MoveNode[], id: string | null): MoveNode | null {
  if (!id) return null;
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNodeById(n.children, id);
    if (found) return found;
  }
  return null;
}

interface BoardContextType {
  fen: string;
  setFen: (fen: string) => void;
  flipped: boolean;
  setFlipped: (f: boolean) => void;
  selectedSquare: string | null;
  setSelectedSquare: (sq: string | null) => void;
  legalMoves: string[];
  boardTheme: BoardTheme;
  setBoardTheme: (theme: BoardTheme) => void;
  customLight: string;
  customDark: string;
  setCustomLight: (c: string) => void;
  setCustomDark: (c: string) => void;
  handleSquarePress: (sq: string) => void;
  currentPath: MoveNode[];
  currentNodeId: string | null;
  goToMove: (node: MoveNode | null, path: MoveNode[]) => void;
  goBack: () => void;
  goForward: (childIndex?: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  analysisEnabled: boolean;
  setAnalysisEnabled: (e: boolean) => void;
  evaluation: number | null;
  setEvaluation: (e: number | null) => void;
  bestMoves: string[];
  setBestMoves: (m: string[]) => void;
  evalDepth: number;
  setEvalDepth: (d: number) => void;
  mateIn: number | null;
  setMateIn: (m: number | null) => void;
  annotateNode: (nodeId: string, annotation: MoveAnnotation | undefined) => void;
  promotionSquare: string | null;
  pendingPromotion: { from: string; to: string } | null;
  confirmPromotion: (piece: string) => void;
  cancelPromotion: () => void;
  locked: boolean;
  setLocked: (l: boolean) => void;
  deleteCurrentMove: () => void;
  showBoardAnnotations: boolean;
  toggleBoardAnnotations: () => void;
  squareAnnotations: Record<string, { annotation: MoveAnnotation; from: string }>;
}

const BoardContext = createContext<BoardContextType | null>(null);

interface BoardProviderProps {
  children: React.ReactNode;
  opening: Opening | null;
}

export function BoardProvider({ children, opening }: BoardProviderProps) {
  const { addMoveToOpening, updateOpening, deleteMoveNode } = useRepertoire();
  const [fen, setFen] = useState(opening?.rootFen || STARTING_FEN);
  const [flipped, setFlipped] = useState(opening?.color === "black");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(BOARD_THEMES[0]);
  const [customLight, setCustomLight] = useState("#f0d9b5");
  const [customDark, setCustomDark] = useState("#b58863");
  const [currentPath, setCurrentPath] = useState<MoveNode[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const [bestMoves, setBestMoves] = useState<string[]>([]);
  const [evalDepth, setEvalDepth] = useState(5);
  const [mateIn, setMateIn] = useState<number | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [promotionSquare, setPromotionSquare] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [showBoardAnnotations, setShowBoardAnnotations] = useState(true);

  const toggleBoardAnnotations = useCallback(() => setShowBoardAnnotations(v => !v), []);

  // Show annotation badge on the destination square of the current move (the move you are viewing)
  const squareAnnotations = useMemo<Record<string, { annotation: MoveAnnotation; from: string }>>(() => {
    if (!showBoardAnnotations || !opening || !currentNodeId) return {};
    const currentNode = findNodeById(opening.moveTree, currentNodeId);
    if (!currentNode?.move.annotation) return {};
    return {
      [currentNode.move.to]: { annotation: currentNode.move.annotation, from: currentNode.move.from },
    };
  }, [opening, currentNodeId, showBoardAnnotations]);

  const handleSquarePress = useCallback((sq: string) => {
    if (pendingPromotion) return;

    if (selectedSquare === sq) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (selectedSquare && legalMoves.includes(sq)) {
      // Check if promotion
      const isWhitePawn = fen.split(" ")[1] === "w";
      const toRank = sq.charCodeAt(1) - "1".charCodeAt(0);

      if (toRank === 7 && isWhitePawn || toRank === 0 && !isWhitePawn) {
        // Need to verify it's actually a pawn
        const result = applyMove(fen, selectedSquare, sq, "q");
        if (result && result.san.includes("=")) {
          setPendingPromotion({ from: selectedSquare, to: sq });
          setPromotionSquare(sq);
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
      }

      const result = applyMove(fen, selectedSquare, sq);
      if (result) {
        setFen(result.fen);
        setSelectedSquare(null);
        setLegalMoves([]);

        if (opening && !locked) {
          const newNode = addMoveToOpening(opening.id, currentNodeId, selectedSquare, sq, result.san, result.fen);
          if (newNode) {
            setCurrentPath([...currentPath, newNode]);
            setCurrentNodeId(newNode.id);
          }
        }
      }
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
  }, [selectedSquare, legalMoves, fen, opening, currentNodeId, currentPath, addMoveToOpening, pendingPromotion, locked]);

  const confirmPromotion = useCallback((piece: string) => {
    if (!pendingPromotion) return;
    const result = applyMove(fen, pendingPromotion.from, pendingPromotion.to, piece as any);
    if (result) {
      setFen(result.fen);
      if (opening && !locked) {
        const newNode = addMoveToOpening(opening.id, currentNodeId, pendingPromotion.from, pendingPromotion.to, result.san, result.fen);
        if (newNode) {
          setCurrentPath([...currentPath, newNode]);
          setCurrentNodeId(newNode.id);
        }
      }
    }
    setPendingPromotion(null);
    setPromotionSquare(null);
  }, [pendingPromotion, fen, opening, currentNodeId, currentPath, addMoveToOpening, locked]);

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setPromotionSquare(null);
  }, []);

  const goToMove = useCallback((node: MoveNode | null, path: MoveNode[]) => {
    if (node) {
      setFen(node.move.fen || STARTING_FEN);
      setCurrentPath(path);
      setCurrentNodeId(node.id);
    } else {
      setFen(opening?.rootFen || STARTING_FEN);
      setCurrentPath([]);
      setCurrentNodeId(null);
    }
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [opening]);

  const goBack = useCallback(() => {
    if (currentPath.length === 0) return;
    const newPath = currentPath.slice(0, -1);
    const prevNode = newPath[newPath.length - 1] || null;
    setCurrentPath(newPath);
    setCurrentNodeId(prevNode?.id || null);
    setFen(prevNode?.move.fen || opening?.rootFen || STARTING_FEN);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [currentPath, opening]);

  const goForward = useCallback((childIndex = 0) => {
    if (!opening) return;

    if (currentNodeId === null) {
      const firstMove = opening.moveTree[0];
      if (firstMove) {
        setCurrentPath([firstMove]);
        setCurrentNodeId(firstMove.id);
        setFen(firstMove.move.fen || STARTING_FEN);
      }
      return;
    }

    const currentNode = findNodeById(opening.moveTree, currentNodeId);
    if (currentNode && currentNode.children.length > 0) {
      const child = currentNode.children[childIndex] || currentNode.children[0];
      setCurrentPath([...currentPath, child]);
      setCurrentNodeId(child.id);
      setFen(child.move.fen || STARTING_FEN);
    }
  }, [currentNodeId, currentPath, opening]);

  const goToStart = useCallback(() => {
    setFen(opening?.rootFen || STARTING_FEN);
    setCurrentPath([]);
    setCurrentNodeId(null);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [opening]);

  const goToEnd = useCallback(() => {
    if (!opening) return;
    let nodes = opening.moveTree;
    const path: MoveNode[] = [];
    while (nodes.length > 0) {
      const node = nodes[0];
      path.push(node);
      nodes = node.children;
    }
    if (path.length > 0) {
      const last = path[path.length - 1];
      setCurrentPath(path);
      setCurrentNodeId(last.id);
      setFen(last.move.fen || STARTING_FEN);
    }
  }, [opening]);

  const deleteCurrentMove = useCallback(() => {
    if (!opening || !currentNodeId) return;
    const idToDelete = currentNodeId;
    // Step back to the previous position first so the board stays valid
    const newPath = currentPath.slice(0, -1);
    const prevNode = newPath[newPath.length - 1] || null;
    setCurrentPath(newPath);
    setCurrentNodeId(prevNode?.id || null);
    setFen(prevNode?.move.fen || opening.rootFen || STARTING_FEN);
    setSelectedSquare(null);
    setLegalMoves([]);
    deleteMoveNode(opening.id, idToDelete);
  }, [opening, currentNodeId, currentPath, deleteMoveNode]);

  const annotateNode = useCallback((nodeId: string, annotation: MoveAnnotation | undefined) => {
    if (!opening) return;

    function annotate(nodes: MoveNode[]): MoveNode[] {
      return nodes.map(n => {
        if (n.id === nodeId) return { ...n, move: { ...n.move, annotation } };
        return { ...n, children: annotate(n.children) };
      });
    }

    updateOpening(opening.id, { moveTree: annotate(opening.moveTree) });
  }, [opening, updateOpening]);

  return (
    <BoardContext.Provider value={{
      fen, setFen, flipped, setFlipped,
      selectedSquare, setSelectedSquare,
      legalMoves, boardTheme, setBoardTheme,
      customLight, customDark, setCustomLight, setCustomDark,
      handleSquarePress, currentPath, currentNodeId,
      goToMove, goBack, goForward, goToStart, goToEnd,
      analysisEnabled, setAnalysisEnabled,
      evaluation, setEvaluation, bestMoves, setBestMoves,
      evalDepth, setEvalDepth, mateIn, setMateIn,
      annotateNode,
      promotionSquare, pendingPromotion, confirmPromotion, cancelPromotion,
      locked, setLocked, deleteCurrentMove,
      showBoardAnnotations, toggleBoardAnnotations, squareAnnotations,
    }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used inside BoardProvider");
  return ctx;
}
