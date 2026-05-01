import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Folder, MoveNode, Opening, SortMode, STARTING_FEN, generateId } from "@/types/chess";

const STORAGE_KEY = "@chess_repertoire";
const FOLDERS_KEY = "@chess_folders";
const SORT_KEY = "@chess_sort_mode";

interface RepertoireContextType {
  openings: Opening[];
  folders: Folder[];
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  currentOpeningId: string | null;
  setCurrentOpeningId: (id: string | null) => void;
  addOpening: (name: string, color: Opening["color"], description?: string, folderId?: string | null) => string;
  deleteOpening: (id: string) => void;
  updateOpening: (id: string, updates: Partial<Opening>) => void;
  renameOpening: (id: string, name: string) => void;
  moveOpeningToFolder: (openingId: string, folderId: string | null) => void;
  reorderOpenings: (newIds: string[]) => void;
  addFolder: (name: string) => string;
  deleteFolder: (id: string, deleteContents: boolean) => void;
  renameFolder: (id: string, name: string) => void;
  reorderFolders: (newIds: string[]) => void;
  addMoveToOpening: (openingId: string, parentId: string | null, from: string, to: string, san: string, fen: string) => MoveNode | null;
  deleteMoveNode: (openingId: string, nodeId: string) => void;
  importPgn: (openingId: string, pgn: string) => boolean;
  isLoading: boolean;
}

const RepertoireContext = createContext<RepertoireContextType | null>(null);

