import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { useBoard } from "@/context/BoardContext";
import { fenToBoard, getCheckedKingSquare } from "@/utils/chess";
import { ANNOTATION_COLORS, ANNOTATION_SYMBOLS, MoveAnnotation, Piece, PieceColor } from "@/types/chess";
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

interface SquareData {
  sq: string;
  piece: Piece | null;
  isLight: boolean;
  overlay: string | null;
  isLegalDot: boolean;
  isLegalCapture: boolean;
  isAnimatingFrom: boolean;
  annOnDest: { annotation: MoveAnnotation; from: string } | undefined;
  rank: number;
  file: string;
  showRankLabel: boolean;
  showFileLabel: boolean;
}

function squareToRC(sq: string, flipped: boolean): { row: number; col: number } {
  const col = sq.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(sq[1]) - 1;
  const row = 7 - rank;
  if (flipped) return { row: 7 - row, col: 7 - col };
  return { row, col };
}

function squareCenter(sq: string, flipped: boolean): { x: number; y: number } {
  const col = sq.charCodeAt(0) - "a".charCodeAt(0);
  const rank = parseInt(sq[1]) - 1;
  const row = 7 - rank;
  const c = flipped ? 7 - col : col;
  const r = flipped ? 7 - row : row;
  return { x: (c + 0.5) * SQUARE_SIZE, y: (r + 0.5) * SQUARE_SIZE };
}

