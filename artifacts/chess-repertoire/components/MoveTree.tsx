import React, { useCallback } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ANNOTATION_COLORS, ANNOTATION_SYMBOLS, MoveNode, Opening } from "@/types/chess";
import { useBoard } from "@/context/BoardContext";
import { useColors } from "@/hooks/useColors";

interface MoveTreeProps {
  opening: Opening;
}

interface NodeProps {
  node: MoveNode;
  depth: number;
  path: MoveNode[];
  isVariation: boolean;
}

export default function MoveTree({ opening }: MoveTreeProps) {
  const colors = useColors();
  const { currentNodeId, goToMove } = useBoard();

  const renderNode = useCallback(({ node, depth, path, isVariation }: NodeProps) => {
    const isCurrent = node.id === currentNodeId;
    const annotation = node.move.annotation;
    const annotationSymbol = annotation ? ANNOTATION_SYMBOLS[annotation] : "";
    const annotationColor = annotation ? ANNOTATION_COLORS[annotation] : undefined;

    return (
      <View key={node.id}>
        <TouchableOpacity
          style={[
            styles.moveBtn,
            isCurrent && { backgroundColor: colors.primary + "33" },
            isVariation && { marginLeft: depth * 12 },
          ]}
          onPress={() => goToMove(node, path)}
        >
          <Text style={[
            styles.moveText,
            { color: isCurrent ? colors.primary : colors.foreground },
            isVariation && styles.variationText,
          ]}>
            {node.move.san}
          </Text>
          {annotationSymbol ? (
            <Text style={[styles.annotation, { color: annotationColor }]}>
              {annotationSymbol}
            </Text>
          ) : null}
        </TouchableOpacity>

        {node.children.length > 0 && (
          <View style={node.children.length > 1 ? styles.branchContainer : undefined}>
            {node.children.map((child, idx) => (
              renderNode({
                node: child,
                depth: depth + (idx > 0 ? 1 : 0),
                path: [...path, child],
                isVariation: idx > 0,
              })
            ))}
          </View>
        )}
      </View>
    );
  }, [currentNodeId, goToMove, colors]);

  // Render main line and variations in a flow layout
  const renderMoveList = () => {
    const elements: React.ReactNode[] = [];
    let moveNum = 1;

    function traverse(nodes: MoveNode[], depth: number, path: MoveNode[], isBlackNext: boolean) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const isCurrent = node.id === currentNodeId;
        const annotation = node.move.annotation;
        const annotationSymbol = annotation ? ANNOTATION_SYMBOLS[annotation] : "";
        const annotationColor = annotation ? ANNOTATION_COLORS[annotation] : undefined;

        const isWhiteMove = !isBlackNext;

        if (depth === 0) {
          // Main line - inline flow
          if (isWhiteMove) {
            elements.push(
              <Text key={`num-${node.id}`} style={[styles.moveNumber, { color: colors.mutedForeground }]}>
                {moveNum}.
              </Text>
            );
          }

          elements.push(
            <TouchableOpacity
              key={node.id}
              onPress={() => goToMove(node, path.concat(node))}
              style={[styles.inlineMove, isCurrent && { backgroundColor: colors.primary + "22", borderRadius: 4 }]}
            >
              <Text style={[
                styles.moveText,
                { color: isCurrent ? colors.primary : colors.foreground },
              ]}>
                {node.move.san}
                {annotationSymbol ? (
                  <Text style={{ color: annotationColor, fontWeight: "700" }}>{annotationSymbol}</Text>
                ) : null}
              </Text>
            </TouchableOpacity>
          );

          if (!isWhiteMove) moveNum++;

          // Render first child in main line (variation 0)
          if (node.children.length > 0) {
            // Render variations (idx > 0) as sub-blocks
            for (let v = 1; v < node.children.length; v++) {
              const varChild = node.children[v];
              elements.push(
                <View key={`var-${varChild.id}`} style={[styles.variationBlock, { borderLeftColor: colors.border }]}>
                  <Text style={[styles.varLabel, { color: colors.mutedForeground }]}>Variation:</Text>
                  {renderNode({ node: varChild, depth: 1, path: path.concat(node, varChild), isVariation: true })}
                </View>
              );
            }

            traverse([node.children[0]], depth, path.concat(node), !isBlackNext);
          }
        }
      }
    }

    traverse(opening.moveTree, 0, [], false);
    return elements;
  };

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
    gap: 2,
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
  moveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 2,
  },
  moveText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  variationText: {
    fontStyle: "italic",
    fontSize: 13,
  },
  annotation: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 1,
  },
  branchContainer: {
    marginTop: 2,
  },
  variationBlock: {
    marginVertical: 4,
    paddingLeft: 10,
    borderLeftWidth: 2,
    width: "100%",
  },
  varLabel: {
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 2,
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
