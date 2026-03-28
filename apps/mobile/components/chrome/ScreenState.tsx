import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { KureCard } from '@/components/chrome/KureCard';
import { useAppTheme } from '@/providers/ThemeProvider';

type ScreenStateMode = 'loading' | 'empty' | 'error';
type ScreenStateVariant = 'default' | 'discover' | 'plain';

interface ScreenStateProps {
  mode: ScreenStateMode;
  title?: string;
  description?: string;
  action?: ReactNode;
  variant?: ScreenStateVariant;
  fullHeight?: boolean;
}

export function ScreenState({
  mode,
  title,
  description,
  action,
  variant = 'default',
  fullHeight = false,
}: ScreenStateProps) {
  const { tokens } = useAppTheme();
  const showSpinner = mode === 'loading';
  const useCard = variant === 'default';
  const surfaceStyle =
    variant === 'discover'
      ? {
          backgroundColor: tokens.colors.discoverToolbar,
          borderColor: tokens.colors.discoverToolbarBorder,
        }
      : {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
        };

  const content = (
    <View style={[styles.content, fullHeight && styles.fullHeight]}>
      {showSpinner ? <ActivityIndicator color={tokens.colors.accent} /> : null}
      {title ? (
        <Text
          style={[
            styles.title,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text
          style={[
            styles.description,
            {
              color:
                variant === 'discover' ? tokens.colors.discoverTextMuted : tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );

  if (useCard) {
    return <KureCard>{content}</KureCard>;
  }

  return (
    <View
      style={[
        styles.surface,
        surfaceStyle,
        fullHeight && styles.fullHeightSurface,
        variant === 'plain' && styles.plainSurface,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  plainSurface: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  content: {
    gap: 8,
    minHeight: 88,
    justifyContent: 'center',
  },
  fullHeight: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullHeightSurface: {
    minHeight: 160,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    paddingTop: 4,
  },
});
