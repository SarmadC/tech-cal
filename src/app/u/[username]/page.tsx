import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { PublicProfileService } from '@/services/publicProfileService';
import FollowListsPanel from '@/components/social/FollowListsPanel';
import PublicProfileHeader from '@/components/social/PublicProfileHeader';
import PublicProfileTelemetry from '@/components/social/PublicProfileTelemetry';
import {
  ProfileSkills,
  ProfileCareerGoals,
  ProfileNetworkingGoals,
  MutualConnections,
} from '@/components/profile/public';
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
    description: `View @${normalizedUsername}'s public profile, skills, career goals, and network activity on Kure-Cal.`,
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

  const hasCareerProfile = publicProfile.careerProfile !== null;
  const hasMutualConnections = publicProfile.mutualConnectionsCount > 0;

  return (
    <main className="min-h-screen bg-[var(--background-main)]">
      <PublicProfileTelemetry
        profileUserId={publicProfile.id}
        username={publicProfile.username}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Profile Header */}
        <PublicProfileHeader
          key={publicProfile.id}
          profileUserId={publicProfile.id}
          username={publicProfile.username}
          fullName={publicProfile.fullName}
          headline={publicProfile.headline}
          avatarUrl={publicProfile.avatarUrl}
          viewerId={viewerId}
          isViewerOwner={publicProfile.isViewerOwner}
          initialFollowerCount={publicProfile.followerCount}
          initialFollowingCount={publicProfile.followingCount}
          careerProfile={publicProfile.careerProfile}
        />

        {/* Main Content Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Career & Skills */}
          <div className="space-y-6">
            {hasCareerProfile && (
              <>
                <ProfileCareerGoals
                  currentRole={publicProfile.careerProfile!.currentRole}
                  seniority={publicProfile.careerProfile!.seniority}
                  industry={publicProfile.careerProfile!.industry}
                  companySize={publicProfile.careerProfile!.companySize}
                  careerGoals={publicProfile.careerProfile!.careerGoals}
                  timeframe={publicProfile.careerProfile!.timeframe}
                  targetPath={publicProfile.careerProfile!.targetPath}
                />

                <ProfileSkills
                  primarySkills={publicProfile.careerProfile!.primarySkills}
                  skillsToLearn={publicProfile.careerProfile!.skillsToLearn}
                  interests={publicProfile.careerProfile!.interests}
                />

                <ProfileNetworkingGoals
                  networkingGoals={publicProfile.careerProfile!.networkingGoals}
                  preferredEventTypes={publicProfile.careerProfile!.preferredEventTypes}
                  learningStyle={publicProfile.careerProfile!.learningStyle}
                />
              </>
            )}

            {!hasCareerProfile && (
              <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
                <h2 className="text-base font-semibold text-[var(--foreground-primary)]">
                  Career Profile
                </h2>
                <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
                  This user hasn&apos;t completed their career profile yet.
                </p>
              </section>
            )}

            {hasMutualConnections && (
              <MutualConnections
                connections={publicProfile.mutualConnections}
                totalCount={publicProfile.mutualConnectionsCount}
                profileUsername={publicProfile.username}
              />
            )}
          </div>

          {/* Middle & Right Columns - Events & Social */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attending Events */}
            <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[var(--foreground-primary)]">
                  Events
                </h2>
                {publicProfile.isViewerOwner && (
                  <Link
                    href="/calendar"
                    className="text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] transition-colors"
                  >
                    View calendar →
                  </Link>
                )}
              </div>

              {publicProfile.recentAttendingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    {publicProfile.showAttendance || publicProfile.isViewerOwner
                      ? 'No upcoming events. Explore events to start networking!'
                      : 'Attendance is private for this profile.'}
                  </p>
                  {(publicProfile.showAttendance || publicProfile.isViewerOwner) && (
                    <Link
                      href="/discover"
                      className="mt-3 inline-flex items-center px-4 py-2 rounded-lg bg-[var(--foreground-primary)] text-[var(--background-main)] text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Discover Events
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {publicProfile.recentAttendingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.slug}`}
                      className="group flex items-start gap-4 p-4 rounded-lg bg-[var(--background-main)] border border-[var(--border-default)] hover:border-[var(--foreground-tertiary)] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-[var(--foreground-primary)] group-hover:text-[var(--foreground-secondary)] transition-colors truncate">
                          {event.title}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                          {formatEventDate(event.startTime)}
                          {event.location ? ` · ${event.location}` : ''}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-[var(--foreground-tertiary)] group-hover:text-[var(--foreground-secondary)] transition-colors">
                        View →
                      </span>
                    </Link>
                  ))}


                </div>
              )}
            </section>

            {/* Follow Lists */}
            <FollowListsPanel
              profileUserId={publicProfile.id}
              followerCount={publicProfile.followerCount}
              followingCount={publicProfile.followingCount}
            />

            {/* Networking CTA */}
            {!publicProfile.isViewerOwner && viewerId && (
              <section className="rounded-xl border border-[var(--border-default)] bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-5">
                <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">
                  Want to connect?
                </h3>
                <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
                  {hasCareerProfile && publicProfile.careerProfile!.networkingGoals.length > 0
                    ? `Based on their profile, they're open to ${publicProfile.careerProfile!.networkingGoals.includes('find-collaborators') ? 'collaboration' : 'networking'}.`
                    : 'Follow them to stay updated on their event activity and connect at upcoming conferences.'}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Link
                    href={`/community?tab=directory&search=${encodeURIComponent(publicProfile.username)}`}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--foreground-primary)] text-[var(--background-main)] text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    View in Community
                  </Link>
                  {publicProfile.recentAttendingEvents.length > 0 && (
                    <Link
                      href={`/events/${publicProfile.recentAttendingEvents[0].slug}`}
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--background-main)] transition-colors"
                    >
                      See their next event
                    </Link>
                  )}
                </div>
              </section>
            )}

            {!viewerId && (
              <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5 text-center">
                <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">
                  Join Kure-Cal to connect
                </h3>
                <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
                  Sign up to follow @{publicProfile.username} and discover events matched to your career goals.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Link
                    href={`/signup?redirect=${encodeURIComponent(`/u/${publicProfile.username}`)}`}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--foreground-primary)] text-[var(--background-main)] text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Sign up
                  </Link>
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/u/${publicProfile.username}`)}`}
                    className="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--border-default)] text-sm font-medium text-[var(--foreground-primary)] hover:bg-[var(--background-main)] transition-colors"
                  >
                    Log in
                  </Link>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
