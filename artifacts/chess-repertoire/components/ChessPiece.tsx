import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { SvgUri, SvgXml } from "react-native-svg";
import { Piece } from "@/types/chess";
import { getCachedPieceSvg } from "@/utils/PieceCache";

const BASE_URL = "https://lichess1.org/assets/piece/cburnett";

interface ChessPieceProps {
  piece: Piece;
  size: number;
}

export default memo(function ChessPiece({ piece, size }: ChessPieceProps) {
  const key    = (piece.color + piece.type).toLowerCase();
  const cached = getCachedPieceSvg(key);
  const uri    = `${BASE_URL}/${piece.color === "w" ? "w" : "b"}${piece.type.toUpperCase()}.svg`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {cached
        ? <SvgXml xml={cached} width={size} height={size} />
        : <SvgUri uri={uri}   width={size} height={size} />}
    </View>
  );
},
(prev, next) =>
  prev.piece.type  === next.piece.type  &&
  prev.piece.color === next.piece.color &&
  prev.size        === next.size,
);

const styles = StyleSheet.create({
  container: { justifyContent: "center", alignItems: "center" },
});
