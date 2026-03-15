import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MagnifyingGlass,
  ArrowRight,
  UsersThree,
  Pulse,
  CirclesFour,
  LockKey,
} from '@phosphor-icons/react/dist/ssr';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { SITE_URL } from '@/config/site';
import CommunityDirectoryCard from '@/components/social/CommunityDirectoryCard';
import CommunityHub from '@/components/social/CommunityHub';
import CommunityAppShell from '@/components/layout/CommunityAppShell';
import { CommunityDirectoryService } from '@/services/communityDirectoryService';
import { CommunityHubService } from '@/services/communityHubService';
import type {
  CommunityHubData,
  CommunityTab,
} from '@/types/community';

interface CommunityPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

const FEATURED_SEARCHES = ['founder', 'machine learning', 'devrel', 'design systems'];
const COMMUNITY_TABS: Array<{
  key: CommunityTab;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof UsersThree;
}> = [
  {
    key: 'directory',
    label: 'Directory',
    eyebrow: 'Public directory',
    title: 'Find the people already shaping your event network.',
    description:
      'Browse public Kure-Cal profiles, search by name or headline, and jump straight into the people behind the events, circles, and conversations you care about.',
    icon: UsersThree,
  },
  {
    key: 'feed',
    label: 'Feed',
    eyebrow: 'Personalized feed',
    title: 'Stay close to the conversations your circles are already having.',
    description:
      'Your feed pulls in recent posts from the circles you join, plus the next events and profile tasks that help you stay visible.',
    icon: Pulse,
  },
  {
    key: 'circles',
    label: 'Circles',
    eyebrow: 'Circle discovery',
    title: 'Join the rooms where your best community conversations belong.',
    description:
      'Keep your joined circles organized, then discover new ones when you want a different room for the conversation.',
    icon: CirclesFour,
  },
];

const EMPTY_HUB_DATA: CommunityHubData = {
  feed: [],
  circles: [],
  progress: {
    completionPercent: 0,
    completedWeight: 0,
    totalWeight: 100,
    tasks: [],
  },
  upcomingEvents: [],
  suggestedMembers: [],
};

function getSingleParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseCommunityTab({
  tab,
  search,
  cursor,
}: {
  tab: string | undefined;
  search: string;
  cursor: string | null;
}): CommunityTab {
  if (tab === 'feed' || tab === 'circles' || tab === 'directory') {
    return tab;
  }

  if (search || cursor) {
    return 'directory';
  }

  return 'feed';
}

function buildCommunityHref({
  tab,
  search,
  cursor,
}: {
  tab?: CommunityTab;
  search?: string;
  cursor?: string | null;
}): string {
  const params = new URLSearchParams();

  if (tab && tab !== 'feed') {
    params.set('tab', tab);
  }

  if (search && tab !== 'feed' && tab !== 'circles') {
    params.set('search', search);
  }

  if (cursor && tab !== 'feed' && tab !== 'circles') {
    params.set('cursor', cursor);
  }

  const query = params.toString();
  return query ? `/community?${query}` : '/community';
}

function renderTabHref({
  tab,
  search,
  cursor,
}: {
  tab: CommunityTab;
  search: string;
  cursor: string | null;
}) {
  if (tab === 'feed') {
    return '/community';
  }

  if (tab === 'directory') {
    return buildCommunityHref({
      tab,
      search: search || undefined,
      cursor,
    });
  }

  return buildCommunityHref({ tab });
}

