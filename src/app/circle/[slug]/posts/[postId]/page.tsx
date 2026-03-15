import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import AppSidebar from '@/components/app-sidebar';
import CircleContextCard from '@/components/social/CircleContextCard';
import CircleMembers from '@/components/social/CircleMembers';
import PostFeedItem from '@/components/social/PostFeedItem';
import { SidebarProvider } from '@/components/ui/sidebar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import { SITE_URL } from '@/config/site';
import { CircleDiscussionService } from '@/services/circleDiscussionService';
import { formatDate } from '@/utils/dateUtils';
import { buildCirclePostPath, getCirclePostMetaDescription, getCirclePostMetaTitle } from '@/utils/circlePosts';

export const revalidate = 60;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; postId: string }> }
): Promise<Metadata> {
  const { slug, postId } = await params;
  const supabase = await createClient();
  const metadataData = await CircleDiscussionService.getPostMetadataData({
    slug,
    postId,
    readClient: supabase,
  });

  if (!metadataData) {
    return { title: 'Post Not Found | Kure-Cal' };
  }

  const title = getCirclePostMetaTitle(metadataData.postContent, metadataData.circleName);
  const description = getCirclePostMetaDescription(metadataData.postContent);
  const canonical = `${SITE_URL}${buildCirclePostPath(slug, postId)}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
  };
}

export default async function CirclePostPage(
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  const { slug, postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pageData = await CircleDiscussionService.getCirclePostPageData({
    slug,
    postId,
    viewerId: user?.id ?? null,
    readClient: supabase,
  });

  if (!pageData) {
    notFound();
  }

  async function toggleMembership(circleId: string, join: boolean) {
    'use server';

    const client = await createClient();
    const {
      data: { user: currentUser },
    } = await client.auth.getUser();

    if (!currentUser) return false;

    if (join) {
      const { error } = await client
        .from('circle_members')
        .insert({
          circle_id: circleId,
          user_id: currentUser.id,
        });

      if (error) return false;
    } else {
      const { error } = await client
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', currentUser.id);

      if (error) return false;
    }

    revalidatePath(`/circle/${slug}`, 'layout');
    return true;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-50 dark:bg-[#08090a] md:flex-row">
        <AppSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto transition-all duration-300">
          <UnifiedMobileNavbar
            navItems={APP_MOBILE_NAV_ITEMS}
            fixed={true}
            className="border-b border-border/40 bg-white/95 backdrop-blur-xl dark:bg-[#08090a]/95 md:hidden"
          />

          <main className="flex-1 pb-24 pt-16 md:pt-0">
            <div className="border-b border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-[#08090a]">
              <div className="mx-auto max-w-[1180px] px-6 pb-5 pt-4 lg:px-8">
                <Breadcrumbs
                  base={[{ label: 'Community', href: '/community' }]}
                  trail={[
                    { label: pageData.circle.name, href: `/circle/${pageData.circle.slug}` },
                    { label: 'Post' },
                  ]}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Focused thread
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      Read the full discussion, jump into the replies, or head back to the broader circle stream when you want the surrounding context.
                    </p>
                  </div>
                  <Link
                    href={`/circle/${pageData.circle.slug}`}
                    className="inline-flex items-center rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                  >
                    Back to discussions
                  </Link>
                </div>
              </div>
            </div>

            <div className="mx-auto max-w-[1180px] px-6 py-8 lg:px-8">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.7fr)_320px] lg:gap-12">
                <section className="space-y-6">
                  <div className="border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      Thread
                    </p>
                  </div>

                  <PostFeedItem
                    post={pageData.post}
                    circleSlug={pageData.circle.slug}
                    currentUser={pageData.currentUserProfile}
                    isJoined={pageData.isJoined}
                    initialExpanded={true}
                    disableCollapse={true}
                    redirectOnDeleteHref={`/circle/${pageData.circle.slug}`}
                    permalinkHref={buildCirclePostPath(pageData.circle.slug, pageData.post.id)}
                  />
                </section>

                <aside className="space-y-8 lg:sticky lg:top-24">
                  <CircleContextCard
                    id={pageData.circle.id}
                    name={pageData.circle.name}
                    description={pageData.circle.description}
                    memberCount={pageData.circle.memberCount}
                    isJoined={pageData.isJoined}
                    href={`/circle/${pageData.circle.slug}`}
                    onJoinToggle={toggleMembership}
                  />

                  <section className="space-y-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Upcoming
                      </h2>
                      <Link
                        href={`/calendar?view=month&circle=${pageData.circle.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        View calendar
                      </Link>
                    </div>

                    {pageData.upcomingEvents.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No upcoming events.
                      </p>
                    ) : (
                      <div className="flex flex-col">
                        {pageData.upcomingEvents.map((event, index) => {
                          const startTime = event.startTime ? new Date(event.startTime) : null;

                          return (
                            <Link
                              key={event.id}
                              href={`/events/${event.slug}`}
                              className={`group flex flex-col py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                                index !== 0 ? 'border-t border-zinc-100 dark:border-zinc-800/60' : ''
                              }`}
                            >
                              <h3 className="truncate text-sm font-medium text-zinc-900 transition-colors group-hover:text-zinc-600 dark:text-zinc-100 dark:group-hover:text-zinc-400">
                                {event.title}
                              </h3>
                              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                {startTime && <span>{formatDate(startTime)}</span>}
                                {event.organizerName && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">{event.organizerName}</span>
                                  </>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <CircleMembers
                    members={pageData.members}
                    totalMembers={pageData.circle.memberCount}
                  />
                </aside>
              </div>
            </div>
          </main>

          <div className="md:hidden">
            <MobileBottomNav />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
