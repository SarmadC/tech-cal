import { Redirect } from 'expo-router';

import { BrandLoadingScreen } from '../src/components/brand/BrandLoadingScreen';
import { useAuth } from '../src/context/AuthProvider';

export default function IndexScreen() {
  const { hasCompletedOnboarding, loading, session } = useAuth();

  if (loading) {
    return <BrandLoadingScreen backgroundColor="#05070c" color="#7dd3fc" />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Redirect href={hasCompletedOnboarding ? './(tabs)/dashboard' : './onboarding'} />
  );
}
