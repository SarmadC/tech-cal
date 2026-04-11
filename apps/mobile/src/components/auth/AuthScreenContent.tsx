import { router, type Href, Redirect } from 'expo-router';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, G, ClipPath, Defs, Rect } from 'react-native-svg';

import { getMobileApiBaseUrl } from '../../lib/env';
import { useAuth } from '../../context/AuthProvider';

const authBackground = require('../../../assets/images/login-bg.jpg');
const authLogoMark = require('../../../assets/images/auth-logo-mark.png');

function AppleLogo({ size = 24 }: { size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.028 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
        fill="#111111"
      />
    </Svg>
  );
}

function GoogleLogo({ size = 24 }: { size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Defs>
        <ClipPath id="googleClip">
          <Rect height="24" width="24" x="0" y="0" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#googleClip)">
        <Path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <Path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <Path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          fill="#FBBC05"
        />
        <Path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </G>
    </Svg>
  );
}

const authPalette = {
  accent: '#60A5FA',
  accentPressed: '#3B82F6',
  buttonDark: '#2F2F2C',
  buttonDarkPressed: '#3B3B38',
  buttonLight: '#FFFFFF',
  buttonLightPressed: '#ECECEC',
  danger: '#FCA5A5',
  dock: 'rgba(18, 18, 18, 0.92)',
  dockBorder: 'rgba(255, 255, 255, 0.08)',
  field: '#171717',
  fieldBorder: 'rgba(255, 255, 255, 0.12)',
  shell: '#000000',
  textMuted: 'rgba(255, 255, 255, 0.48)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.68)',
} as const;

type AuthMode = 'sign-in' | 'sign-up';
type EntryMode = 'providers' | 'email';

const copy = {
  'sign-in': {
    footerAction: 'Create one',
    footerPrefix: "Don't have an account?",
    submitLabel: 'Sign in',
    title: 'Continue with email',
  },
  'sign-up': {
    footerAction: 'Sign in',
    footerPrefix: 'Already have an account?',
    submitLabel: 'Create account',
    title: 'Create your account',
  },
} satisfies Record<
  AuthMode,
  {
    footerAction: string;
    footerPrefix: string;
    submitLabel: string;
    title: string;
  }
>;

const providerHero = {
  subtitle: 'Sync your calendar, saved events, and recommendations.',
  title: 'Sign in to continue.',
};

