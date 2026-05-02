import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBoard } from "@/context/BoardContext";
import { fenToBoard, getCheckedKingSquare } from "@/utils/chess";
import { ANNOTATION_COLORS, ANNOTATION_SYMBOLS, Piece, PieceColor } from "@/types/chess";
import ChessPiece from "@/components/ChessPiece";
import PromotionPicker from "@/components/PromotionPicker";

const { width } = Dimensions.get("window");
const BOARD_SIZE = Math.min(width - 16, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

interface AnimPiece {
  piece: Piece;
  fromSq: string;
  toSq: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

function squareToRC(sq: string, flipped: boolean): { row: number; col: number } {
  const col = sq.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(sq[1]) - 1;
  const row = 7 - rank;
  if (flipped) return { row: 7 - row, col: 7 - col };
  return { row, col };
}

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
    squareAnnotations,
  } = useBoard();

  const board = useMemo(() => fenToBoard(fen), [fen]);
  const activeColor = fen.split(" ")[1] as PieceColor;
  const checkedKingSquare = useMemo(() => getCheckedKingSquare(fen), [fen]);

  const lightColor = boardTheme.id === "custom" ? customLight : boardTheme.lightSquare;
  const darkColor = boardTheme.id === "custom" ? customDark : boardTheme.darkSquare;

  const lastMove = currentPath.length > 0 ? currentPath[currentPath.length - 1]?.move : null;

  // Animation state
  const [animPiece, setAnimPiece] = useState<AnimPiece | null>(null);
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(1)).current;
  const pendingMove = useRef<string | null>(null);

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
    if (checkedKingSquare === sq) return "rgba(200, 0, 0, 0.55)";
    if (selectedSquare === sq) return "rgba(20, 85, 30, 0.5)";
    if (legalMoves.includes(sq)) return "rgba(20, 85, 30, 0.3)";
    if (lastMove && (lastMove.from === sq || lastMove.to === sq)) return "rgba(255, 215, 0, 0.4)";
    return null;
  };

  // Handle press with smooth animation
  const handlePressWithAnimation = useCallback((sq: string) => {
    if (pendingPromotion) {
      handleSquarePress(sq);
      return;
    }

    // If it's a legal move, animate first
    if (selectedSquare && legalMoves.includes(sq) && !animPiece) {
      const fromRC = squareToRC(selectedSquare, flipped);
      const toRC = squareToRC(sq, flipped);

      const fromX = fromRC.col * SQUARE_SIZE;
      const fromY = fromRC.row * SQUARE_SIZE;
      const toX = toRC.col * SQUARE_SIZE;
      const toY = toRC.row * SQUARE_SIZE;

      // Get the piece at the from square
      const displayRow = flipped ? 7 - fromRC.row : fromRC.row;
      const displayCol = flipped ? 7 - fromRC.col : fromRC.col;
      const piece = board[displayRow][displayCol];

      if (piece) {
        pendingMove.current = sq;

        // Reset animation to start position
        animX.setValue(0);
        animY.setValue(0);
        animScale.setValue(1.1);

        setAnimPiece({ piece, fromSq: selectedSquare, toSq: sq, fromX, fromY, toX, toY });

        Animated.parallel([
          Animated.timing(animX, {
            toValue: toX - fromX,
            duration: 170,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animY, {
            toValue: toY - fromY,
            duration: 170,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animScale, {
            toValue: 1,
            duration: 170,
            useNativeDriver: true,
          }),
        ]).start(() => {
          const target = pendingMove.current;
          pendingMove.current = null;
          setAnimPiece(null);
          if (target) handleSquarePress(target);
        });
        return;
      }
    }

    handleSquarePress(sq);
  }, [selectedSquare, legalMoves, flipped, board, animPiece, handleSquarePress, animX, animY, animScale, pendingPromotion]);

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

              // Hide piece at from-square while animating
              const isAnimatingFrom = animPiece?.fromSq === sq;

              // Annotation badge on destination square only — no square tinting
              const annOnDest = squareAnnotations[sq];
              const annColor = annOnDest ? ANNOTATION_COLORS[annOnDest.annotation] : undefined;

              return (
                <TouchableOpacity
                  key={col}
                  style={[
                    styles.square,
                    { width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: light ? lightColor : darkColor },
                  ]}
                  onPress={() => handlePressWithAnimation(sq)}
                  activeOpacity={0.9}
                  disabled={!!animPiece}
                >
                  {overlay && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />
                  )}
                  {isLegalDot && (
                    <View style={styles.legalDot} />
                  )}
                  {isLegalCapture && (
                    <View style={[styles.legalCapture, { borderColor: "rgba(20, 85, 30, 0.5)" }]} />
                  )}
                  {piece && !isAnimatingFrom && (
                    <ChessPiece piece={piece} size={SQUARE_SIZE * 0.9} />
                  )}
                  {col === 0 && renderRankLabel(row)}
                  {row === 7 && renderFileLabel(col)}
                  {/* Annotation badge — top-right corner, above piece, Chessis style */}
                  {annOnDest && (
                    <View style={[styles.annBadge, { backgroundColor: annColor, borderColor: "rgba(0,0,0,0.25)" }]}>
                      <Text style={styles.annBadgeText}>
                        {annOnDest.annotation === "book"
                          ? "📖"
                          : ANNOTATION_SYMBOLS[annOnDest.annotation]}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Animated piece overlay */}
        {animPiece && (
          <Animated.View
            style={[
              styles.animPiece,
              {
                left: animPiece.fromX,
                top: animPiece.fromY,
                width: SQUARE_SIZE,
                height: SQUARE_SIZE,
                transform: [
                  { translateX: animX },
                  { translateY: animY },
                  { scale: animScale },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <ChessPiece piece={animPiece.piece} size={SQUARE_SIZE * 0.9} />
          </Animated.View>
        )}
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
  container: { alignItems: "center", position: "relative" },
  board: { borderWidth: 2, borderColor: "#2d3748", overflow: "hidden", position: "relative" },
  row: { flexDirection: "row" },
  square: { justifyContent: "center", alignItems: "center", position: "relative" },
  legalDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(20, 85, 30, 0.45)", position: "absolute" },
  legalCapture: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 4 },
  rankLabel: { position: "absolute", top: 1, left: 2, fontSize: 9, fontWeight: "700" },
  fileLabel: { position: "absolute", bottom: 1, right: 2, fontSize: 9, fontWeight: "700" },
  animPiece: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  annBadge: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 4,
  },
  annBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
    textAlign: "center",
  },
});
