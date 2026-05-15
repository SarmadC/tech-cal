import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { G, Polygon } from 'react-native-svg';

import {
  loadingLogoAnimation,
  loadingLogoSpec,
  loadingLogoTones,
  type LoadingLogoArmId,
} from '@kurecal/brand';

import { useAppTheme } from '../../providers/ThemeProvider';

const AnimatedGroup = Animated.createAnimatedComponent(G);

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setPrefersReducedMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setPrefersReducedMotion
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return prefersReducedMotion;
}

export interface BrandLoadingLogoProps {
  animated?: boolean;
  color?: string;
  inline?: boolean;
  label?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const floatEase = Easing.inOut(Easing.sin);
const pulseEase = Easing.inOut(Easing.sin);

function createPulseLoop(value: Animated.Value, armId: LoadingLogoArmId) {
  const duration = loadingLogoAnimation.pulseDurationMs;
  const halfDuration = duration / 2;
  const minOpacity = loadingLogoAnimation.armOpacityMin;
  const delay = loadingLogoAnimation.pulseDelaysMs[armId];

  const pulseUp = (segmentDuration = halfDuration) =>
    Animated.timing(value, {
      duration: segmentDuration,
      isInteraction: false,
      easing: pulseEase,
      toValue: 1,
      useNativeDriver: false,
    });

  const pulseDown = (segmentDuration = halfDuration) =>
    Animated.timing(value, {
      duration: segmentDuration,
      isInteraction: false,
      easing: pulseEase,
      toValue: minOpacity,
      useNativeDriver: false,
    });

  const fullLoop = Animated.loop(Animated.sequence([pulseUp(), pulseDown()]));
  const progress = (((-delay % duration) + duration) % duration) / duration;

  if (progress === 0) {
    value.setValue(minOpacity);
    return fullLoop;
  }

  if (progress < 0.5) {
    const progressToPeak = progress / 0.5;
    const currentOpacity = minOpacity + (1 - minOpacity) * progressToPeak;
    const remainingUpDuration = Math.max(
      1,
      Math.round((0.5 - progress) * duration)
    );

    value.setValue(currentOpacity);

    return Animated.sequence([
      pulseUp(remainingUpDuration),
      pulseDown(),
      fullLoop,
    ]);
  }

  const progressFromPeak = (progress - 0.5) / 0.5;
  const currentOpacity = 1 - (1 - minOpacity) * progressFromPeak;
  const remainingDownDuration = Math.max(
    1,
    Math.round((1 - progress) * duration)
  );

  value.setValue(currentOpacity);

  return Animated.sequence([pulseDown(remainingDownDuration), fullLoop]);
}

export function BrandLoadingLogo({
  animated = true,
  color,
  inline = false,
  label,
  size = 48,
  style,
}: BrandLoadingLogoProps) {
  const { tokens } = useAppTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedColor = color ?? tokens.colors.textPrimary;
  const shouldAnimate = animated && !prefersReducedMotion;
  const floatY = useRef(new Animated.Value(0)).current;
  const armValuesRef = useRef(
    Object.fromEntries(
      loadingLogoSpec.arms.map((arm) => [arm.id, new Animated.Value(1)])
    ) as Record<LoadingLogoArmId, Animated.Value>
  );

  useEffect(() => {
    if (!shouldAnimate) {
      floatY.stopAnimation();
      floatY.setValue(0);

      loadingLogoSpec.arms.forEach((arm) => {
        armValuesRef.current[arm.id].stopAnimation();
        armValuesRef.current[arm.id].setValue(1);
      });

      return;
    }

    const runningAnimations: Animated.CompositeAnimation[] = [];

    if (!inline) {
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(floatY, {
            duration: loadingLogoAnimation.floatDurationMs / 2,
            easing: floatEase,
            isInteraction: false,
            toValue: -loadingLogoAnimation.floatDistancePx,
            useNativeDriver: true,
          }),
          Animated.timing(floatY, {
            duration: loadingLogoAnimation.floatDurationMs / 2,
            easing: floatEase,
            isInteraction: false,
            toValue: 0,
            useNativeDriver: true,
          }),
        ])
      );

      runningAnimations.push(floatAnimation);
      floatAnimation.start();
    } else {
      floatY.setValue(0);
    }

    loadingLogoSpec.arms.forEach((arm) => {
      const animation = createPulseLoop(armValuesRef.current[arm.id], arm.id);
      runningAnimations.push(animation);
      animation.start();
    });

    return () => {
      runningAnimations.forEach((animation) => animation.stop());
    };
  }, [floatY, inline, shouldAnimate]);

  return (
    <Animated.View
      accessibilityLabel={label ?? undefined}
      accessible={Boolean(label)}
      style={[
        styles.root,
        {
          height: size,
          transform: [{ translateY: floatY }],
          width: size,
        },
        style,
      ]}
    >
      <Svg fill="none" height={size} viewBox={loadingLogoSpec.viewBox} width={size}>
        {loadingLogoSpec.arms.map((arm) => (
          <AnimatedGroup key={arm.id} opacity={armValuesRef.current[arm.id]}>
            {arm.polygons.map((polygon, index) => (
              <Polygon
                fill={resolvedColor}
                fillOpacity={loadingLogoTones[polygon.tone]}
                key={`${arm.id}-${index}`}
                points={polygon.points}
              />
            ))}
          </AnimatedGroup>
        ))}
        <Polygon
          fill={resolvedColor}
          fillOpacity={loadingLogoTones[loadingLogoSpec.centerCap.tone]}
          points={loadingLogoSpec.centerCap.points}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
