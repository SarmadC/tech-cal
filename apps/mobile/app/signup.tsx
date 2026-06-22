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
  surfaceHigh: 'rgba(255, 255, 255, 0.055)',
  textMuted: '#8A8F98',
  textPrimary: '#E3E2E3',
  textSecondary: '#C6C5D5',
};

const fontSans = Platform.select({
  web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

type FocusedField = 'name' | 'email' | 'password' | 'confirmPassword';

export default function SignupScreen() {
  const { loading, signInWithOAuth, signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedField | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<'apple' | 'google' | null>(
    null
  );
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoSize = Math.min(116, Math.max(88, width * 0.25));
  const contentMaxWidth = Math.min(width - 32, 430);
  const disabled = useMemo(
    () =>
      submitting ||
      pendingProvider !== null ||
      loading ||
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword ||
      !acceptedTerms,
    [
      acceptedTerms,
      confirmPassword,
      email,
      loading,
      name,
      password,
      pendingProvider,
      submitting,
    ]
  );
  const oauthDisabled = submitting || pendingProvider !== null || loading;

  const handleOAuth = async (provider: 'apple' | 'google') => {
    if (oauthDisabled) {
      return;
    }

    setPendingProvider(provider);
    setError(null);

    try {
      await signInWithOAuth(provider);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to start sign up.'
      );
    }

    setPendingProvider(null);
  };

  const handleSignUp = async () => {
    if (disabled) {
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await signUp({
        confirmPassword,
        email,
        name,
        password,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign up.');
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
                {sent ? 'Check your email' : 'Create your account'}
              </Text>
              <Text style={styles.subtitle}>
                {sent
                  ? 'Confirm your email to finish setting up KureCal.'
                  : 'Use OAuth or create an account with email.'}
              </Text>
            </View>

            {sent ? (
              <View style={styles.successBanner} testID="signup-success">
                <FontAwesome color={palette.textSecondary} name="check" size={14} />
                <Text style={styles.successText}>
                  We sent a confirmation link to {email.trim()}.
                </Text>
              </View>
            ) : (
              <>
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
                    accessibilityLabel="Full name"
                    autoCapitalize="words"
                    autoComplete="name"
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setName}
                    onFocus={() => setFocusedField('name')}
                    placeholder="Full name"
                    placeholderTextColor={palette.textMuted}
                    selectionColor={palette.accent}
                    style={[
                      styles.input,
                      focusedField === 'name' ? styles.inputFocused : null,
                    ]}
                    testID="signup-name"
                    value={name}
                  />

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
                    testID="signup-email"
                    value={email}
                  />

                  <PasswordInput
                    focused={focusedField === 'password'}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    passwordVisible={passwordVisible}
                    placeholder="Password"
                    testID="signup-password"
                    toggleVisible={() => setPasswordVisible((visible) => !visible)}
                    value={password}
                  />

                  <PasswordInput
                    focused={focusedField === 'confirmPassword'}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocusedField('confirmPassword')}
                    passwordVisible={passwordVisible}
                    placeholder="Confirm password"
                    testID="signup-confirm-password"
                    toggleVisible={() => setPasswordVisible((visible) => !visible)}
                    value={confirmPassword}
                  />

                  <Pressable
                    accessibilityLabel="Accept terms"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedTerms }}
                    onPress={() => setAcceptedTerms((accepted) => !accepted)}
                    style={styles.termsRow}
                    testID="signup-accept-terms"
                  >
                    <View
                      style={[
                        styles.checkbox,
                        acceptedTerms ? styles.checkboxChecked : null,
                      ]}
                    >
                      {acceptedTerms ? (
                        <FontAwesome
                          color={palette.accentText}
                          name="check"
                          size={10}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.termsText}>
                      I agree to the Terms of Service and Privacy Policy.
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Create account"
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={handleSignUp}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed ? styles.primaryButtonPressed : null,
                      disabled ? styles.buttonDisabled : null,
                    ]}
                    testID="signup-submit-button"
                  >
                    {submitting ? (
                      <ActivityIndicator color={palette.accentText} />
                    ) : (
                      <Text style={styles.primaryButtonLabel}>
                        Create account
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account?</Text>
              <Pressable
                accessibilityLabel="Back to login"
                accessibilityRole="button"
                onPress={() => router.replace('/login')}
                style={styles.switchButton}
                testID="signup-back-to-login-button"
              >
                <Text style={styles.switchLink}>Log in</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
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
  icon: keyof typeof FontAwesome.glyphMap;
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
        icon === 'apple' ? 'signup-apple-button' : 'signup-google-button'
      }
    >
      <View style={styles.oauthMark}>
        {loading ? (
          <ActivityIndicator color={palette.textPrimary} size="small" />
        ) : (
          <FontAwesome color={palette.textSecondary} name={icon} size={18} />
        )}
      </View>
      <Text style={styles.oauthButtonLabel}>
        {loading ? 'Connecting...' : label}
      </Text>
    </Pressable>
  );
}

function PasswordInput({
  focused,
  onBlur,
  onChangeText,
  onFocus,
  passwordVisible,
  placeholder,
  testID,
  toggleVisible,
  value,
}: {
  focused: boolean;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  passwordVisible: boolean;
  placeholder: string;
  testID: string;
  toggleVisible: () => void;
  value: string;
}) {
  return (
    <View style={[styles.passwordField, focused ? styles.inputFocused : null]}>
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        secureTextEntry={!passwordVisible}
        selectionColor={palette.accent}
        style={styles.passwordInput}
        testID={testID}
        value={value}
      />
      <Pressable
        accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
        accessibilityRole="button"
        onPress={toggleVisible}
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
  );
}

const styles = StyleSheet.create({
  buttonDisabled: {
    opacity: 0.54,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: palette.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  checkboxChecked: {
    backgroundColor: palette.accentContainer,
    borderColor: palette.accentContainer,
  },
  content: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 20,
    width: '100%',
  },
  copyStack: {
    gap: 8,
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
    lineHeight: 20,
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
    paddingTop: 40,
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
  subtitle: {
    color: palette.textSecondary,
    fontFamily: fontSans,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  successBanner: {
    alignItems: 'center',
    backgroundColor: palette.field,
    borderColor: palette.border,
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
  },
  switchText: {
    color: palette.textMuted,
    fontFamily: fontSans,
    fontSize: 14,
    lineHeight: 20,
  },
  termsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  termsText: {
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
