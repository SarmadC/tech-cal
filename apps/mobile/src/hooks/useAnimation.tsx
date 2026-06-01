/**
 * Shared animation primitives following DESIGN.md §Animations.
 *
 * Timing scale (§Timing Scale):
 *   instant  80ms  — toggle states, chip selection
 *   fast    150ms  — label transitions, list entry
 *   standard 220ms — sheet open/close, modal entry
 *   deliberate 320ms — full-screen navigation
 *
 * All animations guard against the system reduceMotion preference (§Principles).
 * All Animated calls use useNativeDriver: true (§Platform Notes).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AccessibilityInfo, Animated } from "react-native";

// §Timing Scale
export const DURATIONS = {
  instant: 80,
  fast: 150,
  standard: 220,
  deliberate: 320,
} as const;

// §Easing — spring token: { damping: 26, stiffness: 200 }
export const SPRING_CONFIG = {
  damping: 26,
  stiffness: 200,
  useNativeDriver: true,
} as const;

/**
 * §Principles — "Reduce, then commit."
 * Returns true when the system reduceMotion accessibility flag is enabled.
 * All animation helpers check this and skip to the final state when true.
 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => sub.remove();
  }, []);

  return reduced;
}

/**
 * §Navigation — Tab switch crossfade (fast, ease-in-out).
 * §List — Staggered list entry (4px upward translate + opacity 0→1, delay per item).
 *
 * Wraps children in an Animated.View that fades + slides up 4px on mount.
 * Pass `delay` for staggered entry (20ms × index, capped at 5 × 20ms = 100ms).
 */
export function AnimatedMount({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const reduced = useReduceMotion();
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduced ? 0 : 4)).current;

  useEffect(() => {
    if (reduced) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATIONS.fast,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATIONS.fast,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
    // Intentionally only runs on mount — delay is a stagger value, not reactive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

/**
 * §Micro-interactions — "Button press: Scale 1.0→0.97 on touchStart, spring back on touchEnd."
 *
 * Returns { scale, onPressIn, onPressOut } to wire into any Pressable + Animated.View pair:
 *
 *   const { scale, onPressIn, onPressOut } = useScalePress();
 *   <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
 *     <Animated.View style={{ transform: [{ scale }] }}>...</Animated.View>
 *   </Pressable>
 */
export function useScalePress() {
  const reduced = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    if (reduced) return;
    Animated.spring(scale, { toValue: 0.97, ...SPRING_CONFIG }).start();
  }, [reduced, scale]);

  const onPressOut = useCallback(() => {
    if (reduced) return;
    Animated.spring(scale, { toValue: 1, ...SPRING_CONFIG }).start();
  }, [reduced, scale]);

  return { scale, onPressIn, onPressOut };
}
