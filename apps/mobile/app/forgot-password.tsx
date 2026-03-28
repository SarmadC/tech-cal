import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { HeaderActionButton } from '@/components/chrome/MobilePage';
import { KureButton } from '@/components/chrome/KureButton';
import { KureScreen } from '@/components/chrome/KureScreen';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { useAppTheme } from '@/providers/ThemeProvider';

export default function ForgotPasswordScreen() {
  const { tokens } = useAppTheme();
  const { requestPasswordReset } = useMobileAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim();
      await requestPasswordReset(normalizedEmail);
      setLastSentEmail(normalizedEmail);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send a reset link.';
      setErrorMessage(message);
      Alert.alert('Reset link unavailable', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KureScreen
      title={lastSentEmail ? 'Check your inbox' : 'Reset your password'}
      subtitle={
        lastSentEmail
          ? `We sent a mobile reset link to ${lastSentEmail}. Open it on this device to continue in the app.`
          : 'Enter your account email and we will send a native reset link back into KureCal.'
      }
      action={<HeaderActionButton label="Back" onPress={() => router.replace('/(auth)')} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.stack}>
          <View style={styles.fieldStack}>
            <Text
              style={[
                styles.label,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Email address
            </Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={tokens.colors.textTertiary}
              style={[
                styles.input,
                {
                  backgroundColor: tokens.colors.input,
                  borderColor: tokens.colors.border,
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
              testID="forgot-password-email"
              value={email}
            />
          </View>
          {errorMessage ? (
            <Text
              style={[
                styles.errorText,
                {
                  color: tokens.colors.danger,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {errorMessage}
            </Text>
          ) : null}
          <KureButton disabled={isSubmitting} onPress={handleSubmit} testID="forgot-password-submit">
            {isSubmitting ? 'Sending...' : lastSentEmail ? 'Send again' : 'Send reset link'}
          </KureButton>
          <KureButton
            variant="ghost"
            onPress={() => router.replace('/(auth)')}
            testID="forgot-password-back"
          >
            Back to sign in
          </KureButton>
        </View>
      </KeyboardAvoidingView>
    </KureScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  fieldStack: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
