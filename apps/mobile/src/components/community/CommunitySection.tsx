import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';

interface CommunitySectionProps extends PropsWithChildren {
  title: string;
  meta?: string;
}

export function CommunitySection({
  children,
  meta,
  title,
}: CommunitySectionProps) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: tokens.mode === 'dark' ? 0.06 : 0.03,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 1,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: tokens.colors.divider,
          },
        ]}
      >
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 17,
            lineHeight: 22,
            fontWeight: '800',
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        {meta ? (
          <Text
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.mono,
              fontSize: 10,
              lineHeight: 13,
              fontWeight: '700',
              letterSpacing: 0.9,
              textTransform: 'uppercase',
            }}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  section: {
    overflow: 'hidden',
    borderWidth: 1,
  },
});
