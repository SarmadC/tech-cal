import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CanonicalCircleLinkRoute() {
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>();
  const value = Array.isArray(slug) ? slug[0] : slug;

  return <Redirect href={{ pathname: '/community/[slug]', params: { slug: value ?? '' } }} />;
}
