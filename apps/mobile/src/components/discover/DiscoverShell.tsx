import { useState, type PropsWithChildren, type ReactElement, type ReactNode } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../providers/ThemeProvider';

interface DiscoverShellProps extends PropsWithChildren {
  contentStyle?: StyleProp<ViewStyle>;
  header: (compact: boolean) => ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
}

export function DiscoverShell({
  children,
  contentStyle,
  header,
  refreshControl,
}: DiscoverShellProps) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [compact, setCompact] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);

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
            backgroundColor: tokens.colors.discoverHeader,
            borderBottomColor: tokens.colors.discoverToolbarBorder,
            paddingTop: insets.top + (compact ? 6 : 10),
            paddingBottom: compact ? 8 : 10,
          },
        ]}
      >
        <View style={styles.headerInner}>{header(compact)}</View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerOffset + 8,
            paddingBottom: tokens.spacing.tabBarBottom,
          },
          contentStyle,
        ]}
        onScroll={(event) => {
          const nextCompact = event.nativeEvent.contentOffset.y > 28;
          if (nextCompact !== compact) {
            setCompact(nextCompact);
          }
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
