import { StyleSheet, Text, TextInput, View } from 'react-native';
import { KureButton } from '@/components/chrome/KureButton';
import { useAppTheme } from '@/providers/ThemeProvider';

interface CommunityPostComposerProps {
  title: string;
  value: string;
  placeholder: string;
  submitLabel: string;
  isSubmitting?: boolean;
  onChangeText: (value: string) => void;
  onSubmit: () => void | Promise<unknown>;
}

export function CommunityPostComposer({
  title,
  value,
  placeholder,
  submitLabel,
  isSubmitting = false,
  onChangeText,
  onSubmit,
}: CommunityPostComposerProps) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontSize: 17,
          lineHeight: 22,
          fontWeight: '700',
        }}
      >
        {title}
      </Text>

      <TextInput
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.textTertiary}
        style={[
          styles.input,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            backgroundColor: tokens.colors.input,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.sm,
          },
        ]}
      />

      <KureButton disabled={isSubmitting || !value.trim()} onPress={onSubmit}>
        {isSubmitting ? 'Posting...' : submitLabel}
      </KureButton>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  input: {
    minHeight: 140,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
});
