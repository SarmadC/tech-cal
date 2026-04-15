import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandLoadingLogo } from '../brand/BrandLoadingLogo';
import { useAppTheme } from '../../providers/ThemeProvider';
import { KureCard } from './KureCard';

type ScreenStateMode = 'loading' | 'empty' | 'error';
type ScreenStateVariant = 'default' | 'discover' | 'plain';

interface ScreenStateProps {
  action?: ReactNode;
  description?: string;
  fullHeight?: boolean;
  mode: ScreenStateMode;
  title?: string;
  variant?: ScreenStateVariant;
}

export function ScreenState({
  action,
  description,
  fullHeight = false,
  mode,
  title,
  variant = 'default',
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

  if (showSpinner) {
    return (
      <View style={[styles.loadingSurface, fullHeight && styles.fullHeightSurface]}>
        <BrandLoadingLogo color={tokens.colors.textPrimary} size={68} />
      </View>
    );
  }

  const content = (
    <View style={[styles.content, fullHeight && styles.fullHeight]}>
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
                variant === 'discover'
                  ? tokens.colors.discoverTextMuted
                  : tokens.colors.textSecondary,
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
  action: {
    paddingTop: 4,
  },
  content: {
    gap: 8,
    justifyContent: 'center',
    minHeight: 88,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  fullHeight: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  fullHeightSurface: {
    minHeight: 160,
  },
  loadingSurface: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 240,
    paddingVertical: 28,
  },
  plainSurface: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  surface: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
});
