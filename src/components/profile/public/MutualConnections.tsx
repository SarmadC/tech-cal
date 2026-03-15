'use client';

import Link from 'next/link';

interface MutualConnection {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
}

interface MutualConnectionsProps {
  connections: MutualConnection[];
  totalCount: number;
  profileUsername: string;
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-[var(--border-default)]"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-[var(--background-main)] border border-[var(--border-default)] flex items-center justify-center text-xs font-medium text-[var(--foreground-secondary)]">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function MutualConnections({
  connections,
  totalCount,
  profileUsername,
}: MutualConnectionsProps) {
  if (totalCount === 0) {
    return null;
  }

  const displayNames = connections.map((c) => c.fullName || `@${c.username}`);
  const remainingCount = totalCount - connections.length;

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">
          Mutual Connections
        </h2>
        <span className="text-xs text-[var(--foreground-tertiary)]">
          {totalCount} {totalCount === 1 ? 'person' : 'people'}
        </span>
      </div>

      <div className="mt-4 flex items-center">
        <div className="flex -space-x-2">
          {connections.slice(0, 5).map((connection) => (
            <Link
              key={connection.id}
              href={`/u/${connection.username}`}
              className="relative z-0 hover:z-10 transition-transform hover:scale-110"
              title={connection.fullName || `@${connection.username}`}
            >
              <Avatar
                name={connection.fullName || connection.username}
                url={connection.avatarUrl}
              />
            </Link>
          ))}
        </div>

        {remainingCount > 0 && (
          <span className="ml-3 text-xs text-[var(--foreground-tertiary)]">
            +{remainingCount} more
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-[var(--foreground-secondary)]">
        You and @{profileUsername} both follow{' '}
        {displayNames.slice(0, 3).join(', ')}
        {remainingCount > 0
          ? ` and ${remainingCount} other${remainingCount === 1 ? '' : 's'}`
          : displayNames.length > 3
          ? ` and ${displayNames.slice(3).join(', ')}`
          : ''}
        .
      </p>

      <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
        <p className="text-xs text-[var(--foreground-tertiary)]">
          <strong className="text-[var(--foreground-secondary)]">Why this matters:</strong>{' '}
          Shared connections create instant credibility. Mention your mutual connections
          when reaching out to break the ice.
        </p>
      </div>
    </section>
  );
}
