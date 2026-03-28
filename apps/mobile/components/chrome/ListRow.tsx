import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useAppTheme } from '@/providers/ThemeProvider';

interface ListRowProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
}

export function ListRow({ title, subtitle, trailing, onPress }: ListRowProps) {
  const { tokens } = useAppTheme();
  const sharedStyle = {
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    borderRadius: tokens.radius.sm,
  } as const;

  const content = (
    <>
      <View style={styles.copy}>
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
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          sharedStyle,
          {
            opacity: pressed ? 0.95 : 1,
          },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, sharedStyle]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
