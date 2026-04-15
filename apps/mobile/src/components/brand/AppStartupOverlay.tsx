import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { useAuth } from '../../context/AuthProvider';
import { useAppTheme } from '../../providers/ThemeProvider';
import { BrandLoadingLogo } from './BrandLoadingLogo';

const FADE_DURATION_MS = 220;

export function AppStartupOverlay() {
  const { isCompletingAuth, loading } = useAuth();
  const { tokens } = useAppTheme();
  const visible = loading || isCompletingAuth;
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(opacity, {
        duration: FADE_DURATION_MS,
        easing: Easing.out(Easing.ease),
        toValue: 1,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(opacity, {
      duration: FADE_DURATION_MS,
      easing: Easing.in(Easing.ease),
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [opacity, visible]);

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFillObject,
        styles.overlay,
        {
          backgroundColor: tokens.colors.shell,
          opacity,
        },
      ]}
    >
      <BrandLoadingLogo
        color={tokens.colors.textPrimary}
        label="Loading"
        size={92}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});
