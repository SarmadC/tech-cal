import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import AppSidebar from '@/components/app-sidebar';
import CircleContextCard from '@/components/social/CircleContextCard';
import CircleMembers from '@/components/social/CircleMembers';
import CircleUpcomingEventsList from '@/components/social/CircleUpcomingEventsList';
import PostFeedItem from '@/components/social/PostFeedItem';
import { SidebarProvider } from '@/components/ui/sidebar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import { SITE_URL } from '@/config/site';
import { CircleDiscussionService } from '@/services/circleDiscussionService';
import {
  buildCirclePostPath,
  buildCirclePostSlug,
  extractCirclePostId,
  getCirclePostMetaDescription,
  getCirclePostMetaTitle,
} from '@/utils/circlePosts';

export const revalidate = 60;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; postId: string }> }
): Promise<Metadata> {
  const { postId: postKey } = await params;
  const resolvedPostId = extractCirclePostId(postKey);

  if (!resolvedPostId) {
    return { title: 'Post Not Found | Kure-Cal' };
  }

  const supabase = await createClient();
  const metadataData = await CircleDiscussionService.getPostMetadataData({
    postId: resolvedPostId,
    readClient: supabase,
  });

  if (!metadataData) {
    return { title: 'Post Not Found | Kure-Cal' };
  }

  const title = getCirclePostMetaTitle(metadataData.postContent, metadataData.circleName);
  const description = getCirclePostMetaDescription(metadataData.postContent);
  const canonical = `${SITE_URL}${buildCirclePostPath(
    metadataData.circleSlug,
    resolvedPostId,
    metadataData.postContent
  )}`;

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
  const { slug, postId: postKey } = await params;
  const resolvedPostId = extractCirclePostId(postKey);

  if (!resolvedPostId) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pageData = await CircleDiscussionService.getCirclePostPageData({
    postId: resolvedPostId,
    viewerId: user?.id ?? null,
    readClient: supabase,
  });

  if (!pageData) {
    notFound();
  }

  const canonicalPostKey = buildCirclePostSlug(pageData.post.content, pageData.post.id);
  const canonicalPostPath = buildCirclePostPath(
    pageData.circle.slug,
    pageData.post.id,
    pageData.post.content
  );
  const circlePath = `/circle/${pageData.circle.slug}`;

  if (slug !== pageData.circle.slug || postKey !== canonicalPostKey) {
    redirect(canonicalPostPath);
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

    revalidatePath(circlePath, 'layout');
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
              <div className="mx-auto hidden max-w-[1180px] px-6 pb-5 pt-4 lg:px-8 md:block">
                <Breadcrumbs
                  base={[{ label: 'Community', href: '/community' }]}
                  trail={[
                    { label: pageData.circle.name, href: circlePath },
                    { label: 'Post' },
                  ]}
                />
              </div>
            </div>

            <div className="mx-auto max-w-[1180px] px-6 py-8 lg:px-8">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.9fr)_300px] lg:gap-10">
                <section className="space-y-6">
                  <PostFeedItem
                    post={pageData.post}
                    circleSlug={pageData.circle.slug}
                    currentUser={pageData.currentUserProfile}
                    isJoined={pageData.isJoined}
                    initialExpanded={true}
                    disableCollapse={true}
                    redirectOnDeleteHref={circlePath}
                    permalinkHref={canonicalPostPath}
                  />
                </section>

                <aside className="space-y-8 lg:sticky lg:top-24">
                  <CircleContextCard
                    id={pageData.circle.id}
                    name={pageData.circle.name}
                    description={pageData.circle.description}
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

                    <CircleUpcomingEventsList events={pageData.upcomingEvents} />
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
