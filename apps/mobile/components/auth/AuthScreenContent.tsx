import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OAuthProvider } from '@kurecal/domain';
import { getApiBaseUrl } from '@/lib/env';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { useAppTheme } from '@/providers/ThemeProvider';

const authBackground = require('../../assets/images/login-bg.jpg');
const authLogoMark = require('../../assets/images/auth-logo-mark.png');
const googleMark = require('../../assets/brands/google/google-g-mark.png');

type AuthMode = 'sign-in' | 'sign-up';
type EntryMode = 'providers' | 'email';

const authPalette = {
  shell: '#000000',
  dock: 'rgba(18, 18, 18, 0.92)',
  dockBorder: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.68)',
  textMuted: 'rgba(255, 255, 255, 0.48)',
  field: '#171717',
  fieldBorder: 'rgba(255, 255, 255, 0.12)',
  buttonDark: '#2F2F2C',
  buttonDarkPressed: '#3B3B38',
  buttonLight: '#FFFFFF',
  buttonLightPressed: '#ECECEC',
  accent: '#60A5FA',
  accentPressed: '#3B82F6',
  danger: '#FCA5A5',
};

const copy = {
  'sign-in': {
    title: 'Continue with email',
    submitLabel: 'Sign In',
    footerPrefix: "Don't have an account?",
    footerAction: 'Create one',
  },
  'sign-up': {
    title: 'Create your account',
    submitLabel: 'Create Account',
    footerPrefix: 'Already have an account?',
    footerAction: 'Sign in',
  },
} satisfies Record<
  AuthMode,
  {
    title: string;
    submitLabel: string;
    footerPrefix: string;
    footerAction: string;
  }
>;

const providerHero = {
  title: 'Sign in to continue.',
  subtitle: 'Sync your calendar, saved events, and recommendations.',
};

