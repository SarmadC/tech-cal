import {
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from "react";
import {
  type LayoutChangeEvent,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useScalePress } from "../../hooks/useAnimation";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useAppTheme } from "../../providers/ThemeProvider";
import { useTabBarVisibility } from "./TabBarVisibilityProvider";

interface MobilePageProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  headerHidden?: boolean;
  showAccentGlow?: boolean;
  footerInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<ScrollView | null>;
}

export function MobilePage({
  eyebrow,
  title,
  subtitle,
  action,
  headerHidden = false,
  showAccentGlow = false,
  children,
  footerInset,
  contentStyle,
  scrollRef,
}: MobilePageProps) {
  const { tokens } = useAppTheme();
  const { handleScroll, isVisible } = useTabBarVisibility();
  const insets = useSafeAreaInsets();
  const [compact, setCompact] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const bottomInset =
    footerInset ??
    (isVisible
      ? tokens.spacing.tabBarBottom
      : Math.max(insets.bottom + 16, 24));

  const fallbackHeaderOffset = useMemo(
    () => (headerHidden ? insets.top + 8 : insets.top + (subtitle ? 112 : 92)),
    [headerHidden, insets.top, subtitle],
  );
  const headerOffset = headerHidden
    ? fallbackHeaderOffset
    : (headerHeight ?? fallbackHeaderOffset);

  function handleHeaderLayout(event: LayoutChangeEvent) {
    const nextHeight = event.nativeEvent.layout.height;
    if (Math.abs((headerHeight ?? 0) - nextHeight) > 1) {
      setHeaderHeight(nextHeight);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: tokens.colors.shell }]}
      edges={["left", "right"]}
    >
      <LinearGradient
        colors={tokens.gradients.page}
        style={StyleSheet.absoluteFill}
      />
      {showAccentGlow ? (
        <LinearGradient
          colors={tokens.gradients.accent}
          style={styles.accentGlow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      ) : null}
      {!headerHidden ? (
        <View
          onLayout={handleHeaderLayout}
          style={[
            styles.headerWrap,
            {
              backgroundColor: tokens.colors.header,
              borderBottomColor: tokens.colors.headerBorder,
              paddingTop: insets.top + 8,
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.headerCopy}>
              {eyebrow ? (
                <Text
                  style={[
                    styles.eyebrow,
                    {
                      color: tokens.colors.textTertiary,
                      fontFamily: tokens.typography.sans,
                      opacity: compact ? 0.4 : 1,
                    },
                  ]}
                >
                  {eyebrow.toUpperCase()}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.title,
                  {
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: compact ? 20 : tokens.typography.display,
                    lineHeight: compact ? 24 : 29,
                  },
                ]}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      opacity: compact ? 0.75 : 1,
                    },
                  ]}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {action ? <View style={styles.headerAction}>{action}</View> : null}
          </View>
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerOffset,
            paddingBottom: bottomInset,
            paddingHorizontal: tokens.spacing.page,
          },
          contentStyle,
        ]}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const nextCompact = offsetY > 22;
          if (nextCompact !== compact) {
            setCompact(nextCompact);
          }
          handleScroll(offsetY);
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function HeaderActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.actionButton,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  accentGlow: {
    position: "absolute",
    top: -80,
    left: -24,
    right: 56,
    height: 240,
    borderRadius: 240,
  },
  headerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
    paddingTop: 2,
  },
  headerAction: {
    paddingTop: 2,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.66,
    fontWeight: "600",
  },
  title: {
    fontWeight: "700",
    letterSpacing: -0.24,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 320,
  },
  content: {
    gap: 8,
  },
  actionButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
