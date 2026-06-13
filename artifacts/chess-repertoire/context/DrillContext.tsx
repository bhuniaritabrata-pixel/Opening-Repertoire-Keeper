import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { MoveNode, Opening } from "@/types/chess";
import { applyMove } from "@/utils/chess";
import { buildDrillLines, DrillLine, getPositionsForLine } from "@/utils/drillEngine";

const STATS_KEY = "@drill_stats";

export interface DrillStats {
  totalAttempts: number;
  totalCorrect: number;
  currentStreak: number;
  bestStreak: number;
  lastDrilled?: number;
}

export type DrillPhase =
  | "idle"
  | "player_turn"
  | "opponent_turn"
  | "wrong"
  | "correct"
  | "showing_correct"
  | "complete";

export interface DrillState {
  phase: DrillPhase;
  fen: string;
  flipped: boolean;
  highlightFrom: string | null;
  highlightTo: string | null;
  wrongMove: { from: string; to: string } | null;
  correctMoves: MoveNode[];
  progress: { done: number; total: number };
  stats: DrillStats;
  sessionCorrect: number;
  sessionAttempts: number;
}

interface DrillContextType {
  drillState: DrillState | null;
  startDrill: (opening: Opening) => void;
  submitMove: (from: string, to: string) => void;
  advanceAfterFeedback: () => void;
  endDrill: () => void;
  getLegalMoveTargets: (from: string) => string[];
}

const DrillContext = createContext<DrillContextType | null>(null);

export function useDrill() {
  const ctx = useContext(DrillContext);
  if (!ctx) throw new Error("useDrill must be inside DrillProvider");
  return ctx;
}

interface QueueItem {
  line: DrillLine;
  posIdx: number;
  fen: string;
  expectedNodes: MoveNode[];
  wrongCount: number;
}

