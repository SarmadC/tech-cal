import { useEffect, useRef, useState, type PropsWithChildren, type ReactElement, type ReactNode } from 'react';
import {
  LayoutChangeEvent,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../providers/ThemeProvider';
import { useTabBarVisibility } from '../chrome/TabBarVisibilityProvider';

interface DiscoverShellProps extends PropsWithChildren {
  contentStyle?: StyleProp<ViewStyle>;
  header: (compact: boolean, controlsVisible: boolean) => ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
}

export function DiscoverShell({
  children,
  contentStyle,
  header,
  refreshControl,
}: DiscoverShellProps) {
  const { tokens } = useAppTheme();
  const { handleScroll, isVisible } = useTabBarVisibility();
  const insets = useSafeAreaInsets();
  const [compact, setCompact] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const lastOffsetRef = useRef(0);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  function handleHeaderLayout(event: LayoutChangeEvent) {
    const nextHeight = event.nativeEvent.layout.height;

    if (Math.abs((headerHeight ?? 0) - nextHeight) > 1) {
      setHeaderHeight(nextHeight);
    }
  }

  const headerOffset = headerHeight ?? insets.top + 176;

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.safeArea, { backgroundColor: tokens.colors.discoverShell }]}
    >
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: tokens.colors.discoverShell }]}
      />

      <View
        onLayout={handleHeaderLayout}
        style={[
          styles.headerWrap,
          {
            backgroundColor: tokens.colors.discoverShell,
            paddingTop: insets.top + (compact ? 6 : 10),
            paddingBottom: controlsVisible ? (compact ? 8 : 10) : 4,
          },
        ]}
      >
        <View style={styles.headerInner}>{header(compact, controlsVisible)}</View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerOffset + 8,
            paddingBottom: isVisible ? tokens.spacing.tabBarBottom : Math.max(insets.bottom + 20, 28),
          },
          contentStyle,
        ]}
        onScroll={(event) => {
          const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
          const nextCompact = offsetY > 28;
          const delta = offsetY - lastOffsetRef.current;
          lastOffsetRef.current = offsetY;

          if (nextCompact !== compact) {
            setCompact(nextCompact);
          }

          if (offsetY <= 8 && !controlsVisible) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setControlsVisible(true);
          } else if (delta > 12 && offsetY > 40 && controlsVisible) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setControlsVisible(false);
          } else if (delta < -8 && !controlsVisible) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setControlsVisible(true);
          }

          handleScroll(offsetY);
        }}
        refreshControl={refreshControl}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  contentInner: {
    alignSelf: 'center',
    gap: 8,
    maxWidth: 430,
    width: '100%',
  },
  headerInner: {
    alignSelf: 'center',
    maxWidth: 430,
    width: '100%',
  },
  headerWrap: {
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  safeArea: {
    flex: 1,
  },
});
