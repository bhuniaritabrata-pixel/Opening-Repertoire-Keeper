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

const DRAG_THRESHOLD = 14;   // px before a touch becomes an arrow-draw drag
const TAP_MOVE_PX    = 14;   // px max drift for a tap

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnimPiece {
  piece: Piece;
  fromSq: string; toSq: string;
  fromX: number; fromY: number;
  toX: number; toY: number;
}
interface UserArrow { from: string; to: string }
interface SquareData {
  sq: string; piece: Piece | null;
  isLight: boolean; overlay: string | null;
  isLegalDot: boolean; isLegalCapture: boolean;
  isAnimatingFrom: boolean;
  annOnDest: { annotation: MoveAnnotation; from: string } | undefined;
  rank: number; file: string;
  showRankLabel: boolean; showFileLabel: boolean;
}

// ─── Pure helpers (no hooks, no closures over state) ─────────────────────────
function squareToRC(sq: string, flipped: boolean) {
  const col  = sq.charCodeAt(0) - 97; // 'a'
  const rank = parseInt(sq[1]) - 1;
  const row  = 7 - rank;
  return flipped ? { row: 7 - row, col: 7 - col } : { row, col };
}

function squareCenter(sq: string, flipped: boolean) {
  const col  = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  const row  = 7 - rank;
  const c = flipped ? 7 - col : col;
  const r = flipped ? 7 - row : row;
  return { x: (c + 0.5) * SQUARE_SIZE, y: (r + 0.5) * SQUARE_SIZE };
}

// Board-relative px → square name.  Returns null if out of bounds.
function posToSq(px: number, py: number, flipped: boolean): string | null {
  const col = Math.floor(px / SQUARE_SIZE);
  const row = Math.floor(py / SQUARE_SIZE);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const c = flipped ? 7 - col : col;
  const r = flipped ? row : 7 - row;
  return String.fromCharCode(97 + c) + (r + 1);
}

