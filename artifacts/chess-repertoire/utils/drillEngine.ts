import { MoveNode, Opening } from "@/types/chess";

export interface DrillLine {
  nodes: MoveNode[];
  playerColor: "w" | "b";
}

export interface DrillPosition {
  lineIndex: number;
  moveIndex: number;
  fen: string;
  expectedNodes: MoveNode[];
  isPlayerTurn: boolean;
}

function collectLines(nodes: MoveNode[], path: MoveNode[] = []): MoveNode[][] {
  const lines: MoveNode[][] = [];
  for (const node of nodes) {
    const newPath = [...path, node];
    if (node.children.length === 0) {
      lines.push(newPath);
    } else {
      lines.push(...collectLines(node.children, newPath));
    }
  }
  return lines;
}

export function buildDrillLines(opening: Opening): DrillLine[] {
  const playerColor: "w" | "b" =
    opening.color === "black" ? "b" : "w";

  const rawLines = collectLines(opening.moveTree);

  return rawLines.map(nodes => ({ nodes, playerColor }));
}

export function getPositionsForLine(
  line: DrillLine,
  rootFen: string,
): DrillPosition[] {
  const positions: DrillPosition[] = [];
  let fen = rootFen;

  for (let i = 0; i < line.nodes.length; i++) {
    const node = line.nodes[i];
    const isPlayerTurn = node.move.fen.split(" ")[1] !== line.playerColor;

    if (!isPlayerTurn) {
      fen = node.move.fen;
      continue;
    }

    const siblingsAtSameParent: MoveNode[] = [];
    if (i === 0) {
      siblingsAtSameParent.push(node);
    } else {
      const parentNode = line.nodes[i - 1];
      siblingsAtSameParent.push(...parentNode.children);
    }

    positions.push({
      lineIndex: 0,
      moveIndex: i,
      fen,
      expectedNodes: siblingsAtSameParent,
      isPlayerTurn: true,
    });

    fen = node.move.fen;
  }

  return positions;
}