export default function AuthScreenContent() {
  const { signIn, signUp, signInWithOAuth } = useMobileAuth();
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [entryMode, setEntryMode] = useState<EntryMode>('providers');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);

  const isSignIn = authMode === 'sign-in';
  const isBusy = isSubmitting || pendingProvider !== null;
  const content = copy[authMode];
  const viewportMinHeight = Math.max(height - insets.top - insets.bottom - 12, 720);
  const artworkWidth = Math.min(width * 0.72, 300);
  const artworkHeight = artworkWidth * (905 / 640);
  const logoTop = artworkHeight * 0.5;
  const emailTopSpacer = Math.max(height * 0.24, 156);

  const fontStyles = useMemo(
    () => ({
      fontFamily: tokens.typography.sans,
    }),
    [tokens.typography.sans]
  );

  async function handleSubmit() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (isSignIn) {
        await signIn({
          email: email.trim(),
          password,
        });
        return;
      }

      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        acceptTerms: true,
      });

      Alert.alert(
        'Check your inbox',
        'Confirm your account from email, then return here to continue.'
      );

      setAuthMode('sign-in');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue';
      setErrorMessage(message);
      Alert.alert('Auth error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setErrorMessage(null);
    setPendingProvider(provider);

    try {
      await signInWithOAuth(provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue';
      setErrorMessage(message);
      Alert.alert('OAuth error', message);
    } finally {
      setPendingProvider(null);
    }
  }

  async function handleForgotPassword() {
    router.push('/forgot-password');
  }

  async function openLegalDocument(path: 'terms' | 'privacy') {
    try {
      await Linking.openURL(`${getApiBaseUrl()}/${path}`);
    } catch {
      Alert.alert('Unavailable', 'This document is only available through the web flow right now.');
    }
  }

  function openEmail(authTarget: AuthMode = 'sign-in') {
    setErrorMessage(null);
    setAuthMode(authTarget);
    setEntryMode('email');
  }

  function returnToProviders() {
    setErrorMessage(null);
    setEntryMode('providers');
  }

  function toggleEmailMode() {
    setErrorMessage(null);
    setAuthMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.root}>
        <View style={styles.vignette} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {entryMode === 'providers' ? (
            <View style={styles.providerShell}>
              <View style={styles.providerContent}>
                <View style={styles.providerIntro}>
                  <Text style={[styles.providerTitle, fontStyles]}>{providerHero.title}</Text>
                  <Text style={[styles.providerSubtitle, fontStyles]}>{providerHero.subtitle}</Text>
                </View>
                <View pointerEvents="none" style={styles.providerArtworkWrap}>
                  <View style={[styles.artworkFrame, styles.providerArtworkFrame, { width: artworkWidth, height: artworkHeight }]}>
                    <Image source={authBackground} style={styles.artworkImage} />
                    <Image source={authLogoMark} style={[styles.backgroundLogo, { top: logoTop }]} />
                  </View>
                </View>
              </View>
              <View style={styles.providerDock}>
                <View style={styles.providerStack}>
                  <OAuthButton
                    label="Continue with Apple"
                    provider="apple"
                    disabled={isBusy}
                    busy={pendingProvider === 'apple'}
                    fontFamily={tokens.typography.sans}
                    onPress={() => handleOAuth('apple')}
                    testID="oauth-apple"
                  />
                  <OAuthButton
                    label="Continue with Google"
                    provider="google"
                    disabled={isBusy}
                    busy={pendingProvider === 'google'}
                    fontFamily={tokens.typography.sans}
                    onPress={() => handleOAuth('google')}
                    testID="oauth-google"
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => openEmail('sign-in')}
                    style={({ pressed }) => [
                      styles.tertiaryAction,
                      pressed ? styles.tertiaryActionPressed : null,
                      isBusy ? styles.buttonDisabled : null,
                    ]}
                    testID="auth-email-entry"
                  >
                    <Text style={[styles.tertiaryActionLabel, fontStyles]}>Continue with email</Text>
                  </Pressable>
                </View>
                <Text style={[styles.providerLegalCopy, fontStyles]}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.inlineLink} onPress={() => openLegalDocument('terms')}>
                    Terms
                  </Text>{' '}
                  and{' '}
                  <Text style={styles.inlineLink} onPress={() => openLegalDocument('privacy')}>
                    Privacy Policy
                  </Text>
                  .
                </Text>
              </View>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.emailScrollContent, { minHeight: viewportMinHeight }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={{ height: emailTopSpacer }} />
              <View style={styles.authDock}>
                <View style={styles.emailStack}>
                  <View style={styles.emailTopRow}>
                    <Pressable onPress={returnToProviders}>
                      <Text style={[styles.backLabel, fontStyles]}>Back</Text>
                    </Pressable>
                    <Pressable onPress={toggleEmailMode}>
                      <Text style={[styles.switchLabel, fontStyles]}>
                        {isSignIn ? 'Create account' : 'Sign in'}
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={[styles.emailTitle, fontStyles]}>{content.title}</Text>

                  {errorMessage ? (
                    <View style={styles.errorBanner}>
                      <Text style={[styles.errorText, fontStyles]}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  {!isSignIn ? (
                    <Field
                      label="Full name"
                      placeholder="Enter your name"
                      value={name}
                      onChangeText={setName}
                      fontFamily={tokens.typography.sans}
                      testID="auth-name"
                    />
                  ) : null}

                  <Field
                    label="Email address"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    fontFamily={tokens.typography.sans}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    testID="auth-email"
                  />

                  <Field
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    fontFamily={tokens.typography.sans}
                    autoCapitalize="none"
                    autoComplete={isSignIn ? 'current-password' : 'new-password'}
                    secureTextEntry
                    testID="auth-password"
                  />

                  {!isSignIn ? (
                    <Field
                      label="Confirm password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      fontFamily={tokens.typography.sans}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      secureTextEntry
                      testID="auth-confirm-password"
                    />
                  ) : null}

                  {isSignIn ? (
                    <Pressable onPress={handleForgotPassword}>
                      <Text style={[styles.forgotLink, fontStyles]}>Forgot your password?</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.supportingCopy, fontStyles]}>
                      We&apos;ll send a confirmation email before you enter the app.
                    </Text>
                  )}

                  <ActionButton
                    label={content.submitLabel}
                    disabled={isBusy}
                    fontFamily={tokens.typography.sans}
                    onPress={handleSubmit}
                    testID="auth-submit-button"
                    variant="primary"
                    loading={isSubmitting}
                  />

                  <View style={styles.footerRow}>
                    <Text style={[styles.footerText, fontStyles]}>{content.footerPrefix} </Text>
                    <Pressable onPress={toggleEmailMode}>
                      <Text style={[styles.footerAction, fontStyles]}>{content.footerAction}</Text>
                    </Pressable>
                  </View>

                  <Pressable onPress={returnToProviders}>
                    <Text style={[styles.altMethodText, fontStyles]}>Use Apple or Google instead</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  fontFamily: string;
  testID: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?:
    | 'name'
    | 'email'
    | 'current-password'
    | 'new-password'
    | 'off'
    | undefined;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
};

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  fontFamily,
  testID,
  autoCapitalize,
  autoComplete,
  keyboardType,
  secureTextEntry,
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { fontFamily }]}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={authPalette.textMuted}
        secureTextEntry={secureTextEntry}
        selectionColor={authPalette.accent}
        style={[styles.input, { fontFamily }]}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