function GatedCommunityPanel({ tab }: { tab: Exclude<CommunityTab, 'directory'> }) {
  const destination = tab === 'feed' ? '/community' : `/community?tab=${tab}`;
  const title =
    tab === 'feed'
      ? 'Sign in to unlock your personalized feed.'
      : 'Sign in to manage your circles.';
  const body =
    tab === 'feed'
      ? 'Your feed depends on the circles you join, the events you save, and your profile progress. We only render that for signed-in members.'
      : 'Circle memberships, join actions, and recommendations are personal to your account, so this tab opens fully after sign-in.';
  const features =
    tab === 'feed'
      ? [
          'Posts from the circles you already joined',
          'A running view of your saved upcoming events',
          'Profile prompts that improve your visibility',
        ]
      : [
          'Your joined circles and quick leave/join actions',
          'Discovery recommendations matched to your interests',
          'A cleaner way to shape what lands in your feed',
        ];

  return (
    <section className="overflow-hidden rounded-[36px] border border-[var(--border-default)] bg-[var(--background-secondary)]/78 backdrop-blur-sm">
      <div className="p-8 sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-3 text-[var(--foreground-secondary)]">
              <LockKey size={20} className="text-[var(--foreground-primary)]" weight="fill" />
              <p className="text-xs uppercase tracking-[0.26em] text-[var(--foreground-tertiary)]">
                Members only
              </p>
            </div>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-[var(--foreground-primary)] sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--foreground-secondary)] sm:text-base">
              {body}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/login?redirect=${encodeURIComponent(destination)}`}
                className="inline-flex items-center rounded-full bg-[var(--foreground-primary)] px-5 py-2.5 text-sm font-medium text-[var(--background-main)] transition-opacity hover:opacity-90"
              >
                Log in
              </Link>
              <Link
                href={`/signup?redirect=${encodeURIComponent(destination)}`}
                className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--background-main)]/30 px-5 py-2.5 text-sm font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-main)]/55"
              >
                Create account
              </Link>
            </div>
          </div>

          <div className="border-t border-[var(--border-default)]/80 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-tertiary)]">
              What opens after sign-in
            </p>
            <div className="mt-5 space-y-4">
              {features.map((feature, index) => (
                <div
                  key={feature}
                  className={`text-sm leading-6 text-[var(--foreground-secondary)] ${
                    index > 0 ? 'border-t border-[var(--border-default)]/65 pt-4' : ''
                  }`}
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const metadata: Metadata = {
  title: 'Community | Kure-Cal',
  description:
    'Browse public profiles, follow community conversations, and explore circles from one Community destination.',
  alternates: {
    canonical: `${SITE_URL}/community`,
  },
};

function formatTabCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}


export default async function CommunityPage({
  searchParams,
}: CommunityPageProps) {
  const resolvedSearchParams = await searchParams;
  const search =
    getSingleParam(resolvedSearchParams?.search) ||
    getSingleParam(resolvedSearchParams?.q) ||
    '';
  const cursor = getSingleParam(resolvedSearchParams?.cursor) || null;
  const activeTab = parseCommunityTab({
    tab: getSingleParam(resolvedSearchParams?.tab),
    search,
    cursor,
  });
  const tabMeta = COMMUNITY_TABS.find((tab) => tab.key === activeTab) || COMMUNITY_TABS[0];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Community directory is not configured.');
  }

  const viewerSupabase = await createClient();
  const {
    data: { user },
  } = await viewerSupabase.auth.getUser();

  const readSupabase = createServiceClient(supabaseUrl, serviceRoleKey);
  const isSignedIn = Boolean(user);

  const directoryPromise =
    activeTab === 'directory'
      ? CommunityDirectoryService.searchProfiles({
          viewerId: user?.id ?? null,
          viewerScopedClient: user ? viewerSupabase : null,
          readClient: readSupabase,
          options: {
            search,
            cursor,
          },
        })
      : Promise.resolve(null);

  const hubDataPromise =
    user && activeTab !== 'directory'
      ? CommunityHubService.getHubData({
          viewerId: user.id,
          viewerScopedClient: viewerSupabase,
          readClient: readSupabase,
        })
      : Promise.resolve(null);

  const [directory, hubData] = await Promise.all([
    directoryPromise,
    hubDataPromise,
  ]);

  const searchActive = directory?.search.length ? directory.search.length > 0 : search.length > 0;
  const signedInHubData = hubData || EMPTY_HUB_DATA;

  return (
    <CommunityAppShell>
      <main className="min-h-screen bg-[var(--background-main)]">
        <section>
        <div className="mx-auto max-w-[1480px] px-4 pb-14 pt-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--foreground-primary)] sm:text-5xl lg:text-6xl">
                {tabMeta.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--foreground-secondary)] sm:text-lg">
                {tabMeta.description}
              </p>

              <form action="/community" className="mt-8 max-w-2xl">
                <input type="hidden" name="tab" value="directory" />
                <div className="flex flex-col gap-3 border-b border-[var(--border-default)]/70 pb-4 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <MagnifyingGlass
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-tertiary)]"
                    />
                    <input
                      type="search"
                      name="search"
                      defaultValue={directory?.search || search}
                      placeholder="Search names, usernames, or headlines"
                      className="h-12 w-full rounded-full border border-[var(--border-default)]/80 bg-[var(--background-main)]/55 pl-11 pr-4 text-sm text-[var(--foreground-primary)] outline-none transition-colors placeholder:text-[var(--foreground-tertiary)] focus:border-[var(--foreground-secondary)]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--background-secondary)] px-5 text-sm font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-tertiary)]"
                  >
                    Search directory
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {FEATURED_SEARCHES.map((term) => (
                  <Link
                    key={term}
                    href={buildCommunityHref({ tab: 'directory', search: term })}
                    className="rounded-full border border-[var(--border-default)] bg-[var(--background-secondary)]/60 px-3 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] transition-colors hover:text-[var(--foreground-primary)]"
                  >
                    {term}
                  </Link>
                ))}
              </div>
          </div>
        </div>
        </section>

        <section className="relative z-10 mx-auto -mt-5 max-w-[1480px] px-4 pb-10 sm:px-6 lg:px-8">
          <div className="grid gap-3 border-b border-[var(--border-default)]/70 pb-6 md:grid-cols-3">
            {COMMUNITY_TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.key}
                  href={renderTabHref({
                    tab: tab.key,
                    search,
                    cursor,
                  })}
                  className={`rounded-[22px] px-5 py-4 transition-all ${
                    isActive
                      ? 'bg-[var(--background-secondary)]/55 ring-1 ring-[var(--border-default)] shadow-[0_10px_30px_rgba(0,0,0,0.05)]'
                      : 'bg-transparent hover:bg-[var(--background-secondary)]/28'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-[var(--background-main)]/85' : 'bg-[var(--background-secondary)]/55'
                    }`}>
                      <Icon
                        size={20}
                        className={isActive ? 'text-[var(--foreground-primary)]' : 'text-[var(--foreground-secondary)]'}
                      />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        isActive ? 'text-[var(--foreground-primary)]' : 'text-[var(--foreground-primary)]/90'
                      }`}>
                        {tab.label}
                      </p>
                      <p className={`text-xs ${
                        isActive ? 'text-[var(--foreground-secondary)]' : 'text-[var(--foreground-secondary)]/85'
                      }`}>
                        {tab.eyebrow}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-5">
            {activeTab === 'directory' && directory ? (
              <>
                <div className="flex flex-col gap-4 border-b border-[var(--border-default)] pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                      {searchActive ? 'Search results' : 'Browse profiles'}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground-primary)]">
                      {searchActive
                        ? `Results for "${directory.search}"`
                        : 'Newest public profiles'}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--foreground-secondary)]">
                    <span>
                      {formatTabCount(directory.totalCount)}{' '}
                      {directory.totalCount === 1 ? 'profile' : 'profiles'}
                    </span>
                    {searchActive && (
                      <Link
                        href="/community?tab=directory"
                        className="inline-flex items-center rounded-full border border-[var(--border-default)] px-3 py-1.5 font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-secondary)]"
                      >
                        Clear search
                      </Link>
                    )}
                  </div>
                </div>

                {directory.profiles.length > 0 ? (
                  <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {directory.profiles.map((profile) => (
                      <CommunityDirectoryCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 rounded-[32px] border border-dashed border-[var(--border-default)] bg-[var(--background-secondary)]/60 p-10 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                      Nothing matched
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-[var(--foreground-primary)]">
                      No public profiles matched that search.
                    </h3>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--foreground-secondary)]">
                      Try a name, a username, or a shorter phrase from someone&apos;s
                      headline. The directory only includes profiles that are set to
                      public.
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/community?tab=directory"
                        className="inline-flex items-center rounded-full bg-[var(--foreground-primary)] px-4 py-2 text-sm font-medium text-[var(--background-main)] transition-opacity hover:opacity-90"
                      >
                        Reset directory
                      </Link>
                    </div>
                  </div>
                )}

                {directory.nextCursor && (
                  <div className="mt-10 flex justify-center">
                    <Link
                      href={buildCommunityHref({
                        tab: 'directory',
                        search: directory.search || undefined,
                        cursor: directory.nextCursor,
                      })}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--background-secondary)] px-5 py-3 text-sm font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-main)]"
                    >
                      Load more profiles
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </>
            ) : isSignedIn ? (
              <CommunityHub
                data={signedInHubData}
                activeTab={activeTab as Exclude<CommunityTab, 'directory'>}
              />
            ) : (
              <GatedCommunityPanel
                tab={activeTab as Exclude<CommunityTab, 'directory'>}
              />
            )}
          </div>
        </section>
      </main>
    </CommunityAppShell>
  );
}