export function RepertoireProvider({ children }: { children: React.ReactNode }) {
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sortMode, setSortModeState] = useState<SortMode>("manual");
  const [currentOpeningId, setCurrentOpeningId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(FOLDERS_KEY),
      AsyncStorage.getItem(SORT_KEY),
    ]).then(([openingsData, foldersData, sortData]) => {
      if (openingsData) {
        try { setOpenings(JSON.parse(openingsData)); } catch {}
      }
      if (foldersData) {
        try { setFolders(JSON.parse(foldersData)); } catch {}
      }
      if (sortData) {
        try { setSortModeState(JSON.parse(sortData)); } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const saveOpenings = useCallback((newOpenings: Opening[]) => {
    setOpenings(newOpenings);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newOpenings));
  }, []);

  const saveFolders = useCallback((newFolders: Folder[]) => {
    setFolders(newFolders);
    AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(newFolders));
  }, []);

  const setSortMode = useCallback((mode: SortMode) => {
    setSortModeState(mode);
    AsyncStorage.setItem(SORT_KEY, JSON.stringify(mode));
  }, []);

  const addOpening = useCallback((name: string, color: Opening["color"], description?: string, folderId?: string | null): string => {
    const id = generateId();
    const maxOrder = Math.max(0, ...openings.map(o => o.order ?? 0));
    const opening: Opening = {
      id, name, color, description,
      rootFen: STARTING_FEN,
      moveTree: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folderId: folderId ?? null,
      order: maxOrder + 1,
    };
    saveOpenings([...openings, opening]);
    return id;
  }, [openings, saveOpenings]);

  const deleteOpening = useCallback((id: string) => {
    saveOpenings(openings.filter(o => o.id !== id));
    if (currentOpeningId === id) setCurrentOpeningId(null);
  }, [openings, currentOpeningId, saveOpenings]);

  const updateOpening = useCallback((id: string, updates: Partial<Opening>) => {
    saveOpenings(openings.map(o => o.id === id ? { ...o, ...updates, updatedAt: Date.now() } : o));
  }, [openings, saveOpenings]);

  const renameOpening = useCallback((id: string, name: string) => {
    saveOpenings(openings.map(o => o.id === id ? { ...o, name, updatedAt: Date.now() } : o));
  }, [openings, saveOpenings]);

  const moveOpeningToFolder = useCallback((openingId: string, folderId: string | null) => {
    saveOpenings(openings.map(o => o.id === openingId ? { ...o, folderId, updatedAt: Date.now() } : o));
  }, [openings, saveOpenings]);

  const reorderOpenings = useCallback((newIds: string[]) => {
    const reordered = newIds.map((id, index) => {
      const o = openings.find(op => op.id === id);
      return o ? { ...o, order: index } : null;
    }).filter(Boolean) as Opening[];
    // Include any openings not in newIds
    const missing = openings.filter(o => !newIds.includes(o.id));
    saveOpenings([...reordered, ...missing]);
  }, [openings, saveOpenings]);

  const addFolder = useCallback((name: string): string => {
    const id = generateId();
    const maxOrder = Math.max(0, ...folders.map(f => f.order ?? 0));
    const folder: Folder = { id, name, createdAt: Date.now(), order: maxOrder + 1 };
    saveFolders([...folders, folder]);
    return id;
  }, [folders, saveFolders]);

  const deleteFolder = useCallback((id: string, deleteContents: boolean) => {
    saveFolders(folders.filter(f => f.id !== id));
    if (deleteContents) {
      saveOpenings(openings.filter(o => o.folderId !== id));
    } else {
      saveOpenings(openings.map(o => o.folderId === id ? { ...o, folderId: null } : o));
    }
  }, [folders, openings, saveFolders, saveOpenings]);

  const renameFolder = useCallback((id: string, name: string) => {
    saveFolders(folders.map(f => f.id === id ? { ...f, name } : f));
  }, [folders, saveFolders]);

  const reorderFolders = useCallback((newIds: string[]) => {
    const reordered = newIds.map((id, index) => {
      const f = folders.find(fo => fo.id === id);
      return f ? { ...f, order: index } : null;
    }).filter(Boolean) as Folder[];
    const missing = folders.filter(f => !newIds.includes(f.id));
    saveFolders([...reordered, ...missing]);
  }, [folders, saveFolders]);

  const addMoveToOpening = useCallback((
    openingId: string, parentId: string | null,
    from: string, to: string, san: string, fen: string
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
    saveOpenings(openings.map(o => o.id === openingId ? { ...o, moveTree: newTree, updatedAt: Date.now() } : o));
    return newNode;
  }, [openings, saveOpenings]);

  const deleteMoveNode = useCallback((openingId: string, nodeId: string) => {
    const opening = openings.find(o => o.id === openingId);
    if (!opening) return;
    function removeNode(nodes: MoveNode[]): MoveNode[] {
      return nodes.filter(n => n.id !== nodeId).map(n => ({ ...n, children: removeNode(n.children) }));
    }
    const newTree = removeNode(opening.moveTree);
    saveOpenings(openings.map(o => o.id === openingId ? { ...o, moveTree: newTree, updatedAt: Date.now() } : o));
  }, [openings, saveOpenings]);

  const importPgn = useCallback((openingId: string, pgn: string): boolean => {
    try {
      const opening = openings.find(o => o.id === openingId);
      if (!opening) return false;
      const cleaned = pgn
        .replace(/\{[^}]*\}/g, "").replace(/\([^)]*\)/g, "")
        .replace(/\d+\.\./g, "").replace(/\d+\./g, "")
        .replace(/\s+/g, " ").trim();
      const tokens = cleaned.split(" ").filter(t => t && !["*", "1-0", "0-1", "1/2-1/2"].includes(t));
      if (!tokens.length) return false;
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
          if (currentParentId === null) return [...nodes, newNode];
          return nodes.map(n => {
            if (n.id === currentParentId) return { ...n, children: [...n.children, newNode] };
            return { ...n, children: insertNode(n.children) };
          });
        }
        newOpenings[openingIdx] = { ...newOpenings[openingIdx], moveTree: insertNode(newOpenings[openingIdx].moveTree), updatedAt: Date.now() };
        currentParentId = nodeId;
      }
      saveOpenings(newOpenings);
      return true;
    } catch { return false; }
  }, [openings, saveOpenings]);

  return (
    <RepertoireContext.Provider value={{
      openings, folders, sortMode, setSortMode,
      currentOpeningId, setCurrentOpeningId,
      addOpening, deleteOpening, updateOpening, renameOpening,
      moveOpeningToFolder, reorderOpenings,
      addFolder, deleteFolder, renameFolder, reorderFolders,
      addMoveToOpening, deleteMoveNode, importPgn,
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
