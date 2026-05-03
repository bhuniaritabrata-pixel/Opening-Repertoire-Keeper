import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
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

const LONG_PRESS_MS = 320; // hold threshold to enter arrow-draw mode
const TAP_MOVE_PX = 18;    // max finger drift to count as a tap

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

interface UserArrow { from: string; to: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function posToSq(px: number, py: number, flipped: boolean): string | null {
  const col = Math.floor(px / SQUARE_SIZE);
  const row = Math.floor(py / SQUARE_SIZE);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const c = flipped ? 7 - col : col;
  const r = flipped ? row : 7 - row;
  return String.fromCharCode("a".charCodeAt(0) + c) + (r + 1);
}

// ─── Arrow SVG ────────────────────────────────────────────────────────────────
const Arrow = memo(function Arrow({
  from, to, flipped, color, thin = false,
}: {
  from: string; to: string; flipped: boolean; color: string; thin?: boolean;
}) {
  const a = squareCenter(from, flipped);
  const b = squareCenter(to, flipped);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;

  const arrowW  = thin ? SQUARE_SIZE * 0.065 : SQUARE_SIZE * 0.12;
  const headLen = thin ? SQUARE_SIZE * 0.22  : SQUARE_SIZE * 0.34;
  const headW   = thin ? SQUARE_SIZE * 0.17  : SQUARE_SIZE * 0.28;
  const tailGap = SQUARE_SIZE * 0.28;

  const x1 = a.x + ux * tailGap;
  const y1 = a.y + uy * tailGap;
  const x2 = b.x - ux * headLen;
  const y2 = b.y - uy * headLen;
  const px = -uy;
  const py =  ux;

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
    <Svg
      width={BOARD_SIZE}
      height={BOARD_SIZE}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Polygon points={bodyPts} fill={color} fillOpacity={0.85} />
      <Polygon points={headPts} fill={color} fillOpacity={0.85} />
    </Svg>
  );
});