export default function AuthScreenContent() {
  const {
    hasCompletedOnboarding,
    loading,
    session,
    signIn,
    signInWithOAuth,
    signUp,
  } = useAuth();
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
  const [pendingProvider, setPendingProvider] = useState<'apple' | 'google' | null>(
    null
  );

  const isSignIn = authMode === 'sign-in';
  const isBusy = isSubmitting || pendingProvider !== null || loading;
  const content = copy[authMode];
  const viewportMinHeight = Math.max(height - insets.top - insets.bottom - 12, 720);
  const artworkWidth = Math.min(width * 0.78, 340);
  const artworkHeight = Math.min(height * 0.54, artworkWidth * (905 / 640));
  const logoTop = artworkHeight * 0.6;
  const emailTopSpacer = Math.max(height * 0.24, 156);

  const disabled = useMemo(() => {
    if (isBusy || !email.trim() || !password) {
      return true;
    }

    if (!isSignIn) {
      return !name.trim() || !confirmPassword;
    }

    return false;
  }, [confirmPassword, email, isBusy, isSignIn, name, password]);

  if (session) {
    if (loading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator color={authPalette.accent} size="large" />
          <Text style={styles.loadingLabel}>Opening your account</Text>
        </View>
      );
    }

    return (
      <Redirect href={hasCompletedOnboarding ? '../(tabs)/dashboard' : '/onboarding'} />
    );
  }

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
        confirmPassword,
        email: email.trim(),
        name: name.trim(),
        password,
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
      Alert.alert(isSignIn ? 'Auth error' : 'Signup error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOAuth(provider: 'apple' | 'google') {
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

  async function openLegalDocument(path: 'terms' | 'privacy') {
    try {
      await Linking.openURL(`${getMobileApiBaseUrl()}/${path}`);
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
                  <Text style={styles.providerTitle}>{providerHero.title}</Text>
                  <Text style={styles.providerSubtitle}>{providerHero.subtitle}</Text>
                </View>
                <View pointerEvents="none" style={styles.providerArtworkWrap}>
                  <View
                    style={[
                      styles.artworkFrame,
                      styles.providerArtworkFrame,
                      { height: artworkHeight, width: artworkWidth },
                    ]}
                  >
                    <Image source={authBackground} style={styles.artworkImage} />
                    <Image source={authLogoMark} style={[styles.backgroundLogo, { top: logoTop }]} />
                  </View>
                </View>
              </View>
              <View style={styles.providerDockWrap}>
                <View style={styles.providerDock}>
                  <View style={styles.providerStack}>
                    <OAuthButton
                      busy={pendingProvider === 'apple'}
                      disabled={isBusy}
                      label="Continue with Apple"
                      onPress={() => {
                        void handleOAuth('apple');
                      }}
                      provider="apple"
                      testID="oauth-apple"
                    />
                    <OAuthButton
                      busy={pendingProvider === 'google'}
                      disabled={isBusy}
                      label="Continue with Google"
                      onPress={() => {
                        void handleOAuth('google');
                      }}
                      provider="google"
                      testID="oauth-google"
                    />
                  </View>
                  <View style={styles.providerAltSection}>
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
                      <Text style={styles.tertiaryActionLabel}>Continue with email</Text>
                    </Pressable>
                  </View>
                </View>
                {errorMessage ? <Text style={styles.inlineError}>{errorMessage}</Text> : null}
                <Text style={styles.providerLegalCopy}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.inlineLink} onPress={() => void openLegalDocument('terms')}>
                    Terms
                  </Text>{' '}
                  and{' '}
                  <Text style={styles.inlineLink} onPress={() => void openLegalDocument('privacy')}>
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
                    <Pressable accessibilityRole="button" onPress={returnToProviders}>
                      <Text style={styles.backLabel}>Back</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={toggleEmailMode}>
                      <Text style={styles.switchLabel}>
                        {isSignIn ? 'Create account' : 'Sign in'}
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={styles.emailTitle}>{content.title}</Text>

                  {errorMessage ? (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  {!isSignIn ? (
                    <Field
                      label="Full name"
                      placeholder="Enter your name"
                      value={name}
                      onChangeText={setName}
                      testID="auth-name"
                      autoCapitalize="words"
                    />
                  ) : null}

                  <Field
                    label="Email address"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    testID="auth-email"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                  />

                  <Field
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    testID="auth-password"
                    autoCapitalize="none"
                    autoComplete={isSignIn ? 'current-password' : 'new-password'}
                    secureTextEntry
                  />

                  {!isSignIn ? (
                    <Field
                      label="Confirm password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      testID="auth-confirm-password"
                      autoCapitalize="none"
                      autoComplete="new-password"
                      secureTextEntry
                    />
                  ) : null}

                  {isSignIn ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        router.push('/forgot-password' as Href);
                      }}
                    >
                      <Text style={styles.forgotLink}>Forgot your password?</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.supportingCopy}>
                      We&apos;ll send a confirmation email before you enter the app.
                    </Text>
                  )}

                  <ActionButton
                    disabled={disabled}
                    label={content.submitLabel}
                    loading={isSubmitting}
                    onPress={() => {
                      void handleSubmit();
                    }}
                    testID="auth-submit-button"
                    variant="primary"
                  />

                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>{content.footerPrefix} </Text>
                    <Pressable accessibilityRole="button" onPress={toggleEmailMode}>
                      <Text style={styles.footerAction}>{content.footerAction}</Text>
                    </Pressable>
                  </View>

                  <Pressable accessibilityRole="button" onPress={returnToProviders}>
                    <Text style={styles.altMethodText}>Use Apple or Google instead</Text>
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
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'name' | 'email' | 'current-password' | 'new-password' | 'off';
  keyboardType?: 'default' | 'email-address';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  testID: string;
  value: string;
};

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  testID,
  autoCapitalize,
  autoComplete,
  keyboardType,
  secureTextEntry,
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={authPalette.textMuted}
        secureTextEntry={secureTextEntry}
        selectionColor={authPalette.accent}
        style={styles.input}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

type OAuthButtonProps = {
  busy: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
  provider: 'apple' | 'google';
  testID: string;
};

