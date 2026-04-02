import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/providers/ThemeProvider';

interface CommunitySectionProps extends PropsWithChildren {
  title?: string;
  meta?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CommunitySection({
  title,
  meta,
  action,
  style,
  children,
}: CommunitySectionProps) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
        style,
      ]}
    >
      {title ? (
        <View
          style={[
            styles.header,
            {
              borderBottomColor: tokens.colors.divider,
            },
          ]}
        >
          <View style={styles.headerCopy}>
            <Text
              style={{
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {title}
            </Text>
          </View>
          {meta ? (
            <Text
              style={{
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {meta}
            </Text>
          ) : null}
          {action}
        </View>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCopy: {
    flex: 1,
  },
  content: {
    overflow: 'hidden',
  },
});
