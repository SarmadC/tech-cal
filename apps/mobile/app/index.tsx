import { ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { KureScreen } from '@/components/chrome/KureScreen';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { useAppTheme } from '@/providers/ThemeProvider';

export default function IndexScreen() {
  const { tokens } = useAppTheme();
  const { session, profile, isLoading, isHydratingProfile } = useMobileAuth();

  if (isLoading || isHydratingProfile) {
    return (
      <KureScreen
        title="Loading your orbit"
        subtitle="Bringing your event graph, subscriptions, and community state into the native shell."
      >
        <ActivityIndicator color={tokens.colors.accent} size="large" />
      </KureScreen>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/discover" />;
}
