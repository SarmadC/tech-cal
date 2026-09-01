import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CanonicalEventLinkRoute() {
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>();
  const eventIdentity = Array.isArray(slug) ? slug[0] : slug;

  return <Redirect href={{ pathname: '/event/[id]', params: { id: eventIdentity ?? '' } }} />;
}