function buildQueue(opening: Opening): QueueItem[] {
  const lines = buildDrillLines(opening);
  const items: QueueItem[] = [];

  for (const line of lines) {
    const positions = getPositionsForLine(line, opening.rootFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    for (let i = 0; i < positions.length; i++) {
      items.push({
        line,
        posIdx: i,
        fen: positions[i].fen,
        expectedNodes: positions[i].expectedNodes,
        wrongCount: 0,
      });
    }
  }

  // Shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

import { getLegalMoves } from "@/utils/chess";

export function DrillProvider({ children }: { children: React.ReactNode }) {
  const [drillState, setDrillState] = useState<DrillState | null>(null);
  const [stats, setStats] = useState<DrillStats>({
    totalAttempts: 0,
    totalCorrect: 0,
    currentStreak: 0,
    bestStreak: 0,
  });

  const openingRef    = useRef<Opening | null>(null);
  const queueRef      = useRef<QueueItem[]>([]);
  const retryRef      = useRef<QueueItem[]>([]);
  const sessionStats  = useRef({ correct: 0, attempts: 0 });
  const totalRef      = useRef(0);
  const doneRef       = useRef(0);
  const opponentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STATS_KEY).then(raw => {
      if (raw) {
        try { setStats(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const saveStats = useCallback((s: DrillStats) => {
    setStats(s);
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(s));
  }, []);

  const loadNextPosition = useCallback((
    queue: QueueItem[],
    retry: QueueItem[],
    currentStats: DrillStats,
    sessionCorrect: number,
    sessionAttempts: number,
    opening: Opening,
  ) => {
    const combined = [...queue, ...retry];
    if (combined.length === 0) {
      setDrillState(prev => prev ? ({
        ...prev,
        phase: "complete",
        progress: { done: totalRef.current, total: totalRef.current },
        sessionCorrect,
        sessionAttempts,
      }) : null);
      return;
    }

    const next = combined[0];
    const remaining = combined.slice(1);
    queueRef.current = remaining;
    retryRef.current = [];

    const isFlipped = opening.color === "black";

    setDrillState({
      phase: "player_turn",
      fen: next.fen,
      flipped: isFlipped,
      highlightFrom: null,
      highlightTo: null,
      wrongMove: null,
      correctMoves: next.expectedNodes,
      progress: { done: doneRef.current, total: totalRef.current },
      stats: currentStats,
      sessionCorrect,
      sessionAttempts,
    });

    queueRef.current = remaining;
    retryRef.current = retry;
    // put next item back at front for submitMove to reference
    queueRef.current = [next, ...remaining];
  }, []);

  const startDrill = useCallback((opening: Opening) => {
    if (opponentTimer.current) clearTimeout(opponentTimer.current);
    openingRef.current = opening;
    const queue = buildQueue(opening);
    queueRef.current = queue;
    retryRef.current = [];
    totalRef.current = queue.length;
    doneRef.current = 0;
    sessionStats.current = { correct: 0, attempts: 0 };

    if (queue.length === 0) {
      setDrillState({
        phase: "complete",
        fen: opening.rootFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        flipped: opening.color === "black",
        highlightFrom: null, highlightTo: null,
        wrongMove: null, correctMoves: [],
        progress: { done: 0, total: 0 },
        stats,
        sessionCorrect: 0,
        sessionAttempts: 0,
      });
      return;
    }

    loadNextPosition(queue.slice(1), [], stats, 0, 0, opening);
    queueRef.current = queue;
  }, [stats, loadNextPosition]);

  const submitMove = useCallback((from: string, to: string) => {
    if (!drillState || drillState.phase !== "player_turn") return;
    const opening = openingRef.current;
    if (!opening) return;

    const current = queueRef.current[0];
    if (!current) return;

    const isCorrect = current.expectedNodes.some(
      n => n.move.from === from && n.move.to === to
    );

    const newAttempts = sessionStats.current.attempts + 1;
    sessionStats.current.attempts = newAttempts;

    if (isCorrect) {
      const correctNode = current.expectedNodes.find(n => n.move.from === from && n.move.to === to)!;
      const newCorrect = sessionStats.current.correct + 1;
      sessionStats.current.correct = newCorrect;
      doneRef.current += 1;

      const newStreak = stats.currentStreak + 1;
      const newStats: DrillStats = {
        totalAttempts: stats.totalAttempts + 1,
        totalCorrect: stats.totalCorrect + 1,
        currentStreak: newStreak,
        bestStreak: Math.max(stats.bestStreak, newStreak),
        lastDrilled: Date.now(),
      };
      saveStats(newStats);

      setDrillState(prev => prev ? ({
        ...prev,
        phase: "correct",
        highlightFrom: from,
        highlightTo: to,
        sessionCorrect: newCorrect,
        sessionAttempts: newAttempts,
        stats: newStats,
      }) : null);

      // Auto-play opponent's response after delay, then load next
      opponentTimer.current = setTimeout(() => {
        const opponentNodes = correctNode.children;
        if (opponentNodes.length > 0) {
          const opponentNode = opponentNodes[0];
          const nextFen = opponentNode.move.fen;

          setDrillState(prev => prev ? ({
            ...prev,
            phase: "opponent_turn",
            fen: nextFen,
            highlightFrom: opponentNode.move.from,
            highlightTo: opponentNode.move.to,
          }) : null);

          opponentTimer.current = setTimeout(() => {
            const nextQueue = queueRef.current.slice(1);
            queueRef.current = nextQueue;
            loadNextPosition(nextQueue, retryRef.current, newStats, newCorrect, newAttempts, opening);
          }, 800);
        } else {
          const nextQueue = queueRef.current.slice(1);
          queueRef.current = nextQueue;
          loadNextPosition(nextQueue, retryRef.current, newStats, newCorrect, newAttempts, opening);
        }
      }, 600);

    } else {
      const newStats: DrillStats = {
        totalAttempts: stats.totalAttempts + 1,
        totalCorrect: stats.totalCorrect,
        currentStreak: 0,
        bestStreak: stats.bestStreak,
        lastDrilled: Date.now(),
      };
      saveStats(newStats);

      const updatedItem = { ...current, wrongCount: current.wrongCount + 1 };

      setDrillState(prev => prev ? ({
        ...prev,
        phase: "wrong",
        wrongMove: { from, to },
        highlightFrom: current.expectedNodes[0]?.move.from ?? null,
        highlightTo: current.expectedNodes[0]?.move.to ?? null,
        sessionAttempts: newAttempts,
        stats: newStats,
      }) : null);

      // Add to retry queue at end
      retryRef.current = [...retryRef.current, updatedItem];
    }
  }, [drillState, stats, saveStats, loadNextPosition]);

  const advanceAfterFeedback = useCallback(() => {
    if (!drillState || drillState.phase !== "showing_correct") return;
    const opening = openingRef.current;
    if (!opening) return;
    const nextQueue = queueRef.current.slice(1);
    queueRef.current = nextQueue;
    loadNextPosition(nextQueue, retryRef.current, stats, sessionStats.current.correct, sessionStats.current.attempts, opening);
  }, [drillState, stats, loadNextPosition]);

  const endDrill = useCallback(() => {
    if (opponentTimer.current) clearTimeout(opponentTimer.current);
    setDrillState(null);
    openingRef.current = null;
    queueRef.current = [];
    retryRef.current = [];
  }, []);

  const getLegalMoveTargets = useCallback((from: string): string[] => {
    if (!drillState) return [];
    return getLegalMoves(drillState.fen, from);
  }, [drillState]);

  return (
    <DrillContext.Provider value={{ drillState, startDrill, submitMove, advanceAfterFeedback, endDrill, getLegalMoveTargets }}>
      {children}
    </DrillContext.Provider>
  );
}
