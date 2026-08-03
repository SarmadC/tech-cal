import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandLoadingLogo } from '../../src/components/brand/BrandLoadingLogo';
import { AuthShell, authPalette, authSharedStyles } from '../../src/components/auth/AuthShell';
import { useAuth } from '../../src/context/AuthProvider';

export default function AuthCallbackScreen() {
  const {
    authCompletionError,
    clearAuthCompletionState,
    hasCompletedOnboarding,
    needsUsername,
    hasPendingAuthCallbackUrl,
    isCompletingAuth,
    loading,
    pendingPostAuthRoute,
    retryLastAuthCallback,
    session,
  } = useAuth();
  const clearAuthCompletionStateRef = useRef(clearAuthCompletionState);

  clearAuthCompletionStateRef.current = clearAuthCompletionState;

  useEffect(() => {
    return () => {
      clearAuthCompletionStateRef.current();
    };
  }, []);

  useEffect(() => {
    if (
      loading ||
      isCompletingAuth ||
      authCompletionError ||
      (hasPendingAuthCallbackUrl && !session && !pendingPostAuthRoute)
    ) {
      return;
    }

    if (pendingPostAuthRoute) {
      router.replace(pendingPostAuthRoute as Href);
      return;
    }

    if (!session) {
      router.replace('/login');
      return;
    }

    router.replace(!needsUsername && hasCompletedOnboarding ? '/(tabs)/dashboard' : '/onboarding');
  }, [
    authCompletionError,
    hasCompletedOnboarding,
    hasPendingAuthCallbackUrl,
    isCompletingAuth,
    loading,
    needsUsername,
    pendingPostAuthRoute,
    session,
  ]);

  if (authCompletionError) {
    return (
      <AuthShell
        backHref="/login"
        subtitle="This auth link failed inside the mobile app. Retry once or return to sign in."
        title="We could not finish sign in"
      >
        <Text style={styles.errorMessage}>{authCompletionError}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void retryLastAuthCallback().catch(() => undefined);
            }}
            style={({ pressed }) => [
              authSharedStyles.primaryButton,
              pressed ? authSharedStyles.primaryButtonPressed : null,
            ]}
            testID="auth-callback-retry"
          >
            <Text style={authSharedStyles.primaryButtonLabel}>Retry</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              clearAuthCompletionState();
              router.replace('/login');
            }}
            style={authSharedStyles.secondaryButton}
            testID="auth-callback-back"
          >
            <Text style={authSharedStyles.secondaryButtonLabel}>Back to sign in</Text>
          </Pressable>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      subtitle={
        isCompletingAuth || loading
          ? 'Restoring your account and keeping this auth flow inside the mobile app.'
          : 'Routing you into the signed-in mobile experience.'
      }
      title={isCompletingAuth || loading ? 'Completing sign in' : 'Opening your account'}
    >
      <View style={styles.loadingWrap}>
        <BrandLoadingLogo color={authPalette.accent} size={76} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
  },
  errorMessage: {
    color: authPalette.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
});
