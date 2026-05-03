import React, { useEffect, useRef } from "react";
import {
  Animated, Dimensions, Easing,
  StyleSheet, Text, View,
} from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

const { width: SW, height: SH } = Dimensions.get("window");
const KNIGHT = 90;

// ─── Inline chess knight (cburnett-style, no network dependency) ─────────────
function KnightSvg({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      {/* base */}
      <Rect x={11} y={35} width={23} height={4.5} rx={2} fill="#dde0e5" stroke="#0f1117" strokeWidth={1} />
      {/* body */}
      <Path
        d="M 22,10 C 32.5,11 38.5,18 38,36 L 15,36 C 15,28 25,31 23,18 Z"
        fill="#f4f4f4" stroke="#0f1117" strokeWidth={1.5} strokeLinejoin="round"
      />
      {/* head */}
      <Path
        d="M 24,18 C 24,21 18,25 16,27 C 13,29 13,31 11,31 C 10,30 12.5,28 11,28 C 10,28 11,29.2 10,30 C 9,30 6,29 5,28 C 4,26 11,25.5 11,22.5 C 11,20 3,15 5,14 C 5,13 9.5,13.5 11.5,13 C 13.5,12.5 13.5,13.5 15.5,13 L 16,10 C 17,10 22,9.5 22,10 Z"
        fill="#f4f4f4" stroke="#0f1117" strokeWidth={1.5} strokeLinejoin="round"
      />
      {/* eye */}
      <Circle cx={9} cy={25.5} r={0.9} fill="#0f1117" />
      {/* nostril */}
      <Ellipse
        cx={14.5} cy={15.5} rx={0.5} ry={1.5}
        fill="#0f1117"
        rotation={30} originX={14.5} originY={15.5}
      />
    </Svg>
  );
}

// ─── Animated splash ──────────────────────────────────────────────────────────
interface Props { onFinish: () => void }

export default function AnimatedSplash({ onFinish }: Props) {
  const posX         = useRef(new Animated.Value(-KNIGHT)).current;
  const posY         = useRef(new Animated.Value(SH * 0.72)).current;
  const knightScale  = useRef(new Animated.Value(1)).current;
  const knightAlpha  = useRef(new Animated.Value(1)).current;
  const logoAlpha    = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.8)).current;
  const screenAlpha  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const HOP_MS = 340;

    // Center of screen (where knight lands)
    const cx = SW / 2 - KNIGHT / 2;
    const cy = SH / 2 - KNIGHT / 2;

    // Waypoints: each hop's destination
    const waypoints = [
      { x: SW * 0.08, y: SH * 0.42 },   // hop 1 – up-right
      { x: SW * 0.38, y: SH * 0.60 },   // hop 2 – down-right
      { x: cx,         y: cy },           // hop 3 – center
    ];

    // Starting positions (known at animation start)
    const startPositions = [
      { x: -KNIGHT,    y: SH * 0.72 },
      { x: SW * 0.08,  y: SH * 0.42 },
      { x: SW * 0.38,  y: SH * 0.60 },
    ];

    // Arc height: enough so peak OVERSHOOTS above the destination
    // (peak Y < destination Y in screen coords — smaller Y = higher on screen)
    const ARC_HEIGHTS = [160, 130, 150];

    function makeHop(fromY: number, toX: number, toY: number, arcH: number) {
      // midY is the arc peak — purposely above (less than) toY so knight
      // visibly rises above the landing spot before coming back down.
      const midY = fromY + (toY - fromY) / 2 - arcH;
      return Animated.parallel([
        Animated.timing(posX, {
          toValue: toX,
          duration: HOP_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(posY, {
            toValue: midY,
            duration: HOP_MS / 2,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(posY, {
            toValue: toY,
            duration: HOP_MS / 2,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]);
    }

    const hop1 = makeHop(startPositions[0].y, waypoints[0].x, waypoints[0].y, ARC_HEIGHTS[0]);
    const hop2 = makeHop(startPositions[1].y, waypoints[1].x, waypoints[1].y, ARC_HEIGHTS[1]);
    const hop3 = makeHop(startPositions[2].y, waypoints[2].x, waypoints[2].y, ARC_HEIGHTS[2]);

    Animated.sequence([
      hop1,
      hop2,
      hop3,
      // Bounce at center
      Animated.parallel([
        Animated.timing(knightScale, { toValue: 1.3,  duration: 160, easing: Easing.out(Easing.back(3)), useNativeDriver: true }),
      ]),
      Animated.timing(knightScale, { toValue: 1.0,  duration: 120, useNativeDriver: true }),
      Animated.delay(100),
      // Logo fades in as knight fades/scales out
      Animated.parallel([
        Animated.timing(logoAlpha,   { toValue: 1,   duration: 400, useNativeDriver: true }),
        Animated.timing(logoScale,   { toValue: 1,   duration: 420, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.timing(knightAlpha, { toValue: 0,   duration: 330, useNativeDriver: true }),
        Animated.timing(knightScale, { toValue: 1.6, duration: 400, useNativeDriver: true }),
      ]),
      // Hold the logo
      Animated.delay(850),
      // Fade whole screen out
      Animated.timing(screenAlpha, {
        toValue: 0,
        duration: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.screen, { opacity: screenAlpha }]} pointerEvents="none">
      {/* ── Knight ── */}
      <Animated.View
        style={[
          styles.knightWrap,
          {
            opacity: knightAlpha,
            transform: [
              { translateX: posX },
              { translateY: posY },
              { scale: knightScale },
            ],
          },
        ]}
      >
        <View style={styles.knightGlow}>
          <KnightSvg size={KNIGHT} />
        </View>
      </Animated.View>

      {/* ── Logo (fades in at center) ── */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoAlpha, transform: [{ scale: logoScale }] },
        ]}
        pointerEvents="none"
      >
        <View style={styles.logoGlow}>
          <KnightSvg size={56} />
        </View>
        <Text style={styles.logoTitle}>Chess Repertoire</Text>
        <Text style={styles.logoSub}>Build your openings</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f1117",
    zIndex: 9999,
  },
  knightWrap: {
    position: "absolute",
    width: KNIGHT,
    height: KNIGHT,
  },
  knightGlow: {
    shadowColor: "#2ecc71",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 20,
    elevation: 14,
  },
  logoWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: SH / 2 - 100,
    alignItems: "center",
  },
  logoGlow: {
    marginBottom: 16,
    shadowColor: "#2ecc71",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 12,
  },
  logoTitle: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.4,
    fontFamily: "Inter_700Bold",
  },
  logoSub: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 13,
    marginTop: 7,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontFamily: "Inter_400Regular",
  },
});
