import React from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { Piece } from "@/types/chess";

// Neo-style chess piece SVG representations using Unicode + custom styling
// to mimic chess.com's vibrant Neo piece set appearance

const PIECE_SYMBOLS: Record<string, string> = {
  "wk": "♔", "wq": "♕", "wr": "♖", "wb": "♗", "wn": "♘", "wp": "♙",
  "bk": "♚", "bq": "♛", "br": "♜", "bb": "♝", "bn": "♞", "bp": "♟",
};

// Vibrant Neo-style color palette per piece type
const PIECE_COLORS: Record<string, { fill: string; stroke: string; shadow: string }> = {
  w: { fill: "#ffffff", stroke: "#2d2d2d", shadow: "rgba(0,0,0,0.4)" },
  b: { fill: "#1a1a1a", stroke: "#f0f0f0", shadow: "rgba(255,255,255,0.15)" },
};

interface ChessPieceProps {
  piece: Piece;
  size: number;
}

export default function ChessPiece({ piece, size }: ChessPieceProps) {
  const key = piece.color + piece.type;
  const symbol = PIECE_SYMBOLS[key] || "?";
  const colors = PIECE_COLORS[piece.color];
  const fontSize = size * 0.78;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Shadow layer */}
      <Text
        style={[
          styles.piece,
          styles.shadow,
          {
            fontSize: fontSize,
            color: colors.shadow,
            top: size * 0.05,
            left: size * 0.05,
          },
        ]}
        selectable={false}
      >
        {symbol}
      </Text>
      {/* Stroke/outline layer */}
      <Text
        style={[
          styles.piece,
          {
            fontSize: fontSize,
            color: colors.stroke,
            textShadowColor: colors.stroke,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: piece.color === "w" ? 3 : 2,
          },
        ]}
        selectable={false}
      >
        {symbol}
      </Text>
      {/* Fill layer */}
      <Text
        style={[
          styles.piece,
          {
            fontSize: fontSize * (piece.color === "w" ? 0.96 : 0.95),
            color: colors.fill,
          },
        ]}
        selectable={false}
      >
        {symbol}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  piece: {
    position: "absolute",
    lineHeight: undefined,
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
  },
  shadow: {
    opacity: 0.35,
  },
});
