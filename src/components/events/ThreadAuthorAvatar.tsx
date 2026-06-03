/** Server-safe: no hooks, no interactivity. */

interface ThreadAuthorAvatarProps {
  avatarUrl: string | null | undefined;
  fullName: string | null | undefined;
  username: string;
  /** sm = 20 px (compact preview rows), md = 24 px (room page rows) */
  size?: 'sm' | 'md';
  className?: string;
}

const sizes = {
  sm: { container: 'w-5 h-5', text: 'text-[9px]' },
  md: { container: 'w-6 h-6', text: 'text-[10px]' },
} as const;

export default function ThreadAuthorAvatar({
  avatarUrl,
  fullName,
  username,
  size = 'sm',
  className = '',
}: ThreadAuthorAvatarProps) {
  const { container, text } = sizes[size];
  const displayName = fullName ?? username ?? '?';
  const initial = displayName[0]?.toUpperCase() ?? '?';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${container} rounded-full flex-shrink-0 object-cover ${className}`}
      />
    );
  }

  return (
    <span
      className={`${container} rounded-full flex-shrink-0 bg-[#343536] flex items-center justify-center ${text} text-[#c6c5d5] font-medium ${className}`}
    >
      {initial}
    </span>
  );
}
