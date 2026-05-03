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
  legalMovesSet: Set<string>;
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
  annotateNode: (nodeId: string, annotation: MoveAnnotation | undefined) => void;
  noteNode: (nodeId: string, note: string) => void;
  currentNote: string;
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
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [promotionSquare, setPromotionSquare] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [showBoardAnnotations, setShowBoardAnnotations] = useState(true);

  // O(1) lookup set — derived from legalMoves array, recomputed only when legalMoves changes
  const legalMovesSet = useMemo(() => new Set(legalMoves), [legalMoves]);

  const toggleBoardAnnotations = useCallback(() => setShowBoardAnnotations(v => !v), []);

  // squareAnnotations: depends only on currentPath + currentNodeId, NOT on the full opening object.
  // This means updateOpening calls during analysis don't trigger a board re-render.
  const squareAnnotations = useMemo<Record<string, { annotation: MoveAnnotation; from: string }>>(() => {
    if (!showBoardAnnotations || !currentNodeId) return {};
    const currentNode = currentPath[currentPath.length - 1];
    if (!currentNode || currentNode.id !== currentNodeId || !currentNode.move.annotation) return {};
    return {
      [currentNode.move.to]: { annotation: currentNode.move.annotation, from: currentNode.move.from },
    };
  }, [currentPath, currentNodeId, showBoardAnnotations]);

  const handleSquarePress = useCallback((sq: string) => {
    if (pendingPromotion) return;

    if (selectedSquare === sq) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (selectedSquare && legalMovesSet.has(sq)) {
      const isWhitePawn = fen.split(" ")[1] === "w";
      const toRank = sq.charCodeAt(1) - "1".charCodeAt(0);

      if (toRank === 7 && isWhitePawn || toRank === 0 && !isWhitePawn) {
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
  }, [selectedSquare, legalMovesSet, fen, opening, currentNodeId, currentPath, addMoveToOpening, pendingPromotion, locked]);

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
    const newPath = currentPath.slice(0, -1);
    const prevNode = newPath[newPath.length - 1] || null;
    setCurrentPath(newPath);
    setCurrentNodeId(prevNode?.id || null);
    setFen(prevNode?.move.fen || opening.rootFen || STARTING_FEN);
    setSelectedSquare(null);
    setLegalMoves([]);
    deleteMoveNode(opening.id, idToDelete);
  }, [opening, currentNodeId, currentPath, deleteMoveNode]);

  // annotateNode: updates the opening tree AND mirrors the annotation into currentPath
  // so squareAnnotations (which reads currentPath) stays in sync without re-reading opening.
  const annotateNode = useCallback((nodeId: string, annotation: MoveAnnotation | undefined) => {
    if (!opening) return;

    function applyAnnotation(nodes: MoveNode[]): MoveNode[] {
      return nodes.map(n => {
        if (n.id === nodeId) return { ...n, move: { ...n.move, annotation } };
        return { ...n, children: applyAnnotation(n.children) };
      });
    }

    updateOpening(opening.id, { moveTree: applyAnnotation(opening.moveTree) });

    // Mirror annotation into currentPath so squareAnnotations updates instantly
    // without waiting for the opening object to propagate through context.
    setCurrentPath(prev =>
      prev.map(n => n.id === nodeId ? { ...n, move: { ...n.move, annotation } } : n)
    );
  }, [opening, updateOpening]);

  // noteNode: saves a free-text note on a move node, persisted via updateOpening.
  const noteNode = useCallback((nodeId: string, note: string) => {
    if (!opening) return;

    function applyNote(nodes: MoveNode[]): MoveNode[] {
      return nodes.map(n => {
        if (n.id === nodeId) return { ...n, note };
        return { ...n, children: applyNote(n.children) };
      });
    }

    updateOpening(opening.id, { moveTree: applyNote(opening.moveTree) });

    // Mirror into currentPath for instant UI update
    setCurrentPath(prev =>
      prev.map(n => n.id === nodeId ? { ...n, note } : n)
    );
  }, [opening, updateOpening]);

  // Derived: note text for the currently selected move
  const currentNote = useMemo(() => {
    if (!currentNodeId || currentPath.length === 0) return "";
    return currentPath[currentPath.length - 1]?.note ?? "";
  }, [currentPath, currentNodeId]);

  const contextValue = useMemo(() => ({
    fen, setFen, flipped, setFlipped,
    selectedSquare, setSelectedSquare,
    legalMoves, legalMovesSet,
    boardTheme, setBoardTheme,
    customLight, customDark, setCustomLight, setCustomDark,
    handleSquarePress, currentPath, currentNodeId,
    goToMove, goBack, goForward, goToStart, goToEnd,
    annotateNode, noteNode, currentNote,
    promotionSquare, pendingPromotion, confirmPromotion, cancelPromotion,
    locked, setLocked, deleteCurrentMove,
    showBoardAnnotations, toggleBoardAnnotations, squareAnnotations,
  }), [
    fen, flipped, selectedSquare, legalMoves, legalMovesSet,
    boardTheme, customLight, customDark,
    handleSquarePress, currentPath, currentNodeId,
    goToMove, goBack, goForward, goToStart, goToEnd,
    annotateNode, noteNode, currentNote,
    promotionSquare, pendingPromotion, confirmPromotion, cancelPromotion,
    locked, deleteCurrentMove, showBoardAnnotations, toggleBoardAnnotations, squareAnnotations,
  ]);

  return (
    <BoardContext.Provider value={contextValue}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used inside BoardProvider");
  return ctx;
}
