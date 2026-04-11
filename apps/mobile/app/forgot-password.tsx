import { useState } from 'react';
import { router } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { AuthShell, authPalette, authSharedStyles } from '../src/components/auth/AuthShell';
import { useAuth } from '../src/context/AuthProvider';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const normalizedEmail = email.trim();
      await requestPasswordReset(normalizedEmail);
      setLastSentEmail(normalizedEmail);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to send a reset link.';
      setError(message);
      Alert.alert('Reset link unavailable', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      backHref="/login"
      subtitle={
        lastSentEmail
          ? `We sent a mobile reset link to ${lastSentEmail}. Open it on this device to continue in the app.`
          : 'Enter your account email and we will send a native reset link back into KureCal.'
      }
      title={lastSentEmail ? 'Check your inbox' : 'Reset your password'}
    >
      <Text style={authSharedStyles.label}>Email address</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={authPalette.textMuted}
        style={authSharedStyles.input}
        testID="forgot-password-email"
        value={email}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={() => {
          void handleSubmit();
        }}
        style={({ pressed }) => [
          authSharedStyles.primaryButton,
          submitting ? authSharedStyles.primaryButtonDisabled : null,
          pressed && !submitting ? authSharedStyles.primaryButtonPressed : null,
        ]}
        testID="forgot-password-submit"
      >
        <Text style={authSharedStyles.primaryButtonLabel}>
          {submitting ? 'Sending…' : lastSentEmail ? 'Send again' : 'Send reset link'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          router.replace('/login');
        }}
        style={authSharedStyles.secondaryButton}
        testID="forgot-password-back"
      >
        <Text style={authSharedStyles.secondaryButtonLabel}>Back to sign in</Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: authPalette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
