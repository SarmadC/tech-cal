import { useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../providers/ThemeProvider';
import { useTabBarVisibility } from './TabBarVisibilityProvider';

interface MobilePageProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  headerHidden?: boolean;
  showAccentGlow?: boolean;
  footerInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
}

export function MobilePage({
  eyebrow,
  title,
  subtitle,
  action,
  headerHidden = false,
  showAccentGlow = true,
  children,
  footerInset,
  contentStyle,
}: MobilePageProps) {
  const { tokens } = useAppTheme();
  const { handleScroll, isVisible } = useTabBarVisibility();
  const insets = useSafeAreaInsets();
  const [compact, setCompact] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const bottomInset =
    footerInset ?? (isVisible ? tokens.spacing.tabBarBottom : Math.max(insets.bottom + 20, 28));

  const fallbackHeaderOffset = useMemo(
    () => (headerHidden ? insets.top + 12 : insets.top + (subtitle ? 148 : 120)),
    [headerHidden, insets.top, subtitle]
  );
  const headerOffset = headerHidden ? fallbackHeaderOffset : headerHeight ?? fallbackHeaderOffset;

  function handleHeaderLayout(event: LayoutChangeEvent) {
    const nextHeight = event.nativeEvent.layout.height;
    if (Math.abs((headerHeight ?? 0) - nextHeight) > 1) {
      setHeaderHeight(nextHeight);
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: tokens.colors.shell }]}
      edges={['left', 'right']}
    >
      <LinearGradient colors={tokens.gradients.page} style={StyleSheet.absoluteFill} />
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
              paddingTop: insets.top + 12,
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
                    fontSize: compact ? 24 : tokens.typography.display,
                    lineHeight: compact ? 28 : 36,
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.pill,
        },
        pressed && styles.actionPressed,
      ]}
    >
      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  accentGlow: {
    position: 'absolute',
    top: -80,
    left: -24,
    right: 56,
    height: 240,
    borderRadius: 240,
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
    paddingTop: 4,
  },
  headerAction: {
    paddingTop: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  content: {
    gap: 14,
  },
  actionButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionPressed: {
    opacity: 0.82,
  },
});
