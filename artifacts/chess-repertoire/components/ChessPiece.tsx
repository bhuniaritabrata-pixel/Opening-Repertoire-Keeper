import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { SvgUri } from "react-native-svg";
import { Piece } from "@/types/chess";

const BASE_URL = "https://lichess1.org/assets/piece/cburnett";

const PIECE_URLS: Record<string, string> = {
  wk: `${BASE_URL}/wK.svg`,
  wq: `${BASE_URL}/wQ.svg`,
  wr: `${BASE_URL}/wR.svg`,
  wb: `${BASE_URL}/wB.svg`,
  wn: `${BASE_URL}/wN.svg`,
  wp: `${BASE_URL}/wP.svg`,
  bk: `${BASE_URL}/bK.svg`,
  bq: `${BASE_URL}/bQ.svg`,
  br: `${BASE_URL}/bR.svg`,
  bb: `${BASE_URL}/bB.svg`,
  bn: `${BASE_URL}/bN.svg`,
  bp: `${BASE_URL}/bP.svg`,
};

interface ChessPieceProps {
  piece: Piece;
  size: number;
}

// memo: a piece only re-renders when its type, color, or size actually changes.
// Since BoardSquare is already memoized with no selection deps, this is an
// extra guard ensuring the SVG is never re-fetched unnecessarily.
export default memo(function ChessPiece({ piece, size }: ChessPieceProps) {
  const key = piece.color + piece.type;
  const uri = PIECE_URLS[key];
  if (!uri) return null;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <SvgUri uri={uri} width={size} height={size} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { justifyContent: "center", alignItems: "center" },
});
