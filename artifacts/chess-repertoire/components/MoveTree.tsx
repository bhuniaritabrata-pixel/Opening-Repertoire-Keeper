import React, { useMemo } from "react";
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

  const moveList = useMemo(() => {
    let keyCounter = 0;
    const k = () => `mk-${keyCounter++}`;

    /**
     * Render a node and its full subtree into `target`.
     *
     * Main line and variation-block content share the same renderer — the only
     * difference is `isNested` (affects text colour/size) and where the resulting
     * elements are pushed.  Variation blocks are full-width Views pushed into the
     * same `target` array; because the parent uses flexWrap, `width:"100%"` forces
     * them onto their own line while the main-line moves stay inline.
     */
    function renderMoves(
      node: MoveNode,
      moveNum: number,
      isBlack: boolean,
      ancestors: MoveNode[],
      showNum: boolean,   // force-show move number (after a variation block or at start)
      isNested: boolean,  // true when rendering inside a Variation block
      target: React.ReactNode[],
    ) {
      const isCurrent = node.id === currentNodeId;
      const ann = node.move.annotation;
      const annSymbol = ann ? ANNOTATION_SYMBOLS[ann] : "";
      const annColor  = ann ? ANNOTATION_COLORS[ann] : undefined;

      // ── Move number ────────────────────────────────────────────────────────
      if (!isBlack) {
        target.push(
          <Text key={k()} style={[styles.moveNumber, { color: colors.mutedForeground }]}>
            {moveNum}.
          </Text>,
        );
      } else if (showNum || isNested) {
        // Always re-establish context inside variation blocks
        target.push(
          <Text key={k()} style={[styles.moveNumber, { color: colors.mutedForeground }]}>
            {moveNum}…
          </Text>,
        );
      }

      // ── Move button ────────────────────────────────────────────────────────
      target.push(
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
              isNested && styles.variationText,
              {
                color: isCurrent
                  ? colors.primary
                  : isNested
                    ? colors.mutedForeground
                    : colors.foreground,
              },
            ]}
          >
            {node.move.san}
            {annSymbol ? (
              <Text style={{ color: annColor, fontWeight: "700" }}>{annSymbol}</Text>
            ) : null}
          </Text>
        </TouchableOpacity>,
      );

      const nextIsBlack = !isBlack;
      const nextMoveNum = isBlack ? moveNum + 1 : moveNum;
      const hasVariations = node.children.length > 1;
      const newAncestors = [...ancestors, node];

      // ── Variation blocks (children[1..]) ───────────────────────────────────
      // Each variation gets its own labeled section block.  `width:"100%"` on
      // the block View forces a line-break in the parent flex-wrap row.
      if (hasVariations) {
        for (let v = 1; v < node.children.length; v++) {
          const varChild = node.children[v];
          const varEls: React.ReactNode[] = [];
          renderMoves(varChild, nextMoveNum, nextIsBlack, newAncestors, true, true, varEls);

          target.push(
            <View
              key={k()}
              style={[styles.variationBlock, { borderLeftColor: colors.border }]}
            >
              <Text style={[styles.varLabel, { color: colors.mutedForeground }]}>
                Variation
              </Text>
              <View style={styles.varFlow}>
                {varEls}
              </View>
            </View>,
          );
        }
      }

      // ── Main-line continuation ─────────────────────────────────────────────
      if (node.children.length > 0) {
        renderMoves(
          node.children[0],
          nextMoveNum,
          nextIsBlack,
          newAncestors,
          hasVariations, // re-show move number after a variation block
          isNested,
          target,
        );
      }
    }

    const els: React.ReactNode[] = [];
    const fenParts  = (opening.rootFen || STARTING_FEN).split(" ");
    const startNum  = parseInt(fenParts[5] || "1", 10);
    const startBlack = fenParts[1] === "b";

    for (const rootNode of opening.moveTree) {
      renderMoves(rootNode, startNum, startBlack, [], true, false, els);
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
        {moveList}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1 },
  content:  { padding: 12, paddingBottom: 24 },

  // Main-line inline flow
  flowRow:  { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 4 },
  moveNumber: { fontSize: 13, fontWeight: "600", paddingHorizontal: 2 },
  inlineMove: { paddingHorizontal: 5, paddingVertical: 3 },
  moveText:   { fontSize: 14, fontWeight: "500" },

  // Variation section block — width:"100%" breaks it out of the inline flow
  variationBlock: {
    width: "100%",
    marginVertical: 5,
    paddingLeft: 10,
    paddingVertical: 5,
    borderLeftWidth: 2,
  },
  varLabel: {
    fontSize: 11,
    fontStyle: "italic",
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  varFlow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 3,
  },
  variationText: { fontStyle: "italic", fontSize: 13 },

  // Empty state
  empty:     { padding: 20, alignItems: "center" },
  emptyText: { textAlign: "center", lineHeight: 22, fontSize: 14 },
});
