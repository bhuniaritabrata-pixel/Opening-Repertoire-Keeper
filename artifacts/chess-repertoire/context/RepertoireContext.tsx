import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { MoveNode, Opening, STARTING_FEN, generateId } from "@/types/chess";

const STORAGE_KEY = "@chess_repertoire";

interface RepertoireContextType {
  openings: Opening[];
  currentOpeningId: string | null;
  setCurrentOpeningId: (id: string | null) => void;
  addOpening: (name: string, color: Opening["color"], description?: string) => string;
  deleteOpening: (id: string) => void;
  updateOpening: (id: string, updates: Partial<Opening>) => void;
  addMoveToOpening: (openingId: string, parentId: string | null, from: string, to: string, san: string, fen: string) => MoveNode | null;
  deleteMoveNode: (openingId: string, nodeId: string) => void;
  importPgn: (openingId: string, pgn: string) => boolean;
  isLoading: boolean;
}

const RepertoireContext = createContext<RepertoireContextType | null>(null);

export function RepertoireProvider({ children }: { children: React.ReactNode }) {
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [currentOpeningId, setCurrentOpeningId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(data => {
      if (data) {
        try {
          setOpenings(JSON.parse(data));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const save = useCallback((newOpenings: Opening[]) => {
    setOpenings(newOpenings);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newOpenings));
  }, []);

  const addOpening = useCallback((name: string, color: Opening["color"], description?: string): string => {
    const id = generateId();
    const opening: Opening = {
      id,
      name,
      color,
      description,
      rootFen: STARTING_FEN,
      moveTree: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    save([...openings, opening]);
    return id;
  }, [openings, save]);

  const deleteOpening = useCallback((id: string) => {
    save(openings.filter(o => o.id !== id));
    if (currentOpeningId === id) setCurrentOpeningId(null);
  }, [openings, currentOpeningId, save]);

  const updateOpening = useCallback((id: string, updates: Partial<Opening>) => {
    save(openings.map(o => o.id === id ? { ...o, ...updates, updatedAt: Date.now() } : o));
  }, [openings, save]);

  const addMoveToOpening = useCallback((
    openingId: string,
    parentId: string | null,
    from: string,
    to: string,
    san: string,
    fen: string
  ): MoveNode | null => {
    const opening = openings.find(o => o.id === openingId);
    if (!opening) return null;

    const nodeId = generateId();
    const newNode: MoveNode = {
      id: nodeId,
      move: { from, to, san, fen, annotation: undefined, comment: undefined },
      children: [],
      parentId,
    };

    function insertNode(nodes: MoveNode[]): MoveNode[] {
      if (parentId === null) {
        // Check if this exact move already exists at root
        const existing = nodes.find(n => n.move.san === san && n.move.from === from && n.move.to === to);
        if (existing) return nodes;
        return [...nodes, newNode];
      }
      return nodes.map(n => {
        if (n.id === parentId) {
          const existing = n.children.find(c => c.move.san === san && c.move.from === from && c.move.to === to);
          if (existing) return n;
          return { ...n, children: [...n.children, newNode] };
        }
        return { ...n, children: insertNode(n.children) };
      });
    }

    const newTree = insertNode(opening.moveTree);
    save(openings.map(o => o.id === openingId ? { ...o, moveTree: newTree, updatedAt: Date.now() } : o));
    return newNode;
  }, [openings, save]);

  const deleteMoveNode = useCallback((openingId: string, nodeId: string) => {
    const opening = openings.find(o => o.id === openingId);
    if (!opening) return;

    function removeNode(nodes: MoveNode[]): MoveNode[] {
      return nodes
        .filter(n => n.id !== nodeId)
        .map(n => ({ ...n, children: removeNode(n.children) }));
    }

    const newTree = removeNode(opening.moveTree);
    save(openings.map(o => o.id === openingId ? { ...o, moveTree: newTree, updatedAt: Date.now() } : o));
  }, [openings, save]);

  const importPgn = useCallback((openingId: string, pgn: string): boolean => {
    try {
      const opening = openings.find(o => o.id === openingId);
      if (!opening) return false;

      // Parse SAN moves from PGN
      const cleaned = pgn
        .replace(/\{[^}]*\}/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\d+\.\./g, "")
        .replace(/\d+\./g, "")
        .replace(/\s+/g, " ")
        .trim();

      const tokens = cleaned.split(" ").filter(t => t && !["*", "1-0", "0-1", "1/2-1/2"].includes(t));
      if (!tokens.length) return false;

      // We can't easily convert SAN to from/to without a full engine
      // Store as SAN-only nodes for display
      let currentParentId: string | null = null;
      let currentFen = STARTING_FEN;
      const newOpenings = [...openings];
      const openingIdx = newOpenings.findIndex(o => o.id === openingId);
      if (openingIdx === -1) return false;

      for (const san of tokens) {
        const nodeId = generateId();
        const newNode: MoveNode = {
          id: nodeId,
          move: { from: "", to: "", san, fen: currentFen, annotation: undefined, comment: undefined },
          children: [],
          parentId: currentParentId,
        };

        function insertNode(nodes: MoveNode[]): MoveNode[] {
          if (currentParentId === null) {
            return [...nodes, newNode];
          }
          return nodes.map(n => {
            if (n.id === currentParentId) {
              return { ...n, children: [...n.children, newNode] };
            }
            return { ...n, children: insertNode(n.children) };
          });
        }

        newOpenings[openingIdx] = {
          ...newOpenings[openingIdx],
          moveTree: insertNode(newOpenings[openingIdx].moveTree),
          updatedAt: Date.now(),
        };
        currentParentId = nodeId;
      }

      save(newOpenings);
      return true;
    } catch {
      return false;
    }
  }, [openings, save]);

  return (
    <RepertoireContext.Provider value={{
      openings,
      currentOpeningId,
      setCurrentOpeningId,
      addOpening,
      deleteOpening,
      updateOpening,
      addMoveToOpening,
      deleteMoveNode,
      importPgn,
      isLoading,
    }}>
      {children}
    </RepertoireContext.Provider>
  );
}

export function useRepertoire() {
  const ctx = useContext(RepertoireContext);
  if (!ctx) throw new Error("useRepertoire must be used inside RepertoireProvider");
  return ctx;
}
