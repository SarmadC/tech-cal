import { Redirect } from 'expo-router';

import SettingsScreen from './settings';
import { useAuth } from '../../src/context/AuthProvider';

export default function ProfileTabScreen() {
  const { profile } = useAuth();
  const username = profile?.socialProfile.username?.trim();

  if (username) {
    return <Redirect href={`/profile/${username}`} />;
  }

  return <SettingsScreen />;
}
