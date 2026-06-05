import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ChessMove, Line, STARTING_FEN, generateId } from "@/types/chess";

const STORAGE_KEY = "@chess_lines_v2";

interface RepertoireContextType {
  lines: Line[];
  addLine: (name: string, color: Line["color"], startFen?: string, moves?: ChessMove[]) => string;
  deleteLine: (id: string) => void;
  renameLine: (id: string, name: string) => void;
  updateLineMoves: (id: string, moves: ChessMove[]) => void;
  isLoading: boolean;
}

const RepertoireContext = createContext<RepertoireContextType | null>(null);

function persistLines(newLines: Line[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newLines));
}

export function RepertoireProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try { setLines(JSON.parse(data)); } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const addLine = useCallback((
    name: string,
    color: Line["color"] = "white",
    startFen?: string,
    moves: ChessMove[] = [],
  ): string => {
    const id = generateId();
    const newLine: Line = {
      id, name, color,
      moves,
      startFen: startFen || STARTING_FEN,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setLines(prev => {
      const updated = [...prev, newLine];
      persistLines(updated);
      return updated;
    });
    return id;
  }, []);

  const deleteLine = useCallback((id: string) => {
    setLines(prev => {
      const updated = prev.filter(l => l.id !== id);
      persistLines(updated);
      return updated;
    });
  }, []);

  const renameLine = useCallback((id: string, name: string) => {
    setLines(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, name, updatedAt: Date.now() } : l);
      persistLines(updated);
      return updated;
    });
  }, []);

  const updateLineMoves = useCallback((id: string, moves: ChessMove[]) => {
    setLines(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, moves, updatedAt: Date.now() } : l);
      persistLines(updated);
      return updated;
    });
  }, []);

  const ctxValue = useMemo(() => ({
    lines, isLoading,
    addLine, deleteLine, renameLine, updateLineMoves,
  }), [lines, isLoading, addLine, deleteLine, renameLine, updateLineMoves]);

  return (
    <RepertoireContext.Provider value={ctxValue}>
      {children}
    </RepertoireContext.Provider>
  );
}

export function useRepertoire() {
  const ctx = useContext(RepertoireContext);
  if (!ctx) throw new Error("useRepertoire must be used inside RepertoireProvider");
  return ctx;
}
