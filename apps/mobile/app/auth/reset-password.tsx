import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthShell, authPalette, authSharedStyles } from '../../src/components/auth/AuthShell';
import { useAuth } from '../../src/context/AuthProvider';

export default function ResetPasswordScreen() {
  const {
    hasCompletedOnboarding,
    loading,
    session,
    updatePassword,
  } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (password !== confirmPassword) {
      const message = 'Passwords must match.';
      setError(message);
      Alert.alert('Password mismatch', message);
      return;
    }

    setSubmitting(true);

    try {
      await updatePassword(password);
      Alert.alert('Password updated', 'Your password has been updated inside the app.');
      router.replace(hasCompletedOnboarding ? '/(tabs)/dashboard' : '/onboarding');
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to update your password.';
      setError(message);
      Alert.alert('Reset unavailable', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && !session) {
    return (
      <AuthShell
        backHref="/login"
        subtitle="This recovery session is no longer active in the app. Request a new mobile reset link."
        title="Reset link expired"
      >
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.replace('/forgot-password' as Href);
            }}
            style={({ pressed }) => [
              authSharedStyles.primaryButton,
              pressed ? authSharedStyles.primaryButtonPressed : null,
            ]}
            testID="reset-password-request-new"
          >
            <Text style={authSharedStyles.primaryButtonLabel}>Request new reset link</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.replace('/login');
            }}
            style={authSharedStyles.secondaryButton}
            testID="reset-password-back"
          >
            <Text style={authSharedStyles.secondaryButtonLabel}>Back to sign in</Text>
          </Pressable>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      backHref="/login"
      backLabel="Cancel"
      subtitle="Choose a new password for your KureCal account without leaving the mobile app."
      title="Set your new password"
    >
      <View style={styles.stack}>
        <View style={authSharedStyles.field}>
          <Text style={authSharedStyles.label}>New password</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Enter a strong password"
            placeholderTextColor={authPalette.textMuted}
            secureTextEntry
            style={authSharedStyles.input}
            testID="reset-password-password"
            value={password}
          />
        </View>
        <View style={authSharedStyles.field}>
          <Text style={authSharedStyles.label}>Confirm new password</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            placeholderTextColor={authPalette.textMuted}
            secureTextEntry
            style={authSharedStyles.input}
            testID="reset-password-confirm"
            value={confirmPassword}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={submitting || loading}
          onPress={() => {
            void handleSubmit();
          }}
          style={({ pressed }) => [
            authSharedStyles.primaryButton,
            submitting || loading ? authSharedStyles.primaryButtonDisabled : null,
            pressed && !submitting && !loading
              ? authSharedStyles.primaryButtonPressed
              : null,
          ]}
          testID="reset-password-submit"
        >
          <Text style={authSharedStyles.primaryButtonLabel}>
            {submitting ? 'Updating…' : 'Update password'}
          </Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
  },
  errorText: {
    color: authPalette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  stack: {
    gap: 16,
  },
});