// ─── Arrow SVG (memoized, pure) ───────────────────────────────────────────────
const Arrow = memo(function Arrow({
  from, to, flipped, color, thin = false,
}: { from: string; to: string; flipped: boolean; color: string; thin?: boolean }) {
  const a = squareCenter(from, flipped);
  const b = squareCenter(to, flipped);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;
  const ux = dx / len, uy = dy / len;
  const arrowW  = thin ? SQUARE_SIZE * 0.065 : SQUARE_SIZE * 0.12;
  const headLen = thin ? SQUARE_SIZE * 0.22  : SQUARE_SIZE * 0.34;
  const headW   = thin ? SQUARE_SIZE * 0.17  : SQUARE_SIZE * 0.28;
  const tailGap = SQUARE_SIZE * 0.28;
  const x1 = a.x + ux * tailGap, y1 = a.y + uy * tailGap;
  const x2 = b.x - ux * headLen, y2 = b.y - uy * headLen;
  const px = -uy, py2 = ux;
  const bodyPts = [
    `${x1 + px * arrowW},${y1 + py2 * arrowW}`,
    `${x2 + px * arrowW},${y2 + py2 * arrowW}`,
    `${x2 - px * arrowW},${y2 - py2 * arrowW}`,
    `${x1 - px * arrowW},${y1 - py2 * arrowW}`,
  ].join(" ");
  const headPts = [
    `${b.x},${b.y}`,
    `${x2 + px * headW},${y2 + py2 * headW}`,
    `${x2 - px * headW},${y2 - py2 * headW}`,
  ].join(" ");
  return (
    <Svg width={BOARD_SIZE} height={BOARD_SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Polygon points={bodyPts} fill={color} fillOpacity={0.85} />
      <Polygon points={headPts} fill={color} fillOpacity={0.85} />
    </Svg>
  );
});

// ─── Single memoized square (View only — touches handled by overlay) ──────────
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
      {overlay        && <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />}
      {isLegalDot     && <View style={styles.legalDot} />}
      {isLegalCapture && <View style={[styles.legalCapture, { borderColor: "rgba(20,85,30,0.5)" }]} />}
      {piece && !isAnimatingFrom && <ChessPiece piece={piece} size={SQUARE_SIZE * 0.9} />}
      {showRankLabel  && <Text style={[styles.rankLabel,  { color: labelColor }]}>{rank}</Text>}
      {showFileLabel  && <Text style={[styles.fileLabel,  { color: labelColor }]}>{file}</Text>}
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

// ─── Main board ───────────────────────────────────────────────────────────────
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

  // ── Piece animation state ─────────────────────────────────────────────────
  const [animPiece, setAnimPiece] = useState<AnimPiece | null>(null);
  const animX     = useRef(new Animated.Value(0)).current;
  const animY     = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(1)).current;
  const pendingMove = useRef<string | null>(null);

  // ── User arrows ───────────────────────────────────────────────────────────
  const [userArrows, setUserArrows] = useState<UserArrow[]>([]);
  const [arrowFromSq, setArrowFromSq] = useState<string | null>(null);
  // Live preview: the square currently under the finger while drawing
  const [arrowPreviewTo, setArrowPreviewTo] = useState<string | null>(null);
  // Avoid redundant setState calls when finger stays on the same square
  const prevArrowPreviewSqRef = useRef<string | null>(null);

  // Clear user arrows when a move is played
  const prevPathLen = useRef(currentPath.length);
  useEffect(() => {
    if (currentPath.length !== prevPathLen.current) {
      setUserArrows([]);
      prevPathLen.current = currentPath.length;
    }
  }, [currentPath.length]);

  // ── Stable helpers ────────────────────────────────────────────────────────
  const getSquareName = useCallback((row: number, col: number): string => {
    const r = flipped ? row : 7 - row;
    const c = flipped ? 7 - col : col;
    return String.fromCharCode(97 + c) + (r + 1);
  }, [flipped]);

  const getPiece = useCallback((row: number, col: number): Piece | null => {
    const dr = flipped ? 7 - row : row;
    const dc = flipped ? 7 - col : col;
    return board[dr][dc];
  }, [board, flipped]);

  const getSquareOverlay = useCallback((sq: string): string | null => {
    if (checkedKingSquare === sq) return "rgba(200,0,0,0.55)";
    if (selectedSquare    === sq) return "rgba(20,85,30,0.5)";
    if (legalMovesSet.has(sq))   return "rgba(20,85,30,0.3)";
    return null;
  }, [checkedKingSquare, selectedSquare, legalMovesSet]);

  // ── Move + animation ──────────────────────────────────────────────────────
  const handlePressWithAnimation = useCallback((sq: string) => {
    if (pendingPromotion) { handleSquarePress(sq); return; }
    if (selectedSquare && legalMovesSet.has(sq) && !animPiece) {
      const fromRC = squareToRC(selectedSquare, flipped);
      const toRC   = squareToRC(sq, flipped);
      const fromX  = fromRC.col * SQUARE_SIZE;
      const fromY  = fromRC.row * SQUARE_SIZE;
      const toX    = toRC.col  * SQUARE_SIZE;
      const toY    = toRC.row  * SQUARE_SIZE;
      const dr = flipped ? 7 - fromRC.row : fromRC.row;
      const dc = flipped ? 7 - fromRC.col : fromRC.col;
      const piece = board[dr][dc];
      if (piece) {
        pendingMove.current = sq;
        animX.setValue(0);
        animY.setValue(0);
        animScale.setValue(1.1);
        setAnimPiece({ piece, fromSq: selectedSquare, toSq: sq, fromX, fromY, toX, toY });
        Animated.parallel([
          Animated.timing(animX, { toValue: toX - fromX, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(animY, { toValue: toY - fromY, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(animScale, { toValue: 1, duration: 160, useNativeDriver: true }),
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

  // ── Keep refs up-to-date so PanResponder always reads fresh values ─────────
  // PanResponder is created once (useRef), never recreated — eliminates the
  // re-render cascade caused by PanResponder recreation on every state change.
  const flippedRef       = useRef(flipped);
  const animPieceRef     = useRef(animPiece);
  const handlePressRef   = useRef(handlePressWithAnimation);
  // ref mirrors userArrows.length so the static PanResponder can check it
  const hasArrowsRef     = useRef(false);
  const arrowFromRef     = useRef<string | null>(null);
  const touchStartRef    = useRef<{ sq: string; px: number; py: number } | null>(null);

  useEffect(() => { flippedRef.current     = flipped;                    }, [flipped]);
  useEffect(() => { animPieceRef.current   = animPiece;                  }, [animPiece]);
  useEffect(() => { handlePressRef.current = handlePressWithAnimation;   }, [handlePressWithAnimation]);
  useEffect(() => { hasArrowsRef.current   = userArrows.length > 0;      }, [userArrows]);

  // ── PanResponder — created ONCE, reads from refs ──────────────────────────
  // Swipe-to-draw: no long-press. As soon as the finger travels > DRAG_THRESHOLD
  // pixels the gesture becomes an arrow-draw and the arrow follows the finger
  // live. A short tap either clears existing arrows or selects/moves a piece.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onStartShouldSetPanResponderCapture: () => false,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const sq = posToSq(locationX, locationY, flippedRef.current);
        touchStartRef.current = { sq: sq ?? "", px: locationX, py: locationY };
      },

      // As soon as the finger moves past DRAG_THRESHOLD start drawing the arrow
      // live.  Only re-render when the square changes (max 64 calls per drag).
      onPanResponderMove: (evt) => {
        const start = touchStartRef.current;
        if (!start) return;
        const { locationX, locationY } = evt.nativeEvent;
        const dx = locationX - start.px;
        const dy = locationY - start.py;

        if (!arrowFromRef.current) {
          // Not yet in draw mode — check if we've crossed the drag threshold
          if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
          // Enter draw mode immediately
          arrowFromRef.current = start.sq;
          prevArrowPreviewSqRef.current = start.sq;
          setArrowFromSq(start.sq);
        }

        const sq = posToSq(locationX, locationY, flippedRef.current);
        if (sq !== prevArrowPreviewSqRef.current) {
          prevArrowPreviewSqRef.current = sq;
          setArrowPreviewTo(sq);
        }
      },

      onPanResponderRelease: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const endSq  = posToSq(locationX, locationY, flippedRef.current);
        const start  = touchStartRef.current;
        const fromSq = arrowFromRef.current;

        touchStartRef.current         = null;
        arrowFromRef.current          = null;
        prevArrowPreviewSqRef.current = null;
        setArrowFromSq(null);
        setArrowPreviewTo(null);

        if (fromSq) {
          // Arrow draw gesture — save if the finger landed on a different square
          if (endSq && endSq !== fromSq) {
            setUserArrows(prev => {
              const idx = prev.findIndex(a => a.from === fromSq && a.to === endSq);
              return idx >= 0 ? prev.filter((_, i) => i !== idx) : [...prev, { from: fromSq, to: endSq }];
            });
          }
          return;
        }

        // Short tap — check movement
        if (!start) return;
        const dx   = locationX - start.px;
        const dy   = locationY - start.py;
        if (Math.sqrt(dx * dx + dy * dy) >= TAP_MOVE_PX) return; // too much drift

        if (hasArrowsRef.current) {
          // Arrows exist → tap just clears them, don't move pieces
          setUserArrows([]);
        } else if (!animPieceRef.current) {
          // No arrows → normal piece logic
          handlePressRef.current(start.sq || endSq || "");
        }
      },

      onPanResponderTerminate: () => {
        arrowFromRef.current          = null;
        touchStartRef.current         = null;
        prevArrowPreviewSqRef.current = null;
        setArrowFromSq(null);
        setArrowPreviewTo(null);
      },
    })
  ).current;

  // ── Square data (memoized) ────────────────────────────────────────────────
  const squareData = useMemo((): SquareData[][] => {
    const rows: SquareData[][] = [];
    for (let row = 0; row < 8; row++) {
      const cols: SquareData[] = [];
      for (let col = 0; col < 8; col++) {
        const sq    = getSquareName(row, col);
        const piece = getPiece(row, col);
        const vr = flipped ? 7 - row : row;
        const vc = flipped ? 7 - col : col;
        const isLight = (vr + vc) % 2 === 0;
        cols.push({
          sq, piece, isLight,
          overlay:         getSquareOverlay(sq),
          isLegalDot:      legalMovesSet.has(sq) && !piece,
          isLegalCapture:  legalMovesSet.has(sq) && !!piece,
          isAnimatingFrom: animPiece?.fromSq === sq,
          annOnDest:       squareAnnotations[sq],
          rank:  flipped ? row + 1 : 8 - row,
          file:  flipped ? String.fromCharCode(104 - col) : String.fromCharCode(97 + col),
          showRankLabel: col === 0,
          showFileLabel: row === 7,
        });
      }
      rows.push(cols);
    }
    return rows;
  }, [getSquareName, getPiece, flipped, getSquareOverlay, legalMovesSet, animPiece, squareAnnotations]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>

        {/* 64 squares */}
        {squareData.map((rowCols, row) => (
          <View key={row} style={styles.row}>
            {rowCols.map((data) => (
              <BoardSquare key={data.sq} {...data} lightColor={lightColor} darkColor={darkColor} />
            ))}
          </View>
        ))}

        {/* Saved user-drawn arrows */}
        {userArrows.map((a, i) => (
          <Arrow key={i} from={a.from} to={a.to} flipped={flipped} color="#1976d2" />
        ))}

        {/* Live preview arrow — follows finger as you drag */}
        {arrowFromSq && arrowPreviewTo && arrowPreviewTo !== arrowFromSq && (
          <Arrow from={arrowFromSq} to={arrowPreviewTo} flipped={flipped} color="#1976d2" />
        )}

        {/* Arrow-from square highlight while holding */}
        {arrowFromSq && (() => {
          const rc = squareToRC(arrowFromSq, flipped);
          return (
            <View
              pointerEvents="none"
              style={[styles.arrowFromHighlight, {
                left: rc.col * SQUARE_SIZE, top: rc.row * SQUARE_SIZE,
                width: SQUARE_SIZE, height: SQUARE_SIZE,
              }]}
            />
          );
        })()}

        {/* Animated piece */}
        {animPiece && (
          <Animated.View
            pointerEvents="none"
            style={[styles.animPiece, {
              left: animPiece.fromX, top: animPiece.fromY,
              width: SQUARE_SIZE, height: SQUARE_SIZE,
              transform: [{ translateX: animX }, { translateY: animY }, { scale: animScale }],
            }]}
          >
            <ChessPiece piece={animPiece.piece} size={SQUARE_SIZE * 0.9} />
          </Animated.View>
        )}

        {/* ── Touch overlay — sits on top of everything, PanResponder attached here.
               absoluteFill guarantees locationX/Y are always board-relative. ── */}
        <View style={styles.touchOverlay} {...panResponder.panHandlers} />
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
  legalDot:   { width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(20,85,30,0.45)", position: "absolute" },
  legalCapture: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 4 },
  rankLabel:  { position: "absolute", top: 1,    left: 2,  fontSize: 9, fontWeight: "700" },
  fileLabel:  { position: "absolute", bottom: 1, right: 2, fontSize: 9, fontWeight: "700" },
  animPiece:  { position: "absolute", justifyContent: "center", alignItems: "center", zIndex: 100 },
  annBadge: {
    position: "absolute", top: 1, right: 1,
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    justifyContent: "center", alignItems: "center", zIndex: 20,
  },
  annBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900", lineHeight: 12, textAlign: "center" },
  arrowFromHighlight: { position: "absolute", backgroundColor: "rgba(25,118,210,0.35)", zIndex: 5 },
  // Transparent layer on top of board — PanResponder target.
  // zIndex 200 ensures it is above pieces, arrows, and animation layers.
  touchOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 200, backgroundColor: "transparent" },
});
