import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

const colors = {
  accent: '#BDC2FF',
  accentStrong: '#5E6AD2',
  border: 'rgba(255, 255, 255, 0.08)',
  surface: '#121314',
  text: '#E3E2E3',
  textMuted: '#C6C5D5',
};

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
  return (
    <View style={styles.root}>
      {mode === 'loading' ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : null}
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
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 32,
    minWidth: 96,
    paddingHorizontal: 12,
  },
  retryButtonPressed: {
    opacity: 0.84,
  },
  retryLabel: {
    color: '#FDFAFF',
    fontSize: 13,
    fontWeight: '600',
  },
  root: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
    justifyContent: 'center',
    minHeight: 180,
    padding: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
});
