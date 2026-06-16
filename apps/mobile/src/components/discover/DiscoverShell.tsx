import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react";
import { BlurView } from "expo-blur";
import { FlashList } from "@shopify/flash-list";

import { useReduceMotion } from "../../hooks/useAnimation";
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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useAppTheme } from "../../providers/ThemeProvider";
import { useScrollControlsVisibility } from "../../hooks/useScrollControlsVisibility";

interface DiscoverShellProps<T> extends PropsWithChildren {
  contentStyle?: StyleProp<ViewStyle>;
  header: (compact: boolean, controlsVisible: boolean) => ReactNode;
  onControlsVisibilityChange?: (visible: boolean) => void;
  refreshControl?: ReactElement<RefreshControlProps>;
  // List mode — when data/renderItem are provided the body renders as a
  // virtualized FlashList: `children` become the list header and `listFooter`
  // trails the rows.
  data?: T[];
  keyExtractor?: (item: T, index: number) => string;
  renderItem?: (item: T, index: number) => ReactNode;
  onEndReached?: () => void;
  listFooter?: ReactNode;
}

export function DiscoverShell<T>({
  children,
  contentStyle,
  header,
  onControlsVisibilityChange,
  refreshControl,
  data,
  keyExtractor,
  renderItem,
  onEndReached,
  listFooter,
}: DiscoverShellProps<T>) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [compact, setCompact] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
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

  const handleOffsetChange = useCallback(
    (offsetY: number) => {
      const nextCompact = offsetY > 28;
      if (nextCompact !== compact) {
        setCompact(nextCompact);
      }
    },
    [compact],
  );
  const handleVisibilityChange = useCallback(
    (visible: boolean) => {
      setControlsVisible(visible);
      onControlsVisibilityChange?.(visible);
    },
    [onControlsVisibilityChange],
  );
  const handleScroll = useScrollControlsVisibility({
    onBeforeVisibilityChange: () => {
      if (!reduceMotion) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    },
    onOffsetChange: handleOffsetChange,
    onVisibilityChange: handleVisibilityChange,
  });

  return (
    <SafeAreaView
      edges={["left", "right"]}
      style={[
        styles.safeArea,
        { backgroundColor: tokens.colors.discoverShell },
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: tokens.colors.discoverShell },
        ]}
      />

      <View
        onLayout={handleHeaderLayout}
        style={[
          styles.headerWrap,
          {
            backgroundColor: compact
              ? "transparent"
              : tokens.colors.discoverShell,
            borderBottomColor: compact
              ? tokens.colors.discoverToolbarBorder
              : "transparent",
            borderBottomWidth: StyleSheet.hairlineWidth,
            paddingTop: insets.top + (compact ? 6 : 10),
            paddingBottom: controlsVisible ? (compact ? 8 : 10) : 4,
          },
        ]}
      >
        {compact ? (
          <BlurView
            intensity={80}
            tint={
              tokens.mode === "dark"
                ? "systemChromeMaterialDark"
                : "systemChromeMaterialLight"
            }
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={styles.headerInner}>
          {header(compact, controlsVisible)}
        </View>
      </View>

      {data && renderItem ? (
        <FlashList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => (
            <View style={styles.rowInner}>{renderItem(item, index)}</View>
          )}
          ListHeaderComponent={
            <View style={styles.contentInner}>{children}</View>
          }
          ListFooterComponent={
            listFooter ? (
              <View style={styles.contentInner}>{listFooter}</View>
            ) : null
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerOffset + 8,
              paddingBottom: tokens.spacing.tabBarBottom,
            },
            contentStyle,
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          refreshControl={refreshControl}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerOffset + 8,
              paddingBottom: tokens.spacing.tabBarBottom,
            },
            contentStyle,
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          refreshControl={refreshControl}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentInner}>{children}</View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  contentInner: {
    alignSelf: "center",
    gap: 8,
    maxWidth: 430,
    width: "100%",
  },
  headerInner: {
    alignSelf: "center",
    maxWidth: 430,
    width: "100%",
  },
  rowInner: {
    alignSelf: "center",
    maxWidth: 430,
    width: "100%",
  },
  headerWrap: {
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  safeArea: {
    flex: 1,
  },
});
