import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';

export function KureButton({
  children,
  variant = 'primary',
  disabled = false,
  onPress,
  testID,
}: PropsWithChildren<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  onPress?: () => void | Promise<unknown>;
  testID?: string;
}>) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void onPress?.();
      }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: tokens.radius.pill,
          borderColor: tokens.colors.border,
          backgroundColor: tokens.colors.surface,
        },
        variant === 'primary' && {
          backgroundColor: tokens.colors.pillActive,
          borderColor: tokens.colors.pillActive,
        },
        variant === 'secondary' && {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.borderStrong,
        },
        variant === 'ghost' && {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        },
        variant === 'danger' && {
          backgroundColor: tokens.colors.danger,
          borderColor: tokens.colors.danger,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.label,
            {
              color:
                variant === 'primary'
                  ? tokens.colors.pillActiveText
                  : variant === 'danger'
                    ? tokens.colors.textInverse
                    : tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
