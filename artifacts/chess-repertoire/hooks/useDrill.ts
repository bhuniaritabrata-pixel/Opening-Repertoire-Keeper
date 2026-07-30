import { useCallback, useEffect, useRef, useState } from "react";
import { MoveNode, Opening, STARTING_FEN } from "@/types/chess";
import { getLegalMoves } from "@/utils/chess";

export type DrillPhase =
  | "opponent_intro" // opponent is auto-playing the very first move of the line
  | "player_turn"
  | "opponent_turn"
  | "wrong"
  | "complete";

export interface DrillHighlight {
  from: string;
  to: string;
}

export interface DrillSnapshot {
  phase: DrillPhase;
  fen: string;
  flipped: boolean;
  lastMove: DrillHighlight | null;
  wrongAttempt: DrillHighlight | null;
  hint: DrillHighlight | null;
  mistakes: number;
  attempts: number;
  correct: number;
}

/** Picks the MoveNode with the lowest drillCount. Ties broken randomly. */
function pickLeastPracticed(arr: MoveNode[]): MoveNode {
  const min = Math.min(...arr.map(n => n.drillCount ?? 0));
  const candidates = arr.filter(n => (n.drillCount ?? 0) === min);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function makeInitialSnapshot(opening: Opening | null): DrillSnapshot {
  return {
    phase: "player_turn",
    fen: opening?.rootFen || STARTING_FEN,
    flipped: opening?.color === "black",
    lastMove: null,
    wrongAttempt: null,
    hint: null,
    mistakes: 0,
    attempts: 0,
    correct: 0,
  };
}

/**
 * Clean, self-contained drill state machine, deliberately kept out of React
 * Context — a chess drill only ever has one active consumer (the drill
 * screen), so a plain hook avoids the provider/consumer bugs the previous
 * implementation had.
 *
 * Walks the opening's move tree one ply at a time:
 *  - If it's the opponent's move, a branch is chosen at random (if there are
 *    multiple recorded replies) and auto-played after a short delay.
 *  - If it's the player's move, any move that matches ANY recorded child is
 *    accepted (fork support) — the drill locks onto whichever branch the
 *    player actually plays.
 *  - Reaching a node with no children ends the line ("Line Cleared!").
 *
 * `phaseRef` / `currentNodeRef` mirror the latest snapshot synchronously so
 * `submitMove` (called directly from a tap handler, not from inside a state
 * updater) never reasons about stale state.
 */
export function useDrill(opening: Opening | null, onNodeDrilled?: (nodeId: string) => void) {
  const [snapshot, setSnapshot] = useState<DrillSnapshot>(() => makeInitialSnapshot(opening));

  const snapshotRef = useRef(snapshot);
  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);

  const currentNodeRef = useRef<MoveNode | null>(null);
  const opponentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerColorRef = useRef<"w" | "b">("w");

  const clearOpponentTimer = useCallback(() => {
    if (opponentTimer.current) {
      clearTimeout(opponentTimer.current);
      opponentTimer.current = null;
    }
  }, []);

  // Advances the drill by one ply after `node` has just been played. Decides
  // whether the line is complete, whether the player moves next, or whether
  // the opponent should auto-play a (possibly randomly chosen) reply.
  const advance = useCallback((node: MoveNode) => {
    currentNodeRef.current = node;

    if (node.children.length === 0) {
      setSnapshot(prev => ({
        ...prev,
        phase: "complete",
        fen: node.move.fen,
        lastMove: { from: node.move.from, to: node.move.to },
        hint: null,
        wrongAttempt: null,
      }));
      return;
    }

    const nextTurn = node.move.fen.split(" ")[1]; // whose turn it is AFTER this move
    if (nextTurn === playerColorRef.current) {
      setSnapshot(prev => ({
        ...prev,
        phase: "player_turn",
        fen: node.move.fen,
        lastMove: { from: node.move.from, to: node.move.to },
        hint: null,
        wrongAttempt: null,
      }));
      return;
    }

    setSnapshot(prev => ({
      ...prev,
      phase: "opponent_turn",
      fen: node.move.fen,
      lastMove: { from: node.move.from, to: node.move.to },
      hint: null,
      wrongAttempt: null,
    }));

    const chosen = pickLeastPracticed(node.children);
    onNodeDrilled?.(chosen.id);
    opponentTimer.current = setTimeout(() => {
      opponentTimer.current = null;
      advance(chosen);
    }, 200);
  }, [onNodeDrilled]);

  const start = useCallback(() => {
    clearOpponentTimer();
    if (!opening) return;

    const playerColor: "w" | "b" = opening.color === "black" ? "b" : "w";
    playerColorRef.current = playerColor;
    currentNodeRef.current = null;

    const rootFen = opening.rootFen || STARTING_FEN;
    const rootTurn = rootFen.split(" ")[1];
    const hasMoves = opening.moveTree.length > 0;

    setSnapshot({
      phase: !hasMoves ? "complete" : rootTurn === playerColor ? "player_turn" : "opponent_intro",
      fen: rootFen,
      flipped: playerColor === "b",
      lastMove: null,
      wrongAttempt: null,
      hint: null,
      mistakes: 0,
      attempts: 0,
      correct: 0,
    });

    if (hasMoves && rootTurn !== playerColor) {
      const chosen = pickLeastPracticed(opening.moveTree);
      onNodeDrilled?.(chosen.id);
      opponentTimer.current = setTimeout(() => {
        opponentTimer.current = null;
        advance(chosen);
      }, 200);
    }
  }, [opening, clearOpponentTimer, advance, onNodeDrilled]);

  const submitMove = useCallback((from: string, to: string) => {
    if (!opening || snapshotRef.current.phase !== "player_turn") return;

    const expectedNodes = currentNodeRef.current ? currentNodeRef.current.children : opening.moveTree;
    const match = expectedNodes.find(n => n.move.from === from && n.move.to === to);

    if (match) {
      setSnapshot(prev => ({ ...prev, attempts: prev.attempts + 1, correct: prev.correct + 1 }));
      advance(match);
    } else {
      setSnapshot(prev => ({
        ...prev,
        phase: "wrong",
        attempts: prev.attempts + 1,
        mistakes: prev.mistakes + 1,
        wrongAttempt: { from, to },
      }));
    }
  }, [opening, advance]);

  const retry = useCallback(() => {
    setSnapshot(prev => (prev.phase === "wrong" ? { ...prev, phase: "player_turn", wrongAttempt: null } : prev));
  }, []);

  const showHint = useCallback(() => {
    if (!opening) return;
    const expectedNodes = currentNodeRef.current ? currentNodeRef.current.children : opening.moveTree;
    if (expectedNodes.length === 0) return;
    const hintNode = expectedNodes[0];
    setSnapshot(prev => ({
      ...prev,
      phase: "player_turn",
      wrongAttempt: null,
      hint: { from: hintNode.move.from, to: hintNode.move.to },
    }));
  }, [opening]);

  const getLegalMoveTargets = useCallback((from: string): string[] => {
    return getLegalMoves(snapshotRef.current.fen, from);
  }, []);

  const stop = useCallback(() => {
    clearOpponentTimer();
  }, [clearOpponentTimer]);

  return { snapshot, start, submitMove, retry, showHint, getLegalMoveTargets, stop };
}
