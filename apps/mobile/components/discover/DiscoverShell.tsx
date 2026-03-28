import { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/providers/ThemeProvider';

interface DiscoverShellProps extends PropsWithChildren {
  header: (compact: boolean) => ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function DiscoverShell({ header, children, contentStyle }: DiscoverShellProps) {
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.colors.discoverShell }]} edges={['left', 'right']}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.discoverShell }]} />

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
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentInner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInner: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: 16,
  },
  contentInner: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    gap: 8,
  },
});
