import { FontAwesome } from '@expo/vector-icons';
import { Redirect, router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/context/AuthProvider';

const authLogoMark = require('../../assets/images/auth-logo-mark.png');

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
  surface: 'rgba(13, 14, 15, 0.86)',
  surfaceHigh: 'rgba(255, 255, 255, 0.055)',
  textMuted: '#8A8F98',
  textPrimary: '#E3E2E3',
  textSecondary: '#C6C5D5',
};

const fontSans = Platform.select({
  web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

export default function LoginScreen() {
  const { loading, session, signIn, signInWithOAuth } = useAuth();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<'apple' | 'google' | null>(
    null
  );
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(
    null
  );
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoSize = Math.min(136, Math.max(104, width * 0.3));
  const contentMaxWidth = Math.min(width - 32, 430);

  const disabled = useMemo(
    () => submitting || pendingProvider !== null || loading || !email.trim() || !password,
    [email, loading, password, pendingProvider, submitting]
  );
  const oauthDisabled = submitting || pendingProvider !== null || loading;

  if (session) {
    return <Redirect href="../(tabs)/dashboard" />;
  }

  const handleSignIn = async () => {
    if (disabled) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await signIn({
      email: email.trim(),
      password,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.replace('../(tabs)/dashboard');
    setSubmitting(false);
  };

  const handleOAuth = async (provider: 'apple' | 'google') => {
    if (oauthDisabled) {
      return;
    }

    setPendingProvider(provider);
    setError(null);

    const result = await signInWithOAuth(provider);
    if (result.error) {
      setError(result.error);
      setPendingProvider(null);
      return;
    }

    setPendingProvider(null);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
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

            <View style={styles.oauthStack}>
              <OAuthButton
                disabled={oauthDisabled}
                icon="apple"
                label="Continue with Apple"
                loading={pendingProvider === 'apple'}
                onPress={() => {
                  void handleOAuth('apple');
                }}
              />
              <OAuthButton
                disabled={oauthDisabled}
                icon="google"
                label="Continue with Google"
                loading={pendingProvider === 'google'}
                onPress={() => {
                  void handleOAuth('google');
                }}
              />
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.formStack}>
              <TextInput
                accessibilityLabel="Email address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={() => setFocusedField(null)}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                placeholder="Email address"
                placeholderTextColor={palette.textMuted}
                selectionColor={palette.accent}
                style={[
                  styles.input,
                  focusedField === 'email' ? styles.inputFocused : null,
                ]}
                testID="auth-email"
                value={email}
              />

              <View
                style={[
                  styles.passwordField,
                  focusedField === 'password' ? styles.inputFocused : null,
                ]}
              >
                <TextInput
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  autoCorrect={false}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  placeholder="Password"
                  placeholderTextColor={palette.textMuted}
                  secureTextEntry={!passwordVisible}
                  selectionColor={palette.accent}
                  style={styles.passwordInput}
                  testID="auth-password"
                  value={password}
                />
                <Pressable
                  accessibilityLabel={
                    passwordVisible ? 'Hide password' : 'Show password'
                  }
                  accessibilityRole="button"
                  onPress={() => setPasswordVisible((visible) => !visible)}
                  style={({ pressed }) => [
                    styles.eyeButton,
                    pressed ? styles.eyeButtonPressed : null,
                  ]}
                >
                  <FontAwesome
                    color={palette.textMuted}
                    name={passwordVisible ? 'eye-slash' : 'eye'}
                    size={15}
                  />
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={handleSignIn}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.primaryButtonPressed : null,
                  disabled ? styles.buttonDisabled : null,
                ]}
                testID="auth-submit-button"
              >
                {submitting ? (
                  <ActivityIndicator color={palette.accentText} />
                ) : (
                  <Text style={styles.primaryButtonLabel}>Log In</Text>
                )}
              </Pressable>

              <Pressable
                accessibilityLabel="Forgot Password?"
                accessibilityRole="button"
                onPress={() => router.push('/forgot-password' as Href)}
                style={styles.forgotButton}
                testID="auth-forgot-password-button"
              >
                <Text style={styles.forgotLink}>Forgot Password?</Text>
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>No account?</Text>
                <Pressable
                  accessibilityLabel="Create account"
                  accessibilityRole="button"
                  onPress={() => router.push('/signup' as Href)}
                  style={styles.switchButton}
                  testID="auth-create-account-button"
                >
                  <Text style={styles.switchLink}>Create one</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function OAuthButton({
  disabled,
  icon,
  label,
  loading,
  onPress,
}: {
  disabled: boolean;
  icon?: keyof typeof FontAwesome.glyphMap;
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.oauthButton,
        pressed ? styles.oauthButtonPressed : null,
                disabled ? styles.buttonDisabled : null,
      ]}
      testID={
        icon === 'apple'
          ? 'auth-apple-button'
          : icon === 'google'
            ? 'auth-google-button'
            : undefined
      }
    >
      {loading ? (
        <View style={styles.oauthMark}>
          <ActivityIndicator color={palette.textPrimary} size="small" />
        </View>
      ) : icon ? (
        <View style={styles.oauthMark}>
          <FontAwesome color={palette.textSecondary} name={icon} size={18} />
        </View>
      ) : null}
      <Text style={styles.oauthButtonLabel}>
        {loading ? 'Connecting...' : label}
      </Text>
    </Pressable>
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
  dividerLine: {
    backgroundColor: palette.border,
    flex: 1,
    height: 1,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  dividerText: {
    color: palette.textMuted,
    fontFamily: fontSans,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: palette.field,
    borderColor: palette.dangerBorder,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: palette.danger,
    fontFamily: fontSans,
    fontSize: 13,
    lineHeight: 18,
  },
  eyeButton: {
    alignItems: 'center',
    borderRadius: 6,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  eyeButtonPressed: {
    backgroundColor: palette.surfaceHigh,
  },
  flex: {
    flex: 1,
  },
  forgotButton: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  forgotLink: {
    color: palette.accent,
    fontFamily: fontSans,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
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
  oauthButton: {
    alignItems: 'center',
    backgroundColor: palette.field,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    position: 'relative',
  },
  oauthButtonLabel: {
    color: palette.textPrimary,
    fontFamily: fontSans,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  oauthButtonPressed: {
    backgroundColor: palette.surfaceHigh,
    borderColor: palette.borderStrong,
  },
  oauthMark: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    left: 16,
    position: 'absolute',
    width: 24,
  },
  oauthStack: {
    gap: 8,
    width: '100%',
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
  passwordField: {
    alignItems: 'center',
    backgroundColor: palette.field,
    borderColor: palette.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 8,
  },
  passwordInput: {
    color: palette.textPrimary,
    flex: 1,
    fontFamily: fontSans,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    minHeight: 50,
    paddingRight: 8,
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
  switchButton: {
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  switchLink: {
    color: palette.accent,
    fontFamily: fontSans,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingTop: 4,
  },
  switchText: {
    color: palette.textMuted,
    fontFamily: fontSans,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
