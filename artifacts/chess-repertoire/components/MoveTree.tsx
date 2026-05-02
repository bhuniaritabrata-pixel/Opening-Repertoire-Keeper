import React, { useCallback } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ANNOTATION_COLORS, ANNOTATION_SYMBOLS, MoveNode, Opening, STARTING_FEN } from "@/types/chess";
import { useBoard } from "@/context/BoardContext";
import { useColors } from "@/hooks/useColors";

interface MoveTreeProps {
  opening: Opening;
}

export default function MoveTree({ opening }: MoveTreeProps) {
  const colors = useColors();
  const { currentNodeId, goToMove } = useBoard();

  const renderMoveList = useCallback(() => {
    let keyCounter = 0;
    const k = () => `mk-${keyCounter++}`;
    const els: React.ReactNode[] = [];

    /**
     * Recursively walk a single node and its subtree, pushing inline elements
     * into `els`.
     *
     * @param node        The current move node
     * @param moveNum     The full-move number (increments after Black's move)
     * @param isBlack     True when this node is a Black move
     * @param ancestors   All nodes from root up to (but not including) this node
     * @param showNum     Force-show the move number even for a Black move
     *                    (needed at the start of a variation or after one closes)
     * @param isNested    True when we are inside a variation (affects text style)
     */
    function walk(
      node: MoveNode,
      moveNum: number,
      isBlack: boolean,
      ancestors: MoveNode[],
      showNum: boolean,
      isNested: boolean,
    ) {
      const isCurrent = node.id === currentNodeId;
      const ann = node.move.annotation;
      const annSymbol = ann ? ANNOTATION_SYMBOLS[ann] : "";
      const annColor = ann ? ANNOTATION_COLORS[ann] : undefined;

      // ── Move number ──────────────────────────────────────────────────────
      if (!isBlack) {
        els.push(
          <Text key={k()} style={[styles.moveNumber, { color: colors.mutedForeground }]}>
            {moveNum}.
          </Text>,
        );
      } else if (showNum) {
        // Black's move but we need to re-establish context (e.g. after a variation)
        els.push(
          <Text key={k()} style={[styles.moveNumber, { color: colors.mutedForeground }]}>
            {moveNum}…
          </Text>,
        );
      }

      // ── Move token ───────────────────────────────────────────────────────
      els.push(
        <TouchableOpacity
          key={node.id}
          onPress={() => goToMove(node, [...ancestors, node])}
          style={[
            styles.inlineMove,
            isCurrent && { backgroundColor: colors.primary + "33", borderRadius: 4 },
          ]}
        >
          <Text
            style={[
              styles.moveText,
              {
                color: isCurrent
                  ? colors.primary
                  : isNested
                    ? colors.mutedForeground
                    : colors.foreground,
              },
              isNested && styles.variationText,
            ]}
          >
            {node.move.san}
            {annSymbol ? (
              <Text style={{ color: annColor, fontWeight: "700" }}>{annSymbol}</Text>
            ) : null}
          </Text>
        </TouchableOpacity>,
      );

      // Context for children
      const nextIsBlack = !isBlack;
      const nextMoveNum = isBlack ? moveNum + 1 : moveNum;
      const hasVariations = node.children.length > 1;
      const newAncestors = [...ancestors, node];

      // ── Inline variations (children[1..]) ────────────────────────────────
      // Each variation is wrapped in ( … ) and rendered inline with correct numbering.
      for (let v = 1; v < node.children.length; v++) {
        const varChild = node.children[v];
        els.push(
          <Text key={k()} style={[styles.varParen, { color: colors.mutedForeground }]}>
            {" ("}
          </Text>,
        );
        // The variation starts at the same point as the main continuation,
        // so always show the move number (showNum=true) since we're resuming mid-game.
        walk(varChild, nextMoveNum, nextIsBlack, newAncestors, true, true);
        els.push(
          <Text key={k()} style={[styles.varParen, { color: colors.mutedForeground }]}>
            {")" }
          </Text>,
        );
      }

      // ── Main-line continuation ────────────────────────────────────────────
      if (node.children.length > 0) {
        walk(
          node.children[0],
          nextMoveNum,
          nextIsBlack,
          newAncestors,
          // After showing a variation we need to re-print the move number
          // for the main-line move so the reader knows where we are.
          hasVariations,
          isNested,
        );
      }
    }

    // Determine starting move number and colour from the root FEN
    const fenParts = (opening.rootFen || STARTING_FEN).split(" ");
    const startMoveNum = parseInt(fenParts[5] || "1", 10);
    const startIsBlack = fenParts[1] === "b";

    for (const rootNode of opening.moveTree) {
      // Always show the number for the very first move
      walk(rootNode, startMoveNum, startIsBlack, [], true, false);
    }

    return els;
  }, [currentNodeId, goToMove, colors, opening]);

  if (opening.moveTree.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No moves recorded yet.{"\n"}Make moves on the board to record them.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.flowRow}>
        {renderMoveList()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 24,
  },
  flowRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 4,
  },
  moveNumber: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 2,
  },
  inlineMove: {
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  moveText: {
    fontSize: 14,
    fontWeight: "500",
  },
  variationText: {
    fontStyle: "italic",
    fontSize: 13,
  },
  varParen: {
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 22,
    fontSize: 14,
  },
});
