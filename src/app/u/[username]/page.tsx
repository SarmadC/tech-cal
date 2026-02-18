import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { PublicProfileService } from '@/services/publicProfileService';
import FollowListsPanel from '@/components/social/FollowListsPanel';
import PublicProfileHeader from '@/components/social/PublicProfileHeader';
import PublicProfileTelemetry from '@/components/social/PublicProfileTelemetry';
import { SITE_URL } from '@/config/site';

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

function formatEventDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const normalizedUsername = username.trim();

  return {
    title: `@${normalizedUsername} | Kure-Cal`,
    description: `View @${normalizedUsername}'s public profile and network activity on Kure-Cal.`,
    alternates: {
      canonical: `${SITE_URL}/u/${encodeURIComponent(normalizedUsername)}`,
    },
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const normalizedUsername = username.trim();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Public profile service is not configured.');
  }

  const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const userScopedSupabase = await createClient();
  const { data: { user } } = await userScopedSupabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const publicProfile = await PublicProfileService.getPublicProfileByUsername(
    normalizedUsername,
    viewerId,
    readSupabase
  );

  if (!publicProfile) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <PublicProfileTelemetry
        profileUserId={publicProfile.id}
        username={publicProfile.username}
      />

      <PublicProfileHeader
        key={publicProfile.id}
        profileUserId={publicProfile.id}
        username={publicProfile.username}
        fullName={publicProfile.fullName}
        headline={publicProfile.headline}
        viewerId={viewerId}
        isViewerOwner={publicProfile.isViewerOwner}
        initialFollowerCount={publicProfile.followerCount}
        initialFollowingCount={publicProfile.followingCount}
      />

      <section className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Recent attending events</h2>
        {publicProfile.recentAttendingEvents.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
            {publicProfile.showAttendance || publicProfile.isViewerOwner
              ? 'No attending events to show yet.'
              : 'Attendance is private for this profile.'}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {publicProfile.recentAttendingEvents.map((event) => (
              <li key={event.id} className="rounded-md border border-[var(--border-default)] bg-[var(--background-main)] p-3">
                <Link
                  href={`/events/${event.slug}`}
                  className="text-sm font-medium text-[var(--foreground-primary)] hover:underline"
                >
                  {event.title}
                </Link>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                  {formatEventDate(event.startTime)}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4">
        <FollowListsPanel
          profileUserId={publicProfile.id}
          followerCount={publicProfile.followerCount}
          followingCount={publicProfile.followingCount}
        />
      </div>
    </main>
  );
}
