import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Piece } from "@/types/chess";

const PIECE_SYMBOLS: Record<string, string> = {
  "wk": "♔", "wq": "♕", "wr": "♖", "wb": "♗", "wn": "♘", "wp": "♙",
  "bk": "♚", "bq": "♛", "br": "♜", "bb": "♝", "bn": "♞", "bp": "♟",
};

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
  const pieceColors = PIECE_COLORS[piece.color];
  const fontSize = size * 0.78;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Shadow layer */}
      <Text
        style={[
          styles.piece,
          styles.shadowPiece,
          {
            fontSize,
            color: pieceColors.shadow,
            top: size * 0.05,
            left: size * 0.05,
          },
        ]}
      >
        {symbol}
      </Text>
      {/* Stroke/outline layer */}
      <Text
        style={[
          styles.piece,
          {
            fontSize,
            color: pieceColors.stroke,
            textShadowColor: pieceColors.stroke,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: piece.color === "w" ? 3 : 2,
          },
        ]}
      >
        {symbol}
      </Text>
      {/* Fill layer */}
      <Text
        style={[
          styles.piece,
          {
            fontSize: fontSize * (piece.color === "w" ? 0.96 : 0.95),
            color: pieceColors.fill,
          },
        ]}
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
    fontWeight: "900",
    textAlign: "center",
  },
  shadowPiece: {
    opacity: 0.35,
  },
});