type OAuthButtonProps = {
  label: string;
  provider: 'apple' | 'google';
  disabled: boolean;
  busy: boolean;
  fontFamily: string;
  onPress: () => void;
  testID: string;
};

function OAuthButton({
  label,
  provider,
  disabled,
  busy,
  fontFamily,
  onPress,
  testID,
}: OAuthButtonProps) {
  const isAppleNative = provider === 'apple' && Platform.OS === 'ios';

  if (isAppleNative) {
    return (
      <View
        pointerEvents={disabled ? 'none' : 'auto'}
        style={[styles.nativeButtonFrame, disabled ? styles.buttonDisabled : null]}
      >
        <AppleAuthentication.AppleAuthenticationButton
          accessibilityLabel={label}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          cornerRadius={27}
          onPress={onPress}
          style={styles.appleNativeButton}
          testID={testID}
        />
        {busy ? (
          <View style={styles.brandButtonOverlay}>
            <ActivityIndicator color="#111111" size="small" />
            <Text style={[styles.lightButtonLabel, { fontFamily }]}>Connecting…</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.lightButton,
        pressed ? styles.lightButtonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
      testID={testID}
    >
      <View style={styles.buttonContent}>
        <View style={styles.iconSlot}>
          {provider === 'apple' ? (
            <FontAwesome name="apple" size={20} color="#111111" />
          ) : (
            <Image resizeMode="contain" source={googleMark} style={styles.googleMark} />
          )}
        </View>
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color="#111111" size="small" />
            <Text style={[styles.lightButtonLabel, { fontFamily }]}>Connecting…</Text>
          </View>
        ) : (
          <Text style={[styles.lightButtonLabel, { fontFamily }]}>{label}</Text>
        )}
      </View>
    </Pressable>
  );
}

type ActionButtonProps = {
  label: string;
  disabled: boolean;
  fontFamily: string;
  onPress: () => void;
  testID: string;
  variant: 'dark' | 'outline' | 'primary';
  loading?: boolean;
};

function ActionButton({
  label,
  disabled,
  fontFamily,
  onPress,
  testID,
  variant,
  loading = false,
}: ActionButtonProps) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.baseActionButton,
        isPrimary ? styles.primaryButton : isOutline ? styles.outlineButton : styles.darkButton,
        pressed
          ? isPrimary
            ? styles.primaryButtonPressed
            : isOutline
              ? styles.outlineButtonPressed
              : styles.darkButtonPressed
          : null,
        disabled ? styles.buttonDisabled : null,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? authPalette.textPrimary : authPalette.textPrimary} />
      ) : (
        <Text
          style={[
            isPrimary
              ? styles.primaryButtonLabel
              : isOutline
                ? styles.outlineButtonLabel
                : styles.darkButtonLabel,
            { fontFamily },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: authPalette.shell,
  },
  root: {
    flex: 1,
    backgroundColor: authPalette.shell,
  },
  artworkFrame: {
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  backgroundLogo: {
    position: 'absolute',
    alignSelf: 'center',
    width: 82,
    height: 82,
    opacity: 0.96,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  flex: {
    flex: 1,
  },
  providerShell: {
    flex: 1,
    paddingHorizontal: 26,
    paddingBottom: 26,
  },
  providerContent: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 64,
  },
  providerDock: {
    width: '100%',
    maxWidth: 398,
    alignSelf: 'center',
    gap: 12,
  },
  providerIntro: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    width: '84%',
    alignSelf: 'center',
  },
  providerArtworkWrap: {
    marginTop: 26,
    marginBottom: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerArtworkFrame: {
    opacity: 0.94,
  },
  providerTitle: {
    color: authPalette.textPrimary,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  providerSubtitle: {
    color: authPalette.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center',
  },
  emailScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  authDock: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: authPalette.dock,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: authPalette.dockBorder,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 8,
  },
  providerStack: {
    gap: 8,
  },
  emailStack: {
    gap: 14,
  },
  emailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backLabel: {
    color: authPalette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  switchLabel: {
    color: authPalette.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  emailTitle: {
    color: authPalette.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  lightButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: authPalette.buttonLight,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  lightButtonPressed: {
    backgroundColor: authPalette.buttonLightPressed,
  },
  baseActionButton: {
    minHeight: 44,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  nativeButtonFrame: {
    minHeight: 50,
    borderRadius: 18,
    overflow: 'hidden',
  },
  appleNativeButton: {
    width: '100%',
    height: 50,
  },
  darkButton: {
    backgroundColor: authPalette.buttonDark,
  },
  outlineButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  darkButtonPressed: {
    backgroundColor: authPalette.buttonDarkPressed,
  },
  outlineButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  primaryButton: {
    backgroundColor: authPalette.accent,
  },
  primaryButtonPressed: {
    backgroundColor: authPalette.accentPressed,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  brandButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
  },
  iconSlot: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMark: {
    width: 20,
    height: 20,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lightButtonLabel: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '700',
  },
  darkButtonLabel: {
    color: authPalette.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  outlineButtonLabel: {
    color: authPalette.textSecondary,
    fontSize: 14.5,
    fontWeight: '600',
  },
  primaryButtonLabel: {
    color: authPalette.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  providerLegalCopy: {
    color: authPalette.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 10,
    marginTop: 2,
  },
  inlineLink: {
    color: authPalette.textSecondary,
    textDecorationLine: 'underline',
  },
  tertiaryAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryActionPressed: {
    opacity: 0.72,
  },
  tertiaryActionLabel: {
    color: authPalette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.32)',
    backgroundColor: 'rgba(127, 29, 29, 0.24)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: authPalette.danger,
    fontSize: 13.5,
    lineHeight: 19,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: authPalette.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authPalette.fieldBorder,
    backgroundColor: authPalette.field,
    paddingHorizontal: 16,
    color: authPalette.textPrimary,
    fontSize: 15.5,
  },
  forgotLink: {
    color: authPalette.accent,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  supportingCopy: {
    color: authPalette.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerText: {
    color: authPalette.textSecondary,
    fontSize: 13.5,
  },
  footerAction: {
    color: authPalette.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  altMethodText: {
    color: authPalette.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
