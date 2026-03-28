import { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  LayoutChangeEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/providers/ThemeProvider';

interface CalendarShellProps extends PropsWithChildren {
  header: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}

export function CalendarShell({
  header,
  children,
  refreshing = false,
  onRefresh,
  contentStyle,
}: CalendarShellProps) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);

  function handleHeaderLayout(event: LayoutChangeEvent) {
    const nextHeight = event.nativeEvent.layout.height;

    if (Math.abs((headerHeight ?? 0) - nextHeight) > 1) {
      setHeaderHeight(nextHeight);
    }
  }

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
            paddingTop: insets.top + 10,
            paddingBottom: 10,
          },
        ]}
      >
        <View style={styles.headerInner}>{header}</View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: (headerHeight ?? insets.top + 82) + 10,
            paddingBottom: tokens.spacing.tabBarBottom,
          },
          contentStyle,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.colors.accent}
            />
          ) : undefined
        }
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
    zIndex: 20,
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
    gap: 10,
  },
});