// ─── Single memoized square (View only — touches handled by PanResponder) ─────
const BoardSquare = memo(function BoardSquare({
  sq, piece, isLight, lightColor, darkColor,
  overlay, isLegalDot, isLegalCapture, isAnimatingFrom,
  annOnDest, rank, file, showRankLabel, showFileLabel,
}: SquareData & { lightColor: string; darkColor: string }) {
  const bg = isLight ? lightColor : darkColor;
  const labelColor = isLight ? darkColor : lightColor;
  const annColor = annOnDest ? ANNOTATION_COLORS[annOnDest.annotation] : undefined;

  return (
    <View style={[styles.square, { width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: bg }]}>
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
    </View>
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

  const board      = useMemo(() => fenToBoard(fen), [fen]);
  const activeColor = fen.split(" ")[1] as PieceColor;
  const checkedKingSquare = useMemo(() => getCheckedKingSquare(fen), [fen]);

  const lightColor = boardTheme.id === "custom" ? customLight : boardTheme.lightSquare;
  const darkColor  = boardTheme.id === "custom" ? customDark  : boardTheme.darkSquare;
  const lastMove   = currentPath.length > 0 ? currentPath[currentPath.length - 1]?.move : null;

  // ── Piece animation ──────────────────────────────────────────────────────────
  const [animPiece, setAnimPiece] = useState<AnimPiece | null>(null);
  const animX     = useRef(new Animated.Value(0)).current;
  const animY     = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(1)).current;
  const pendingMove = useRef<string | null>(null);

  // ── User arrows ──────────────────────────────────────────────────────────────
  const [userArrows, setUserArrows] = useState<UserArrow[]>([]);

  // Clear user arrows when a move is played
  const prevPathLen = useRef(currentPath.length);
  useEffect(() => {
    if (currentPath.length !== prevPathLen.current) {
      setUserArrows([]);
      prevPathLen.current = currentPath.length;
    }
  }, [currentPath.length]);

  // ── Touch helpers ────────────────────────────────────────────────────────────
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

  const getSquareOverlay = useCallback((sq: string): string | null => {
    if (checkedKingSquare === sq) return "rgba(200, 0, 0, 0.55)";
    if (selectedSquare === sq)    return "rgba(20, 85, 30, 0.5)";
    if (legalMovesSet.has(sq))    return "rgba(20, 85, 30, 0.3)";
    return null;
  }, [checkedKingSquare, selectedSquare, legalMovesSet]);

  const handlePressWithAnimation = useCallback((sq: string) => {
    if (pendingPromotion) { handleSquarePress(sq); return; }

    if (selectedSquare && legalMovesSet.has(sq) && !animPiece) {
      const fromRC = squareToRC(selectedSquare, flipped);
      const toRC   = squareToRC(sq, flipped);
      const fromX  = fromRC.col * SQUARE_SIZE;
      const fromY  = fromRC.row * SQUARE_SIZE;
      const toX    = toRC.col * SQUARE_SIZE;
      const toY    = toRC.row * SQUARE_SIZE;

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

  // ── PanResponder — handles taps AND long-press arrow drawing ─────────────────
  const touchStart = useRef<{ sq: string; px: number; py: number; t: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrowFromRef = useRef<string | null>(null);    // set once long-press fires
  const [arrowFromSq, setArrowFromSq] = useState<string | null>(null); // visual

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => arrowFromRef.current !== null,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const sq = posToSq(locationX, locationY, flipped);
      touchStart.current = { sq: sq || "", px: locationX, py: locationY, t: Date.now() };

      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = setTimeout(() => {
        if (!touchStart.current || !sq) return;
        arrowFromRef.current = sq;
        setArrowFromSq(sq);
      }, LONG_PRESS_MS);
    },

    onPanResponderRelease: (evt) => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }

      const { locationX, locationY } = evt.nativeEvent;
      const endSq  = posToSq(locationX, locationY, flipped);
      const start  = touchStart.current;
      const fromSq = arrowFromRef.current;

      touchStart.current  = null;
      arrowFromRef.current = null;
      setArrowFromSq(null);

      if (fromSq) {
        // Arrow drawing mode
        if (endSq && endSq !== fromSq) {
          // Toggle arrow
          setUserArrows(prev => {
            const idx = prev.findIndex(a => a.from === fromSq && a.to === endSq);
            return idx >= 0 ? prev.filter((_, i) => i !== idx) : [...prev, { from: fromSq, to: endSq }];
          });
        } else {
          // Long-press on same square → clear all arrows
          setUserArrows([]);
        }
        return;
      }

      // Normal tap — check it hasn't drifted too far
      if (start && endSq) {
        const dx = locationX - start.px;
        const dy = locationY - start.py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < TAP_MOVE_PX && !animPiece) {
          handlePressWithAnimation(start.sq || endSq);
        }
      }
    },

    onPanResponderTerminate: () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      arrowFromRef.current = null;
      setArrowFromSq(null);
      touchStart.current = null;
    },
  }), [flipped, handlePressWithAnimation]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Square data ───────────────────────────────────────────────────────────────
  const squareData = useMemo((): SquareData[][] => {
    const rows: SquareData[][] = [];
    for (let row = 0; row < 8; row++) {
      const cols: SquareData[] = [];
      for (let col = 0; col < 8; col++) {
        const sq    = getSquareName(row, col);
        const piece = getPiece(row, col);
        const visualRow = flipped ? 7 - row : row;
        const visualCol = flipped ? 7 - col : col;
        const isLight      = (visualRow + visualCol) % 2 === 0;
        const overlay      = getSquareOverlay(sq);
        const isLegalDot   = legalMovesSet.has(sq) && !piece;
        const isLegalCapture = legalMovesSet.has(sq) && !!piece;
        const ann          = squareAnnotations[sq];
        cols.push({
          sq, piece, isLight, overlay,
          isLegalDot, isLegalCapture,
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
      <View
        style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}
        {...panResponder.panHandlers}
      >
        {squareData.map((rowCols, row) => (
          <View key={row} style={styles.row}>
            {rowCols.map((data) => (
              <BoardSquare
                key={data.sq}
                {...data}
                lightColor={lightColor}
                darkColor={darkColor}
              />
            ))}
          </View>
        ))}

        {/* Last-move thin blue arrow */}
        {lastMove && (
          <Arrow from={lastMove.from} to={lastMove.to} flipped={flipped} color="#1565c0" thin />
        )}

        {/* User-drawn arrows (slightly thicker, slightly lighter blue) */}
        {userArrows.map((a, i) => (
          <Arrow key={i} from={a.from} to={a.to} flipped={flipped} color="#1976d2" />
        ))}

        {/* Preview: arrow-from square highlight while user is in drag mode */}
        {arrowFromSq && (() => {
          const rc = squareToRC(arrowFromSq, flipped);
          return (
            <View
              pointerEvents="none"
              style={[
                styles.arrowFromHighlight,
                {
                  left:  rc.col * SQUARE_SIZE,
                  top:   rc.row * SQUARE_SIZE,
                  width: SQUARE_SIZE,
                  height: SQUARE_SIZE,
                },
              ]}
            />
          );
        })()}

        {/* Animated piece overlay */}
        {animPiece && (
          <Animated.View
            style={[
              styles.animPiece,
              {
                left:  animPiece.fromX,
                top:   animPiece.fromY,
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
  container:  { alignItems: "center", position: "relative" },
  board:      { borderWidth: 2, borderColor: "#2d3748", overflow: "hidden", position: "relative" },
  row:        { flexDirection: "row" },
  square:     { justifyContent: "center", alignItems: "center", position: "relative" },
  legalDot:   { width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(20, 85, 30, 0.45)", position: "absolute" },
  legalCapture: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 4 },
  rankLabel:  { position: "absolute", top: 1, left: 2, fontSize: 9, fontWeight: "700" },
  fileLabel:  { position: "absolute", bottom: 1, right: 2, fontSize: 9, fontWeight: "700" },
  animPiece:  { position: "absolute", justifyContent: "center", alignItems: "center", zIndex: 100 },
  annBadge: {
    position: "absolute", top: 1, right: 1,
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    justifyContent: "center", alignItems: "center", zIndex: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35, shadowRadius: 2, elevation: 4,
  },
  annBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900", lineHeight: 12, textAlign: "center" },
  arrowFromHighlight: {
    position: "absolute",
    backgroundColor: "rgba(25, 118, 210, 0.35)",
    zIndex: 5,
  },
});