// ─── Arrow ────────────────────────────────────────────────────────────────────
const BestMoveArrow = memo(function BestMoveArrow({
  from, to, flipped, color = "#1a3d7c", opacity = 0.88,
}: {
  from: string; to: string; flipped: boolean; color?: string; opacity?: number;
}) {
  const a = squareCenter(from, flipped);
  const b = squareCenter(to, flipped);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const arrowW = SQUARE_SIZE * 0.10;
  const headLen = SQUARE_SIZE * 0.32;
  const headW = SQUARE_SIZE * 0.26;
  const x1 = a.x + ux * SQUARE_SIZE * 0.28;
  const y1 = a.y + uy * SQUARE_SIZE * 0.28;
  const x2 = b.x - ux * headLen;
  const y2 = b.y - uy * headLen;
  const px = -uy;
  const py = ux;
  const bodyPts = [
    `${x1 + px * arrowW},${y1 + py * arrowW}`,
    `${x2 + px * arrowW},${y2 + py * arrowW}`,
    `${x2 - px * arrowW},${y2 - py * arrowW}`,
    `${x1 - px * arrowW},${y1 - py * arrowW}`,
  ].join(" ");
  const headPts = [
    `${b.x},${b.y}`,
    `${x2 + px * headW},${y2 + py * headW}`,
    `${x2 - px * headW},${y2 - py * headW}`,
  ].join(" ");

  return (
    <Svg width={BOARD_SIZE} height={BOARD_SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Polygon points={bodyPts} fill={color} fillOpacity={opacity} />
      <Polygon points={headPts} fill={color} fillOpacity={opacity} />
    </Svg>
  );
});

// ─── Single memoized square ───────────────────────────────────────────────────
const BoardSquare = memo(function BoardSquare({
  sq, piece, isLight, lightColor, darkColor,
  overlay, isLegalDot, isLegalCapture, isAnimatingFrom,
  annOnDest, onPress, animDisabled,
  rank, file, showRankLabel, showFileLabel,
}: SquareData & { lightColor: string; darkColor: string; onPress: (sq: string) => void; animDisabled: boolean }) {
  const bg = isLight ? lightColor : darkColor;
  const labelColor = isLight ? darkColor : lightColor;
  const annColor = annOnDest ? ANNOTATION_COLORS[annOnDest.annotation] : undefined;

  return (
    <TouchableOpacity
      style={[styles.square, { width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: bg }]}
      onPress={() => onPress(sq)}
      activeOpacity={0.9}
      disabled={animDisabled}
    >
      {overlay && <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />}
      {isLegalDot && <View style={styles.legalDot} />}
      {isLegalCapture && <View style={[styles.legalCapture, { borderColor: "rgba(20, 85, 30, 0.5)" }]} />}
      {piece && !isAnimatingFrom && <ChessPiece piece={piece} size={SQUARE_SIZE * 0.9} />}
      {showRankLabel && <Text style={[styles.rankLabel, { color: labelColor }]}>{rank}</Text>}
      {showFileLabel && <Text style={[styles.fileLabel, { color: labelColor }]}>{file}</Text>}
      {annOnDest && (
        <View style={[styles.annBadge, { backgroundColor: annColor, borderColor: "rgba(0,0,0,0.25)" }]}>
          <Text style={styles.annBadgeText}>
            {annOnDest.annotation === "book" ? "📖" : ANNOTATION_SYMBOLS[annOnDest.annotation]}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Main board component ─────────────────────────────────────────────────────
export default function ChessBoard() {
  const {
    fen, flipped, selectedSquare, legalMovesSet,
    boardTheme, customLight, customDark,
    handleSquarePress, pendingPromotion, confirmPromotion, cancelPromotion,
    currentPath, squareAnnotations,
  } = useBoard();

  const board = useMemo(() => fenToBoard(fen), [fen]);
  const activeColor = fen.split(" ")[1] as PieceColor;
  const checkedKingSquare = useMemo(() => getCheckedKingSquare(fen), [fen]);

  const lightColor = boardTheme.id === "custom" ? customLight : boardTheme.lightSquare;
  const darkColor = boardTheme.id === "custom" ? customDark : boardTheme.darkSquare;

  const lastMove = currentPath.length > 0 ? currentPath[currentPath.length - 1]?.move : null;

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

  // O(1) overlay using pre-built Set
  const getSquareOverlay = useCallback((sq: string): string | null => {
    if (checkedKingSquare === sq) return "rgba(200, 0, 0, 0.55)";
    if (selectedSquare === sq) return "rgba(20, 85, 30, 0.5)";
    if (legalMovesSet.has(sq)) return "rgba(20, 85, 30, 0.3)";
    if (lastMove && (lastMove.from === sq || lastMove.to === sq)) return "rgba(255, 215, 0, 0.4)";
    return null;
  }, [checkedKingSquare, selectedSquare, legalMovesSet, lastMove]);

  const handlePressWithAnimation = useCallback((sq: string) => {
    if (pendingPromotion) { handleSquarePress(sq); return; }

    if (selectedSquare && legalMovesSet.has(sq) && !animPiece) {
      const fromRC = squareToRC(selectedSquare, flipped);
      const toRC = squareToRC(sq, flipped);
      const fromX = fromRC.col * SQUARE_SIZE;
      const fromY = fromRC.row * SQUARE_SIZE;
      const toX = toRC.col * SQUARE_SIZE;
      const toY = toRC.row * SQUARE_SIZE;

      const displayRow = flipped ? 7 - fromRC.row : fromRC.row;
      const displayCol = flipped ? 7 - fromRC.col : fromRC.col;
      const piece = board[displayRow][displayCol];

      if (piece) {
        pendingMove.current = sq;
        animX.setValue(0);
        animY.setValue(0);
        animScale.setValue(1.1);
        setAnimPiece({ piece, fromSq: selectedSquare, toSq: sq, fromX, fromY, toX, toY });

        Animated.parallel([
          Animated.timing(animX, { toValue: toX - fromX, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(animY, { toValue: toY - fromY, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(animScale, { toValue: 1, duration: 170, useNativeDriver: true }),
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
  }, [selectedSquare, legalMovesSet, flipped, board, animPiece, handleSquarePress, animX, animY, animScale, pendingPromotion]);

  // Pre-compute all 64 square descriptors in a single memoized pass.
  // Individual BoardSquare cells are memo'd, so only changed squares re-render.
  const squareData = useMemo((): SquareData[][] => {
    const rows: SquareData[][] = [];
    for (let row = 0; row < 8; row++) {
      const cols: SquareData[] = [];
      for (let col = 0; col < 8; col++) {
        const sq = getSquareName(row, col);
        const piece = getPiece(row, col);
        const visualRow = flipped ? 7 - row : row;
        const visualCol = flipped ? 7 - col : col;
        const isLight = (visualRow + visualCol) % 2 === 0;
        const overlay = getSquareOverlay(sq);
        const isLegalDot = legalMovesSet.has(sq) && !piece;
        const isLegalCapture = legalMovesSet.has(sq) && !!piece;
        const ann = squareAnnotations[sq];

        cols.push({
          sq,
          piece,
          isLight,
          overlay,
          isLegalDot,
          isLegalCapture,
          isAnimatingFrom: animPiece?.fromSq === sq,
          annOnDest: ann,
          rank: flipped ? row + 1 : 8 - row,
          file: flipped
            ? String.fromCharCode("h".charCodeAt(0) - col)
            : String.fromCharCode("a".charCodeAt(0) + col),
          showRankLabel: col === 0,
          showFileLabel: row === 7,
        });
      }
      rows.push(cols);
    }
    return rows;
  }, [getSquareName, getPiece, flipped, getSquareOverlay, legalMovesSet, animPiece, squareAnnotations]);

  return (
    <View style={styles.container}>
      <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
        {squareData.map((rowCols, row) => (
          <View key={row} style={styles.row}>
            {rowCols.map((data) => (
              <BoardSquare
                key={data.sq}
                {...data}
                lightColor={lightColor}
                darkColor={darkColor}
                onPress={handlePressWithAnimation}
                animDisabled={!!animPiece}
              />
            ))}
          </View>
        ))}

        {animPiece && (
          <Animated.View
            style={[
              styles.animPiece,
              {
                left: animPiece.fromX,
                top: animPiece.fromY,
                width: SQUARE_SIZE,
                height: SQUARE_SIZE,
                transform: [{ translateX: animX }, { translateY: animY }, { scale: animScale }],
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
  animPiece: { position: "absolute", justifyContent: "center", alignItems: "center", zIndex: 100 },
  annBadge: {
    position: "absolute", top: 1, right: 1,
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    justifyContent: "center", alignItems: "center", zIndex: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35, shadowRadius: 2, elevation: 4,
  },
  annBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900", lineHeight: 12, textAlign: "center" },
});
