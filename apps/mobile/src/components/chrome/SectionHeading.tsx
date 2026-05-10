import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';

export function SectionHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? (
          <Text
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 13,
              fontWeight: '500',
            }}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 22,
            fontWeight: '700',
            letterSpacing: -0.4,
          }}
        >
          {title}
        </Text>
        {detail ? (
          <Text
            style={{
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
});
