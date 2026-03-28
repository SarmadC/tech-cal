import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { KureButton } from '@/components/chrome/KureButton';
import { KureScreen } from '@/components/chrome/KureScreen';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { useAppTheme } from '@/providers/ThemeProvider';

export default function AuthCallbackScreen() {
  const { tokens } = useAppTheme();
  const {
    session,
    profile,
    isLoading,
    isHydratingProfile,
    isCompletingAuth,
    hasPendingAuthCallbackUrl,
    authCompletionError,
    pendingPostAuthRoute,
    clearAuthCompletionState,
    retryLastAuthCallback,
  } = useMobileAuth();
  const clearAuthCompletionStateRef = useRef(clearAuthCompletionState);
  clearAuthCompletionStateRef.current = clearAuthCompletionState;

  useEffect(() => {
    return () => {
      clearAuthCompletionStateRef.current();
    };
  }, []);

  useEffect(() => {
    if (
      isLoading ||
      isHydratingProfile ||
      isCompletingAuth ||
      authCompletionError ||
      (hasPendingAuthCallbackUrl && !session && !pendingPostAuthRoute)
    ) {
      return;
    }

    if (pendingPostAuthRoute) {
      router.replace(pendingPostAuthRoute);
      return;
    }

    if (!session) {
      router.replace('/(auth)');
      return;
    }

    if (!profile) {
      router.replace('/onboarding');
      return;
    }

    router.replace('/(tabs)/discover');
  }, [
    authCompletionError,
    hasPendingAuthCallbackUrl,
    isCompletingAuth,
    isHydratingProfile,
    isLoading,
    pendingPostAuthRoute,
    profile,
    session,
  ]);

  if (authCompletionError) {
    return (
      <KureScreen
        title="We could not finish sign in"
        subtitle="This auth link failed inside the mobile app. Retry once or return to sign in."
      >
        <View style={styles.errorState}>
          <Text
            style={[
              styles.errorMessage,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {authCompletionError}
          </Text>
          <View style={styles.actions}>
            <KureButton
              onPress={() => retryLastAuthCallback().catch(() => undefined)}
              testID="auth-callback-retry"
            >
              Retry
            </KureButton>
            <KureButton
              variant="secondary"
              onPress={() => {
                clearAuthCompletionState();
                router.replace('/(auth)');
              }}
              testID="auth-callback-back"
            >
              Back to sign in
            </KureButton>
          </View>
        </View>
      </KureScreen>
    );
  }

  if (
    isLoading ||
    isHydratingProfile ||
    isCompletingAuth ||
    (hasPendingAuthCallbackUrl && !session && !pendingPostAuthRoute)
  ) {
    return (
      <KureScreen
        title="Completing sign in"
        subtitle="Restoring your account and keeping this auth flow inside the mobile app."
      >
        <ActivityIndicator color={tokens.colors.accent} size="large" />
      </KureScreen>
    );
  }

  return (
    <KureScreen
      title="Opening your account"
      subtitle="Routing you into the signed-in mobile experience."
    >
      <ActivityIndicator color={tokens.colors.accent} size="large" />
    </KureScreen>
  );
}

const styles = StyleSheet.create({
  errorState: {
    gap: 16,
  },
  errorMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
});
