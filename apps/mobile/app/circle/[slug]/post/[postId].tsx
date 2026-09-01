import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CanonicalCirclePostLinkRoute() {
  const { slug, postId } = useLocalSearchParams<{
    slug: string | string[];
    postId: string | string[];
  }>();

  return (
    <Redirect
      href={{
        pathname: '/community/[slug]/post/[postId]',
        params: {
          slug: Array.isArray(slug) ? slug[0] : slug,
          postId: Array.isArray(postId) ? postId[0] : postId,
        },
      }}
    />
  );
}
