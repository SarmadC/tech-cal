import SettingsScreen from './settings';
import { useAuth } from '../../src/context/AuthProvider';
import { PublicProfileView } from '../profile/[username]';

export default function ProfileTabScreen() {
  const { profile } = useAuth();
  const username = profile?.socialProfile.username?.trim();

  if (username) {
    return <PublicProfileView username={username} />;
  }

  return <SettingsScreen />;
}
