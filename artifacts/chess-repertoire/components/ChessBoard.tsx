import React, { useCallback, useMemo } from "react";
import {
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { useBoard } from "@/context/BoardContext";
import { fenToBoard } from "@/utils/chess";
import { Piece, PieceColor } from "@/types/chess";
import ChessPiece from "@/components/ChessPiece";
import PromotionPicker from "@/components/PromotionPicker";

const { width } = Dimensions.get("window");
const BOARD_SIZE = Math.min(width - 16, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

export default function ChessBoard() {
  const {
    fen,
    flipped,
    selectedSquare,
    legalMoves,
    boardTheme,
    customLight,
    customDark,
    handleSquarePress,
    pendingPromotion,
    confirmPromotion,
    cancelPromotion,
    currentPath,
  } = useBoard();

  const board = useMemo(() => fenToBoard(fen), [fen]);
  const activeColor = fen.split(" ")[1] as PieceColor;

  const lightColor = boardTheme.id === "custom" ? customLight : boardTheme.lightSquare;
  const darkColor = boardTheme.id === "custom" ? customDark : boardTheme.darkSquare;

  const lastMove = currentPath.length > 0 ? currentPath[currentPath.length - 1]?.move : null;

  const getSquareName = useCallback((row: number, col: number): string => {
    const r = flipped ? row : 7 - row;
    const c = flipped ? 7 - col : col;
    return String.fromCharCode("a".charCodeAt(0) + c) + (r + 1);
  }, [flipped]);

  const getPiece = useCallback((row: number, col: number): Piece | null => {
    const displayRow = flipped ? 7 - row : row;
    const displayCol = flipped ? 7 - col : col;
    return board[displayRow][displayCol];
  }, [board, flipped]);

  const isLight = (row: number, col: number) => (row + col) % 2 === 0;

  const getSquareOverlay = (sq: string): string | null => {
    if (selectedSquare === sq) return "rgba(20, 85, 30, 0.5)";
    if (legalMoves.includes(sq)) return "rgba(20, 85, 30, 0.3)";
    if (lastMove && (lastMove.from === sq || lastMove.to === sq)) return "rgba(255, 215, 0, 0.4)";
    return null;
  };

  const renderRankLabel = (row: number) => {
    const rank = flipped ? row + 1 : 8 - row;
    return (
      <Text style={[styles.rankLabel, { color: isLight(row, 0) ? darkColor : lightColor }]}>
        {rank}
      </Text>
    );
  };

  const renderFileLabel = (col: number) => {
    const file = flipped ? String.fromCharCode("h".charCodeAt(0) - col) : String.fromCharCode("a".charCodeAt(0) + col);
    return (
      <Text style={[styles.fileLabel, { color: isLight(7, col) ? darkColor : lightColor }]}>
        {file}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
        {Array(8).fill(null).map((_, row) => (
          <View key={row} style={styles.row}>
            {Array(8).fill(null).map((_, col) => {
              const sq = getSquareName(row, col);
              const piece = getPiece(row, col);
              const light = isLight(flipped ? 7 - row : row, flipped ? 7 - col : col);
              const overlay = getSquareOverlay(sq);
              const isLegalDot = legalMoves.includes(sq) && !piece;
              const isLegalCapture = legalMoves.includes(sq) && !!piece;

              return (
                <TouchableOpacity
                  key={col}
                  style={[
                    styles.square,
                    {
                      width: SQUARE_SIZE,
                      height: SQUARE_SIZE,
                      backgroundColor: light ? lightColor : darkColor,
                    },
                  ]}
                  onPress={() => handleSquarePress(sq)}
                  activeOpacity={0.9}
                >
                  {overlay && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />
                  )}
                  {isLegalDot && (
                    <View style={styles.legalDot} />
                  )}
                  {isLegalCapture && (
                    <View style={[styles.legalCapture, {
                      borderColor: "rgba(20, 85, 30, 0.5)",
                    }]} />
                  )}
                  {piece && (
                    <ChessPiece piece={piece} size={SQUARE_SIZE * 0.9} />
                  )}
                  {col === 0 && renderRankLabel(row)}
                  {row === 7 && renderFileLabel(col)}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      {pendingPromotion && (
        <PromotionPicker
          color={activeColor === "w" ? "b" : "w"}
          onSelect={confirmPromotion}
          onCancel={cancelPromotion}
          lightColor={lightColor}
          darkColor={darkColor}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    position: "relative",
  },
  board: {
    borderWidth: 2,
    borderColor: "#2d3748",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  square: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  legalDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(20, 85, 30, 0.45)",
    position: "absolute",
  },
  legalCapture: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
    borderWidth: 4,
  },
  rankLabel: {
    position: "absolute",
    top: 1,
    left: 2,
    fontSize: 9,
    fontWeight: "700",
  },
  fileLabel: {
    position: "absolute",
    bottom: 1,
    right: 2,
    fontSize: 9,
    fontWeight: "700",
  },
});
