import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/providers/ThemeProvider';

export function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string | null;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: tokens.colors.surfaceStrong,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <Text
        style={{
          color: tokens.colors.textTertiary,
          fontFamily: tokens.typography.sans,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.6,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontSize: 28,
          fontWeight: '800',
          lineHeight: 32,
        }}
      >
        {value}
      </Text>
      {detail ? (
        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 128,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
});
