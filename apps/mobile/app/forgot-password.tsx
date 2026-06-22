import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../src/context/AuthProvider';

const authLogoMark = require('../assets/images/auth-logo-mark.png');

const palette = {
  accent: '#BDC2FF',
  accentContainer: '#5E6AD2',
  accentContainerHover: '#6E7AE2',
  accentText: '#FDFAFF',
  border: 'rgba(255, 255, 255, 0.1)',
  borderStrong: 'rgba(189, 194, 255, 0.42)',
  danger: '#FFB4AB',
  dangerBorder: 'rgba(255, 180, 171, 0.22)',
  field: 'rgba(255, 255, 255, 0.05)',
  shell: '#010102',
  success: '#C6C6C9',
  successBorder: 'rgba(198, 198, 201, 0.2)',
  surfaceHigh: 'rgba(255, 255, 255, 0.055)',
  textMuted: '#8A8F98',
  textPrimary: '#E3E2E3',
  textSecondary: '#C6C5D5',
};

const fontSans = Platform.select({
  web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

export default function ForgotPasswordScreen() {
  const { loading, requestPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoSize = Math.min(116, Math.max(88, width * 0.25));
  const contentMaxWidth = Math.min(width - 32, 430);
  const disabled = useMemo(
    () => submitting || loading || !email.trim(),
    [email, loading, submitting]
  );

  const handleSubmit = async () => {
    if (disabled) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await requestPasswordReset(email);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to send reset instructions.'
      );
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.page}>
          <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
            <Image
              source={authLogoMark}
              style={[styles.logoMark, { height: logoSize, width: logoSize }]}
            />

            <View style={styles.copyStack}>
              <Text style={styles.title}>
                {sent ? 'Check your email' : 'Reset your password'}
              </Text>
              <Text style={styles.subtitle}>
                {sent
                  ? 'If an account exists, a reset link has been sent.'
                  : 'Enter your email and we will send a reset link.'}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {sent ? (
              <View style={styles.successBanner} testID="forgot-password-success">
                <FontAwesome color={palette.success} name="check" size={14} />
                <Text style={styles.successText}>
                  Check your inbox and spam folder for the reset email.
                </Text>
              </View>
            ) : (
              <View style={styles.formStack}>
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onBlur={() => setFocused(false)}
                  onChangeText={setEmail}
                  onFocus={() => setFocused(true)}
                  placeholder="Email address"
                  placeholderTextColor={palette.textMuted}
                  selectionColor={palette.accent}
                  style={[styles.input, focused ? styles.inputFocused : null]}
                  testID="forgot-password-email"
                  value={email}
                />

                <Pressable
                  accessibilityLabel="Send reset email"
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={handleSubmit}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed ? styles.primaryButtonPressed : null,
                    disabled ? styles.buttonDisabled : null,
                  ]}
                  testID="forgot-password-submit-button"
                >
                  {submitting ? (
                    <ActivityIndicator color={palette.accentText} />
                  ) : (
                    <Text style={styles.primaryButtonLabel}>
                      Send reset email
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            <Pressable
              accessibilityLabel="Back to login"
              accessibilityRole="button"
              onPress={() => router.replace('/login')}
              style={styles.secondaryButton}
              testID="forgot-password-back-button"
            >
              <Text style={styles.secondaryButtonLabel}>Back to login</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: {
    opacity: 0.54,
  },
  content: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 24,
    width: '100%',
  },
  copyStack: {
    gap: 8,
    width: '100%',
  },
  errorBanner: {
    backgroundColor: palette.field,
    borderColor: palette.dangerBorder,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
  },
  errorText: {
    color: palette.danger,
    fontFamily: fontSans,
    fontSize: 13,
    lineHeight: 18,
  },
  flex: {
    flex: 1,
  },
  formStack: {
    gap: 12,
    width: '100%',
  },
  input: {
    backgroundColor: palette.field,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.textPrimary,
    fontFamily: fontSans,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: palette.borderStrong,
  },
  logoMark: {
    opacity: 0.96,
  },
  page: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 56,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accentContainer,
    borderColor: palette.accentContainer,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButtonLabel: {
    color: palette.accentText,
    fontFamily: fontSans,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  primaryButtonPressed: {
    backgroundColor: palette.accentContainerHover,
    borderColor: palette.accentContainerHover,
  },
  root: {
    backgroundColor: palette.shell,
    flex: 1,
  },
  secondaryButton: {
    alignSelf: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  secondaryButtonLabel: {
    color: palette.accent,
    fontFamily: fontSans,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  subtitle: {
    color: palette.textSecondary,
    fontFamily: fontSans,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
  },
  successBanner: {
    alignItems: 'center',
    backgroundColor: palette.field,
    borderColor: palette.successBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
  },
  successText: {
    color: palette.textSecondary,
    flex: 1,
    fontFamily: fontSans,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fontSans,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
});