function OAuthButton({
  label,
  provider,
  disabled,
  busy,
  onPress,
  testID,
}: OAuthButtonProps) {
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
      {busy ? (
        <View style={styles.oauthRow}>
          <ActivityIndicator color="#111111" size="small" style={styles.iconSlot} />
          <Text style={styles.lightButtonLabel}>Connecting…</Text>
        </View>
      ) : (
        <View style={styles.oauthRow}>
          <View style={styles.iconSlot}>
            {provider === 'apple' ? <AppleLogo size={22} /> : <GoogleLogo size={22} />}
          </View>
          <Text style={styles.lightButtonLabel}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

type ActionButtonProps = {
  disabled: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  testID: string;
  variant: 'dark' | 'outline' | 'primary';
};

function ActionButton({
  label,
  disabled,
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
        <ActivityIndicator color={authPalette.textPrimary} />
      ) : (
        <Text
          style={
            isPrimary
              ? styles.primaryButtonLabel
              : isOutline
                ? styles.outlineButtonLabel
                : styles.darkButtonLabel
          }
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  altMethodText: {
    color: authPalette.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  artworkFrame: {
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  artworkImage: {
    height: '100%',
    width: '100%',
  },
  authDock: {
    alignSelf: 'center',
    backgroundColor: authPalette.dock,
    borderColor: authPalette.dockBorder,
    borderRadius: 0,
    borderWidth: 1,
    marginBottom: 8,
    maxWidth: 430,
    paddingHorizontal: 18,
    paddingVertical: 18,
    width: '100%',
  },
  backLabel: {
    color: authPalette.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  baseActionButton: {
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 20,
  },
  busyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  darkButton: {
    backgroundColor: authPalette.buttonDark,
  },
  darkButtonLabel: {
    color: authPalette.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  darkButtonPressed: {
    backgroundColor: authPalette.buttonDarkPressed,
  },
  emailScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  emailStack: {
    gap: 14,
  },
  emailTitle: {
    color: authPalette.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  emailTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorBanner: {
    backgroundColor: 'rgba(127, 29, 29, 0.24)',
    borderColor: 'rgba(252, 165, 165, 0.32)',
    borderRadius: 14,
    borderWidth: 1,
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
  flex: {
    flex: 1,
  },
  footerAction: {
    color: authPalette.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerText: {
    color: authPalette.textSecondary,
    fontSize: 13.5,
  },
  forgotLink: {
    color: authPalette.accent,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  iconSlot: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    width: 22,
  },
  inlineError: {
    color: authPalette.danger,
    fontSize: 12.5,
    lineHeight: 17,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  inlineLink: {
    color: authPalette.textSecondary,
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: authPalette.field,
    borderColor: authPalette.fieldBorder,
    borderRadius: 16,
    borderWidth: 1,
    color: authPalette.textPrimary,
    fontSize: 15.5,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  lightButton: {
    alignItems: 'center',
    backgroundColor: authPalette.buttonLight,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    overflow: 'hidden',
    paddingHorizontal: 20,
  },
  lightButtonLabel: {
    color: '#111111',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  lightButtonPressed: {
    backgroundColor: authPalette.buttonLightPressed,
  },
  loadingLabel: {
    color: authPalette.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingState: {
    alignItems: 'center',
    backgroundColor: authPalette.shell,
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  oauthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  outlineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    minHeight: 48,
  },
  outlineButtonLabel: {
    color: authPalette.textSecondary,
    fontSize: 14.5,
    fontWeight: '600',
  },
  outlineButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  primaryButton: {
    backgroundColor: authPalette.accent,
  },
  primaryButtonLabel: {
    color: authPalette.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  primaryButtonPressed: {
    backgroundColor: authPalette.accentPressed,
  },
  providerArtworkFrame: {
    opacity: 0.94,
  },
  providerArtworkWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  providerContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 28,
  },
  providerDock: {
    alignSelf: 'center',
    width: '100%',
  },
  providerDockWrap: {
    alignSelf: 'center',
    gap: 10,
    maxWidth: 398,
    width: '100%',
  },
  providerAltSection: {
    gap: 0,
    paddingTop: 8,
  },
  providerIntro: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 20,
    width: '86%',
  },
  providerLegalCopy: {
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
    borderTopWidth: StyleSheet.hairlineWidth,
    color: 'rgba(255, 255, 255, 0.32)',
    fontSize: 11.5,
    lineHeight: 16,
    paddingHorizontal: 4,
    paddingTop: 12,
    textAlign: 'center',
  },
  providerShell: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 18,
    paddingHorizontal: 24,
  },
  providerStack: {
    gap: 8,
  },
  providerSubtitle: {
    color: authPalette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 240,
    textAlign: 'center',
  },
  providerTitle: {
    color: authPalette.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 32,
    textAlign: 'center',
  },
  root: {
    backgroundColor: authPalette.shell,
    flex: 1,
  },
  safeArea: {
    backgroundColor: authPalette.shell,
    flex: 1,
  },
  supportingCopy: {
    color: authPalette.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
  },
  switchLabel: {
    color: authPalette.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  tertiaryAction: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  tertiaryActionLabel: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  tertiaryActionPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  backgroundLogo: {
    alignSelf: 'center',
    height: 84,
    opacity: 0.96,
    position: 'absolute',
    width: 84,
  },
});
