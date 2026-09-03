import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandPageLoadingState } from './brand/BrandPageLoadingState';
import { useAppTheme } from '../providers/ThemeProvider';

interface ScreenStateViewProps {
  description: string;
  mode: 'empty' | 'error' | 'loading';
  title: string;
  onRetry?: () => void;
}

export function ScreenStateView({
  description,
  mode,
  title,
  onRetry,
}: ScreenStateViewProps) {
  const { tokens } = useAppTheme();

  if (mode === 'loading') {
    return <BrandPageLoadingState style={styles.loadingState} />;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={mode === 'error' ? 'alert' : undefined}
      style={[
        styles.root,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{title}</Text>
      <Text style={[styles.description, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
        {description}
      </Text>
      {mode === 'error' && onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading"
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: tokens.colors.pillActive, borderColor: tokens.colors.pillActive },
            pressed ? styles.retryButtonPressed : null,
          ]}
        >
          <Text style={[styles.retryLabel, { color: tokens.colors.pillActiveText, fontFamily: tokens.typography.sans }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  loadingState: {
    minHeight: 180,
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: 12,
  },
  retryButtonPressed: {
    opacity: 0.84,
  },
  retryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  root: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    justifyContent: 'center',
    minHeight: 180,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
});
