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
import ReAnimated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  Easing as ReanimatedEasing 
} from "react-native-reanimated";
import { useBoard, useBoardSelection } from "@/context/BoardContext";
import { fenToBoard, getCheckedKingSquare } from "@/utils/chess";
import { ANNOTATION_COLORS, ANNOTATION_SYMBOLS, MoveAnnotation, Piece, PieceColor } from "@/types/chess";
import ChessPiece from "@/components/ChessPiece";
import PromotionPicker from "@/components/PromotionPicker";

const { width } = Dimensions.get("window");
const BOARD_SIZE  = Math.min(width - 16, 400);
const SQUARE_SIZE = BOARD_SIZE / 8;

const DRAG_THRESHOLD = 14;
const TAP_MOVE_PX    = 14;

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnimPiece {
  piece: Piece;
  fromSq: string; toSq: string;
  fromX: number; fromY: number;
  toX: number;   toY: number;
}
interface UserArrow { from: string; to: string }

// Stripped-down square descriptor — NO selection/overlay fields.
// This means squareData only recomputes when pieces actually move.
interface SquareData {
  sq: string;
  piece: Piece | null;
  isLight: boolean;
  isAnimatingFrom: boolean;
  annOnDest: { annotation: MoveAnnotation; from: string } | undefined;
  rank: number; file: string;
  showRankLabel: boolean; showFileLabel: boolean;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function squareToRC(sq: string, flipped: boolean) {
  const col  = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  const row  = 7 - rank;
  return flipped ? { row: 7 - row, col: 7 - col } : { row, col };
}

function squareCenter(sq: string, flipped: boolean) {
  const { row, col } = squareToRC(sq, flipped);
  return { x: (col + 0.5) * SQUARE_SIZE, y: (row + 0.5) * SQUARE_SIZE };
}

function posToSq(px: number, py: number, flipped: boolean): string | null {
  const col = Math.floor(px / SQUARE_SIZE);
  const row = Math.floor(py / SQUARE_SIZE);
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const c = flipped ? 7 - col : col;
  const r = flipped ? row : 7 - row;
  return String.fromCharCode(97 + c) + (r + 1);
}

// ─── Arrow SVG ────────────────────────────────────────────────────────────────
const Arrow = memo(function Arrow({
  from, to, flipped, color, thin = false,
}: { from: string; to: string; flipped: boolean; color: string; thin?: boolean }) {
  const a = squareCenter(from, flipped);
  const b = squareCenter(to,   flipped);
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;
  const ux = dx / len, uy = dy / len;
  const arrowW  = thin ? SQUARE_SIZE * 0.065 : SQUARE_SIZE * 0.12;
  const headLen = thin ? SQUARE_SIZE * 0.22  : SQUARE_SIZE * 0.34;
  const headW   = thin ? SQUARE_SIZE * 0.17  : SQUARE_SIZE * 0.28;
  const x1 = a.x + ux * SQUARE_SIZE * 0.28, y1 = a.y + uy * SQUARE_SIZE * 0.28;
  const x2 = b.x - ux * headLen,            y2 = b.y - uy * headLen;
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

// ─── Overlay layer ────────────────────────────────────────────────────────────
// Renders selection highlight, legal-move dots/rings, and check tint.
// Lives in its own memoized component so tapping a piece ONLY re-renders this
// layer — the 64 BoardSquare cells are completely untouched.
const OverlayLayer = memo(function OverlayLayer({
  selectedSquare, legalMovesSet, legalCaptures, checkedKingSquare, flipped,
}: {
  selectedSquare:    string | null;
  legalMovesSet:     Set<string>;
  legalCaptures:     Set<string>;
  checkedKingSquare: string | null;
  flipped:           boolean;
}) {
  const nodes: React.ReactNode[] = [];

  if (checkedKingSquare) {
    const { row, col } = squareToRC(checkedKingSquare, flipped);
    nodes.push(
      <View key="chk" pointerEvents="none" style={[
        styles.overlayFill,
        { left: col * SQUARE_SIZE, top: row * SQUARE_SIZE, backgroundColor: "rgba(200,0,0,0.55)" },
      ]} />,
    );
  }

  if (selectedSquare) {
    const { row, col } = squareToRC(selectedSquare, flipped);
    nodes.push(
      <View key="sel" pointerEvents="none" style={[
        styles.overlayFill,
        { left: col * SQUARE_SIZE, top: row * SQUARE_SIZE, backgroundColor: "rgba(20,85,30,0.5)" },
      ]} />,
    );
  }

  for (const sq of legalMovesSet) {
    const { row, col } = squareToRC(sq, flipped);
    if (legalCaptures.has(sq)) {
      nodes.push(
        <View key={`lc-${sq}`} pointerEvents="none" style={[
          styles.overlayFill,
          { left: col * SQUARE_SIZE, top: row * SQUARE_SIZE,
            borderWidth: 4, borderColor: "rgba(20,85,30,0.5)" },
        ]} />,
      );
    } else {
      nodes.push(
        <View key={`ld-${sq}`} pointerEvents="none" style={[
          styles.legalDotAbs,
          { left: col * SQUARE_SIZE + SQUARE_SIZE * 0.5 - 7,
            top:  row * SQUARE_SIZE + SQUARE_SIZE * 0.5 - 7 },
        ]} />,
      );
    }
  }

  return <>{nodes}</>;
});

// ─── Single square (static: piece + labels + annotation) ─────────────────────
// Does NOT receive selection/overlay props → only re-renders when a piece
// actually moves to/from that square, or when annotations change.
const BoardSquare = memo(function BoardSquare({
  piece, isLight, lightColor, darkColor,
  isAnimatingFrom, annOnDest, rank, file, showRankLabel, showFileLabel,
}: Omit<SquareData, "sq"> & { lightColor: string; darkColor: string }) {
  const bg         = isLight ? lightColor : darkColor;
  const labelColor = isLight ? darkColor  : lightColor;
  const annColor   = annOnDest ? ANNOTATION_COLORS[annOnDest.annotation] : undefined;
  return (
    <View style={[styles.square, { width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: bg }]}>
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

// ─── Main board ───────────────────────────────────────────────────────────────
export default function ChessBoard() {
  // Selection state (tap-frequency) — only ChessBoard reads this context,
  // so MoveTree / BoardControls are never triggered by piece selection.
  const {
    selectedSquare, legalMovesSet,
    handleSquarePress, pendingPromotion, confirmPromotion, cancelPromotion,
  } = useBoardSelection();

  // Board / navigation state (move-frequency)
  const {
    fen, flipped,
    boardTheme, customLight, customDark,
    currentPath, squareAnnotations,
  } = useBoard();

  const board           = useMemo(() => fenToBoard(fen), [fen]);
  const activeColor     = fen.split(" ")[1] as PieceColor;
  const checkedKingSquare = useMemo(() => getCheckedKingSquare(fen), [fen]);
  const lightColor      = boardTheme.id === "custom" ? customLight : boardTheme.lightSquare;
  const darkColor       = boardTheme.id === "custom" ? customDark  : boardTheme.darkSquare;

  // ── Piece animation (Reanimated worklets for true 60/120fps) ────────────
  const [animPiece, setAnimPiece] = useState<AnimPiece | null>(null);
  const animX        = useSharedValue(0);
  const animY        = useSharedValue(0);
  const animScale    = useSharedValue(1);
  const pendingMove  = useRef<string | null>(null);
  const activeAnim   = useRef<Animated.CompositeAnimation | null>(null);

  const animatedPieceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animX.value },
      { translateY: animY.value },
      { scale: animScale.value },
    ],
  }));

  // Cleanup: stop any in-flight animation on unmount to prevent setState on
  // an unmounted component (memory leak / React warning).
  useEffect(() => {
    return () => {
      activeAnim.current?.stop();
      pendingMove.current = null;
    };
  }, []);

  // ── User arrows ───────────────────────────────────────────────────────────
  const [userArrows,    setUserArrows]    = useState<UserArrow[]>([]);
  const [arrowFromSq,   setArrowFromSq]   = useState<string | null>(null);
  const [arrowPreviewTo, setArrowPreviewTo] = useState<string | null>(null);
  const prevArrowPreviewSqRef = useRef<string | null>(null);

  // Clear arrows when a move is played
  const prevPathLen = useRef(currentPath.length);
  useEffect(() => {
    if (currentPath.length !== prevPathLen.current) {
      setUserArrows([]);
      prevPathLen.current = currentPath.length;
    }
  }, [currentPath.length]);

  // ── legalCaptures: needed by OverlayLayer to show rings vs dots ──────────
  // Recomputes when legalMovesSet changes (i.e. on piece selection) —
  // does NOT cause squareData/BoardGrid to recompute.
  const legalCaptures = useMemo(() => {
    const caps = new Set<string>();
    for (const sq of legalMovesSet) {
      const col  = sq.charCodeAt(0) - 97;
      const rank = parseInt(sq[1]) - 1;
      const row  = 7 - rank;
      if (board[row]?.[col]) caps.add(sq);
    }
    return caps;
  }, [legalMovesSet, board]);

  // ── Move + animation (Reanimated on UI thread) ────────────────────────────
  const handlePressWithAnimation = useCallback((sq: string) => {
    if (pendingPromotion) { handleSquarePress(sq); return; }
    if (selectedSquare && legalMovesSet.has(sq) && !animPiece) {
      const fromRC = squareToRC(selectedSquare, flipped);
      const toRC   = squareToRC(sq, flipped);
      const fromX  = fromRC.col * SQUARE_SIZE, fromY = fromRC.row * SQUARE_SIZE;
      const toX    = toRC.col  * SQUARE_SIZE,  toY   = toRC.row  * SQUARE_SIZE;
      const dr = flipped ? 7 - fromRC.row : fromRC.row;
      const dc = flipped ? 7 - fromRC.col : fromRC.col;
      const piece = board[dr][dc];
      if (piece) {
        pendingMove.current = sq;
        animX.value = 0;
        animY.value = 0;
        animScale.value = 1.1;
        setAnimPiece({ piece, fromSq: selectedSquare, toSq: sq, fromX, fromY, toX, toY });
        
        animX.value = withTiming(toX - fromX, { duration: 155, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });
        animY.value = withTiming(toY - fromY, { duration: 155, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });
        animScale.value = withTiming(1, { duration: 155 }, () => {
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

  // ── Refs for the stable PanResponder ─────────────────────────────────────
  const flippedRef     = useRef(flipped);
  const animPieceRef   = useRef(animPiece);
  const handlePressRef = useRef(handlePressWithAnimation);
  const hasArrowsRef   = useRef(false);
  const arrowFromRef   = useRef<string | null>(null);
  const touchStartRef  = useRef<{ sq: string; px: number; py: number } | null>(null);

  useEffect(() => { flippedRef.current     = flipped;                  }, [flipped]);
  useEffect(() => { animPieceRef.current   = animPiece;                }, [animPiece]);
  useEffect(() => { handlePressRef.current = handlePressWithAnimation; }, [handlePressWithAnimation]);
  useEffect(() => { hasArrowsRef.current   = userArrows.length > 0;   }, [userArrows]);

  // ── PanResponder — created once ───────────────────────────────────────────
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

      onPanResponderMove: (evt) => {
        const start = touchStartRef.current;
        if (!start) return;
        const { locationX, locationY } = evt.nativeEvent;
        const dx = locationX - start.px, dy = locationY - start.py;

        if (!arrowFromRef.current) {
          if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
          arrowFromRef.current          = start.sq;
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
          if (endSq && endSq !== fromSq) {
            setUserArrows(prev => {
              const idx = prev.findIndex(a => a.from === fromSq && a.to === endSq);
              return idx >= 0 ? prev.filter((_, i) => i !== idx) : [...prev, { from: fromSq, to: endSq }];
            });
          }
          return;
        }

        if (!start) return;
        const dx = locationX - start.px, dy = locationY - start.py;
        if (Math.sqrt(dx * dx + dy * dy) >= TAP_MOVE_PX) return;

        if (hasArrowsRef.current) {
          setUserArrows([]);
        } else if (!animPieceRef.current) {
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

  // ── Square data — NO selection state in deps ──────────────────────────────
  // This only recomputes when pieces actually move (board/flipped/animPiece
  // change), NOT when the user taps to select a piece. Taps only re-render
  // the lightweight OverlayLayer above.
  const squareData = useMemo((): SquareData[][] => {
    const rows: SquareData[][] = [];
    for (let row = 0; row < 8; row++) {
      const cols: SquareData[] = [];
      for (let col = 0; col < 8; col++) {
        const r  = flipped ? row : 7 - row;
        const c  = flipped ? 7 - col : col;
        const sq = String.fromCharCode(97 + c) + (r + 1);

        const dr    = flipped ? 7 - row : row;
        const dc    = flipped ? 7 - col : col;
        const piece = board[dr][dc];

        const vr      = flipped ? 7 - row : row;
        const vc      = flipped ? 7 - col : col;
        const isLight = (vr + vc) % 2 === 0;

        cols.push({
          sq, piece, isLight,
          isAnimatingFrom: animPiece?.fromSq === sq,
          annOnDest:       squareAnnotations[sq],
          rank:         flipped ? row + 1 : 8 - row,
          file:         flipped ? String.fromCharCode(104 - col) : String.fromCharCode(97 + col),
          showRankLabel: col === 0,
          showFileLabel: row === 7,
        });
      }
      rows.push(cols);
    }
    return rows;
  }, [board, flipped, animPiece, squareAnnotations]);
  // ← selectedSquare / legalMovesSet / checkedKingSquare intentionally absent

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>

        {/* Layer 1 — static 8×8 grid (pieces + labels + annotation badges)
            Only re-renders when pieces move, board flips, or annotations change. */}
        {squareData.map((rowCols, row) => (
          <View key={row} style={styles.row}>
            {rowCols.map((data) => (
              <BoardSquare
                key={data.sq}
                piece={data.piece}
                isLight={data.isLight}
                lightColor={lightColor}
                darkColor={darkColor}
                isAnimatingFrom={data.isAnimatingFrom}
                annOnDest={data.annOnDest}
                rank={data.rank}
                file={data.file}
                showRankLabel={data.showRankLabel}
                showFileLabel={data.showFileLabel}
              />
            ))}
          </View>
        ))}

        {/* Layer 2 — dynamic overlays (selection / legal moves / check tint)
            Only this layer re-renders on piece selection — board squares stay frozen. */}
        <OverlayLayer
          selectedSquare={selectedSquare}
          legalMovesSet={legalMovesSet}
          legalCaptures={legalCaptures}
          checkedKingSquare={checkedKingSquare}
          flipped={flipped}
        />

        {/* Layer 3 — user arrows */}
        {userArrows.map((a, i) => (
          <Arrow key={i} from={a.from} to={a.to} flipped={flipped} color="#1976d2" />
        ))}

        {/* Layer 3b — live preview arrow while swiping */}
        {arrowFromSq && arrowPreviewTo && arrowPreviewTo !== arrowFromSq && (
          <Arrow from={arrowFromSq} to={arrowPreviewTo} flipped={flipped} color="#1976d2" />
        )}

        {/* Arrow-from square highlight */}
        {arrowFromSq && (() => {
          const { row, col } = squareToRC(arrowFromSq, flipped);
          return (
            <View pointerEvents="none" style={[styles.arrowFromHighlight, {
              left: col * SQUARE_SIZE, top: row * SQUARE_SIZE,
              width: SQUARE_SIZE, height: SQUARE_SIZE,
            }]} />
          );
        })()}

        {/* Layer 4 — animated piece (floats above board during move, Reanimated) */}
        {animPiece && (
          <ReAnimated.View pointerEvents="none" style={[styles.animPiece, {
            left: animPiece.fromX, top: animPiece.fromY,
            width: SQUARE_SIZE, height: SQUARE_SIZE,
          }, animatedPieceStyle]}>
            <ChessPiece piece={animPiece.piece} size={SQUARE_SIZE * 0.9} />
          </ReAnimated.View>
        )}

        {/* Touch overlay — receives all gestures, sits topmost */}
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
  container:    { alignItems: "center", position: "relative" },
  board:        { borderWidth: 2, borderColor: "#2d3748", overflow: "hidden", position: "relative" },
  row:          { flexDirection: "row" },
  square:       { justifyContent: "center", alignItems: "center", position: "relative" },
  rankLabel:    { position: "absolute", top: 1,    left: 2,  fontSize: 9, fontWeight: "700" },
  fileLabel:    { position: "absolute", bottom: 1, right: 2, fontSize: 9, fontWeight: "700" },
  animPiece:    { position: "absolute", justifyContent: "center", alignItems: "center", zIndex: 100 },
  annBadge: {
    position: "absolute", top: 1, right: 1,
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    justifyContent: "center", alignItems: "center", zIndex: 20,
  },
  annBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900", lineHeight: 12, textAlign: "center" },

  // Overlay layer styles
  overlayFill: {
    position: "absolute",
    width: SQUARE_SIZE, height: SQUARE_SIZE,
  },
  legalDotAbs: {
    position: "absolute",
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "rgba(20,85,30,0.45)",
  },

  arrowFromHighlight: { position: "absolute", backgroundColor: "rgba(25,118,210,0.35)", zIndex: 5 },
  touchOverlay:       { ...StyleSheet.absoluteFillObject, zIndex: 200, backgroundColor: "transparent" },
});
