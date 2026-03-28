import { Redirect, Stack } from 'expo-router';
import { useMobileAuth } from '@/hooks/useMobileAuth';

export default function AuthLayout() {
  const { session, profile, isLoading, isHydratingProfile } = useMobileAuth();

  if (!isLoading && !isHydratingProfile && session && profile) {
    return <Redirect href="/(tabs)/discover" />;
  }

  if (!isLoading && !isHydratingProfile && session && !profile) {
    return <Redirect href="/onboarding" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
