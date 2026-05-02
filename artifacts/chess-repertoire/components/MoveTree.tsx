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

  // useMemo instead of useCallback — the output is a list of elements, not a function.
  // This means it only recomputes when dependencies change, and avoids calling the
  // function on every render just to get the same array back.
  const moveList = useMemo(() => {
    let keyCounter = 0;
    const k = () => `mk-${keyCounter++}`;
    const els: React.ReactNode[] = [];

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

      if (!isBlack) {
        els.push(
          <Text key={k()} style={[styles.moveNumber, { color: colors.mutedForeground }]}>
            {moveNum}.
          </Text>,
        );
      } else if (showNum) {
        els.push(
          <Text key={k()} style={[styles.moveNumber, { color: colors.mutedForeground }]}>
            {moveNum}…
          </Text>,
        );
      }

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

      const nextIsBlack = !isBlack;
      const nextMoveNum = isBlack ? moveNum + 1 : moveNum;
      const hasVariations = node.children.length > 1;
      const newAncestors = [...ancestors, node];

      for (let v = 1; v < node.children.length; v++) {
        const varChild = node.children[v];
        els.push(
          <Text key={k()} style={[styles.varParen, { color: colors.mutedForeground }]}>
            {" ("}
          </Text>,
        );
        walk(varChild, nextMoveNum, nextIsBlack, newAncestors, true, true);
        els.push(
          <Text key={k()} style={[styles.varParen, { color: colors.mutedForeground }]}>
            {")"}
          </Text>,
        );
      }

      if (node.children.length > 0) {
        walk(node.children[0], nextMoveNum, nextIsBlack, newAncestors, hasVariations, isNested);
      }
    }

    const fenParts = (opening.rootFen || STARTING_FEN).split(" ");
    const startMoveNum = parseInt(fenParts[5] || "1", 10);
    const startIsBlack = fenParts[1] === "b";

    for (const rootNode of opening.moveTree) {
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
        {moveList}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 12, paddingBottom: 24 },
  flowRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", rowGap: 4 },
  moveNumber: { fontSize: 13, fontWeight: "600", paddingHorizontal: 2 },
  inlineMove: { paddingHorizontal: 5, paddingVertical: 3 },
  moveText: { fontSize: 14, fontWeight: "500" },
  variationText: { fontStyle: "italic", fontSize: 13 },
  varParen: { fontSize: 13, fontWeight: "600" },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { textAlign: "center", lineHeight: 22, fontSize: 14 },
});
