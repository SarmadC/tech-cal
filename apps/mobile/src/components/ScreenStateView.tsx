import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandLoadingLogo } from './brand/BrandLoadingLogo';

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
  if (mode === 'loading') {
    return (
      <View style={styles.loadingRoot}>
        <BrandLoadingLogo color="#f8fafc" size={72} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {mode === 'error' && onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed ? styles.retryButtonPressed : null,
          ]}
        >
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  loadingRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 260,
    paddingVertical: 28,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#2dd4bf',
    borderRadius: 16,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
    minWidth: 140,
    paddingHorizontal: 18,
  },
  retryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  retryLabel: {
    color: '#042f2e',
    fontSize: 14,
    fontWeight: '700',
  },
  root: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 15, 23, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    minHeight: 260,
    padding: 28,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
});
