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
import { useSharedValue, withSpring } from "react-native-reanimated";

import { haptics } from "../lib/haptics";

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

// Reanimated spring equivalent of SPRING_CONFIG (no useNativeDriver flag).
const REANIMATED_SPRING = { damping: 26, stiffness: 200 } as const;

/**
 * §Micro-interactions — "Button press: Scale 1.0→0.97 on touchStart, spring back on touchEnd."
 *
 * Runs on the UI thread via Reanimated. The returned `scale` is a shared value;
 * wire it into a Reanimated Animated.View (inline shared values are supported):
 *
 *   const { scale, onPressIn, onPressOut } = useScalePress();
 *   <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
 *     <Animated.View style={{ transform: [{ scale }] }}>...</Animated.View>
 *   </Pressable>
 *
 * Pass { haptic: true } for a light impact on press-in.
 */
export function useScalePress(options?: { haptic?: boolean }) {
  const reduced = useReduceMotion();
  const haptic = options?.haptic ?? false;
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    if (haptic) haptics.light();
    if (reduced) return;
    scale.value = withSpring(0.97, REANIMATED_SPRING);
  }, [haptic, reduced, scale]);

  const onPressOut = useCallback(() => {
    if (reduced) return;
    scale.value = withSpring(1, REANIMATED_SPRING);
  }, [reduced, scale]);

  return { scale, onPressIn, onPressOut };
}
