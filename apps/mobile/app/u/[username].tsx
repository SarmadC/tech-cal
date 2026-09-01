import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CanonicalProfileLinkRoute() {
  const { username } = useLocalSearchParams<{ username: string | string[] }>();
  const value = Array.isArray(username) ? username[0] : username;

  return <Redirect href={{ pathname: '/profile/[username]', params: { username: value ?? '' } }} />;
}
