import { generateEventSlug } from './slugUtils';

export function extractCirclePostId(postKey: string): string {
  const normalizedKey = postKey.trim();

  if (!normalizedKey) {
    return '';
  }

  const slugParts = normalizedKey.split('--');
  if (slugParts.length > 1) {
    return slugParts[slugParts.length - 1];
  }

  return normalizedKey;
}

export function parseCirclePostContent(content: string): {
  title: string;
  body: string;
  excerpt: string;
} {
  const normalizedContent = content.trim();
  const segments = normalizedContent
    .split('\n')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length > 1) {
    return {
      title: segments[0],
      body: segments.slice(1).join('\n'),
      excerpt: segments.slice(1).join(' ').trim(),
    };
  }

  return {
    title: '',
    body: normalizedContent,
    excerpt: '',
  };
}

export function buildCirclePostSlug(content: string, postId: string): string {
  const { title, body } = parseCirclePostContent(content);
  const canonicalTitle = title || body || 'discussion';
  return generateEventSlug(canonicalTitle, postId);
}

export function buildCirclePostPath(
  circleSlug: string,
  postId: string,
  content?: string
): string {
  const postKey = content ? buildCirclePostSlug(content, postId) : postId;
  return `/circle/${circleSlug}/posts/${postKey}`;
}

export function getCirclePostMetaTitle(content: string, circleName: string): string {
  const { title, body } = parseCirclePostContent(content);
  const baseTitle = title || body || 'Discussion';
  return `${truncateText(baseTitle, 80)} | ${circleName} | Kure-Cal`;
}

export function getCirclePostMetaDescription(content: string): string {
  const { title, body, excerpt } = parseCirclePostContent(content);
  const description = excerpt || body || title || 'Join the conversation.';
  return truncateText(description, 160);
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}
