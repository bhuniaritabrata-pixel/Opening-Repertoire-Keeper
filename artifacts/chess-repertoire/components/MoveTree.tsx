import React, { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ANNOTATION_COLORS, ANNOTATION_SYMBOLS, MoveNode, Opening, STARTING_FEN } from "@/types/chess";
import { useBoard } from "@/context/BoardContext";
import { useColors } from "@/hooks/useColors";

interface MoveTreeProps {
  opening: Opening;
}

// memo: only re-renders when `opening` or `currentNodeId` changes — NOT on
// piece selection taps (those only update BoardSelectionContext).
export default memo(function MoveTree({ opening }: MoveTreeProps) {
  const colors      = useColors();
  const { currentNodeId, goToMove } = useBoard();

  // Destructure stable color values so the moveList useMemo dep array is flat
  // scalars rather than the whole `colors` object reference.
  const { mutedForeground, primary, foreground } = colors;

  const moveList = useMemo(() => {
    let keyCounter = 0;
    const k = () => `mk-${keyCounter++}`;

    function renderMoves(
      node:       MoveNode,
      moveNum:    number,
      isBlack:    boolean,
      ancestors:  MoveNode[],
      showNum:    boolean,
      isNested:   boolean,
      target:     React.ReactNode[],
    ) {
      const isCurrent = node.id === currentNodeId;
      const ann       = node.move.annotation;
      const annSymbol = ann ? ANNOTATION_SYMBOLS[ann] : "";
      const annColor  = ann ? ANNOTATION_COLORS[ann] : undefined;

      if (!isBlack) {
        target.push(
          <Text key={k()} style={[styles.moveNumber, { color: mutedForeground }]}>
            {moveNum}.
          </Text>,
        );
      } else if (showNum || isNested) {
        target.push(
          <Text key={k()} style={[styles.moveNumber, { color: mutedForeground }]}>
            {moveNum}…
          </Text>,
        );
      }

      target.push(
        <TouchableOpacity
          key={node.id}
          onPress={() => goToMove(node, [...ancestors, node])}
          style={[styles.inlineMove, isCurrent && { backgroundColor: primary + "33", borderRadius: 4 }]}
        >
          <Text
            style={[
              styles.moveText,
              isNested && styles.variationText,
              { color: isCurrent ? primary : isNested ? mutedForeground : foreground },
            ]}
          >
            {node.move.san}
            {annSymbol ? (
              <Text style={{ color: annColor, fontWeight: "700" }}>{annSymbol}</Text>
            ) : null}
          </Text>
        </TouchableOpacity>,
      );

      const nextIsBlack   = !isBlack;
      const nextMoveNum   = isBlack ? moveNum + 1 : moveNum;
      const hasVariations = node.children.length > 1;
      const newAncestors  = [...ancestors, node];

      if (hasVariations) {
        for (let v = 1; v < node.children.length; v++) {
          const varChild = node.children[v];
          const varEls: React.ReactNode[] = [];
          renderMoves(varChild, nextMoveNum, nextIsBlack, newAncestors, true, true, varEls);
          target.push(
            <View key={k()} style={[styles.variationBlock, { borderLeftColor: colors.border }]}>
              <Text style={[styles.varLabel, { color: mutedForeground }]}>Variation</Text>
              <View style={styles.varFlow}>{varEls}</View>
            </View>,
          );
        }
      }

      if (node.children.length > 0) {
        renderMoves(node.children[0], nextMoveNum, nextIsBlack, newAncestors, hasVariations, isNested, target);
      }
    }

    const els        = [] as React.ReactNode[];
    const fenParts   = (opening.rootFen || STARTING_FEN).split(" ");
    const startNum   = parseInt(fenParts[5] || "1", 10);
    const startBlack = fenParts[1] === "b";
    for (const rootNode of opening.moveTree) {
      renderMoves(rootNode, startNum, startBlack, [], true, false, els);
    }
    return els;
  }, [currentNodeId, goToMove, mutedForeground, primary, foreground, colors.border, opening]);

  if (opening.moveTree.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: mutedForeground }]}>
          No moves recorded yet.{"\n"}Make moves on the board to record them.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.flowRow}>{moveList}</View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll:   { flex: 1 },
  content:  { padding: 12, paddingBottom: 24 },
  flowRow:  { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 4 },
  moveNumber:  { fontSize: 13, fontWeight: "600", paddingHorizontal: 2 },
  inlineMove:  { paddingHorizontal: 5, paddingVertical: 3 },
  moveText:    { fontSize: 14, fontWeight: "500" },
  variationBlock: {
    width: "100%", marginVertical: 5, paddingLeft: 10, paddingVertical: 5, borderLeftWidth: 2,
  },
  varLabel: {
    fontSize: 11, fontStyle: "italic", fontWeight: "700",
    letterSpacing: 0.3, marginBottom: 4, textTransform: "uppercase",
  },
  varFlow:        { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 3 },
  variationText:  { fontStyle: "italic", fontSize: 13 },
  empty:          { padding: 20, alignItems: "center" },
  emptyText:      { textAlign: "center", lineHeight: 22, fontSize: 14 },
});
