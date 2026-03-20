import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import CircleHero from '@/components/social/CircleHero';
import CircleMembers from '@/components/social/CircleMembers';
import CircleDiscussions from '@/components/social/CircleDiscussions';
import CircleUpcomingEventsList from '@/components/social/CircleUpcomingEventsList';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import { CircleDiscussionService } from '@/services/circleDiscussionService';

export const revalidate = 60;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: circle } = await supabase
    .from('circles')
    .select('name, description')
    .eq('slug', slug)
    .maybeSingle();

  if (!circle) {
    return { title: 'Circle Not Found | Kure-Cal' };
  }

  const title = `${circle.name} | Kure-Cal`;
  const description = circle.description || `Join the ${circle.name} on Kure-Cal.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  };
}

export default async function CirclePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pageData = await CircleDiscussionService.getCirclePageData({
    slug,
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
      <div className="flex min-h-[100dvh] w-full flex-col overflow-x-clip bg-zinc-50 dark:bg-[#08090a] md:flex-row">
        <AppSidebar />
        <div className="responsive-page-scroll relative flex min-w-0 flex-1 flex-col transition-all duration-300">
          <UnifiedMobileNavbar
            navItems={APP_MOBILE_NAV_ITEMS}
            fixed={true}
            className="border-b border-border/40 bg-white/95 backdrop-blur-xl dark:bg-[#08090a]/95 md:hidden"
          />

          <main className="mobile-top-nav-offset flex-1 pb-[calc(var(--mobile-app-tabbar-offset)+1rem)] md:pb-0 md:pt-0">
            <div className="sticky top-[var(--mobile-app-top-offset)] z-30 md:top-0">
              <CircleHero
                id={pageData.circle.id}
                name={pageData.circle.name}
                description={pageData.circle.description}
                memberCount={pageData.circle.memberCount}
                isJoined={pageData.isJoined}
                icon={undefined}
                onJoinToggle={toggleMembership}
              />
            </div>

            <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.9fr)_300px] lg:gap-10">
                <div className="space-y-8">
                  <CircleDiscussions
                    circleId={pageData.circle.id}
                    circleSlug={pageData.circle.slug}
                    isJoined={pageData.isJoined}
                    currentUser={pageData.currentUserProfile}
                    posts={pageData.posts}
                  />
                </div>

                <div className="hidden space-y-8 lg:block">
                  <div className="sticky top-24 space-y-8">
                    <div className="space-y-4">
                      <div className="mt-1 flex items-center justify-between pb-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Upcoming
                        </h2>
                        <div className="flex items-center gap-3 text-xs font-medium">
                          <Link
                            href={`/calendar?view=month&circle=${pageData.circle.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                          >
                            View calendar
                          </Link>
                        </div>
                      </div>

                      <CircleUpcomingEventsList
                        events={pageData.upcomingEvents}
                        emptyClassName="py-2 text-sm text-zinc-500 dark:text-zinc-400"
                      />
                    </div>

                    <CircleMembers
                      members={pageData.members}
                      totalMembers={pageData.circle.memberCount}
                    />
                  </div>
                </div>
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
