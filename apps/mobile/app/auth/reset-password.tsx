import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { HeaderActionButton } from '@/components/chrome/MobilePage';
import { KureButton } from '@/components/chrome/KureButton';
import { KureScreen } from '@/components/chrome/KureScreen';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { useAppTheme } from '@/providers/ThemeProvider';

export default function ResetPasswordScreen() {
  const { tokens } = useAppTheme();
  const { session, profile, isLoading, isHydratingProfile, updatePassword } = useMobileAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setErrorMessage(null);

    if (password !== confirmPassword) {
      const message = 'Passwords must match.';
      setErrorMessage(message);
      Alert.alert('Password mismatch', message);
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);
      Alert.alert('Password updated', 'Your password has been updated inside the app.');
      router.replace(profile ? '/(tabs)/discover' : '/onboarding');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update your password.';
      setErrorMessage(message);
      Alert.alert('Reset unavailable', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoading && !isHydratingProfile && !session) {
    return (
      <KureScreen
        title="Reset link expired"
        subtitle="This recovery session is no longer active in the app. Request a new mobile reset link."
        action={<HeaderActionButton label="Back" onPress={() => router.replace('/(auth)')} />}
      >
        <View style={styles.stack}>
          <KureButton onPress={() => router.replace('/forgot-password')} testID="reset-password-request-new">
            Request new reset link
          </KureButton>
          <KureButton
            variant="secondary"
            onPress={() => router.replace('/(auth)')}
            testID="reset-password-back"
          >
            Back to sign in
          </KureButton>
        </View>
      </KureScreen>
    );
  }

  return (
    <KureScreen
      title="Set your new password"
      subtitle="Choose a new password for your KureCal account without leaving the mobile app."
      action={<HeaderActionButton label="Cancel" onPress={() => router.replace('/(auth)')} />}
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
              New password
            </Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Enter a strong password"
              placeholderTextColor={tokens.colors.textTertiary}
              secureTextEntry
              style={[
                styles.input,
                {
                  backgroundColor: tokens.colors.input,
                  borderColor: tokens.colors.border,
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
              testID="reset-password-password"
              value={password}
            />
          </View>
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
              Confirm new password
            </Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              placeholderTextColor={tokens.colors.textTertiary}
              secureTextEntry
              style={[
                styles.input,
                {
                  backgroundColor: tokens.colors.input,
                  borderColor: tokens.colors.border,
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
              testID="reset-password-confirm"
              value={confirmPassword}
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
          <KureButton
            disabled={isSubmitting || isLoading || isHydratingProfile}
            onPress={handleSubmit}
            testID="reset-password-submit"
          >
            {isSubmitting ? 'Updating...' : 'Update password'}
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
