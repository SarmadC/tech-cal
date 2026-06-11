import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { BrandLoadingScreen } from '../src/components/brand/BrandLoadingScreen';
import { useAuth } from '../src/context/AuthProvider';
import { getLastTab } from '../src/lib/lastTab';

export default function IndexScreen() {
  const { hasCompletedOnboarding, loading, session } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!hasCompletedOnboarding) {
      router.replace('./onboarding');
      return;
    }
    getLastTab()
      .then((lastTab) => {
        router.replace((lastTab ?? '/(tabs)/discover') as Href);
      })
      .catch(() => {
        router.replace('/(tabs)/discover' as Href);
      });
  }, [loading, session, hasCompletedOnboarding]);

  return <BrandLoadingScreen backgroundColor="#05070c" color="#7dd3fc" />;
}
