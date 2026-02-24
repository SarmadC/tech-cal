import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import CircleHero from '@/components/social/CircleHero';
import CircleMembers from '@/components/social/CircleMembers';
import CircleDiscussions from '@/components/social/CircleDiscussions';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import MobileBottomNav from '@/components/common/MobileBottomNav';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import { formatDate } from '@/utils/dateUtils';
import { generateEventSlug } from '@/utils/slugUtils';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import { TagBasedMatchingService } from '@/services/tagBasedMatchingService';
import { CIRCLE_TAG_MAPPINGS } from '@/config/circleTagMappings';
import type { PostType } from '@/components/social/PostFeedItem';

export const revalidate = 60; // Revalidate every minute

interface VoteRow { user_id: string; vote_type: number }
interface CommentRow {
    id: string;
    parent_id: string | null;
    content: string;
    created_at: string;
    author: { id: string; full_name: string | null; avatar_url: string | null } | { id: string; full_name: string | null; avatar_url: string | null }[] | null;
    votes: VoteRow[];
}

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: circle } = await supabase
        .from('circles')
        .select('name, description')
        .eq('slug', slug)
        .single();

    if (!circle) {
        return { title: 'Circle Not Found | Kure-Cal' };
    }

    const title = `${circle.name} | Kure - Cal`;
    const description = circle.description || `Join the ${circle.name} on Kure - Cal.`;

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
                }
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['/og-image.png'],
        }
    };
}

export default async function CirclePage(
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch Circle details
    const { data: circle } = await supabase
        .from('circles')
        .select('*')
        .eq('slug', slug)
        .single();

    if (!circle) {
        notFound();
    }

    // 2. Fetch user-related data and members in parallel
    let isJoined = false;
    let currentUserProfile: { id: string; full_name: string | null; username: string | null; avatar_url: string | null } | null = null;

    const membersQuery = supabase
        .from('circle_members')
        .select(`user_id, profiles(id, full_name, username, avatar_url, headline)`)
        .eq('circle_id', circle.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (user) {
        const [membershipRes, profileRes, membersRes] = await Promise.all([
            supabase.from('circle_members').select('circle_id').eq('circle_id', circle.id).eq('user_id', user.id).single(),
            supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', user.id).single(),
            membersQuery
        ]);

        if (membershipRes.data) isJoined = true;
        currentUserProfile = profileRes.data;
        var membersData = membersRes.data;
    } else {
        const membersRes = await membersQuery;
        var membersData = membersRes.data;
    }

    type MemberRow = NonNullable<typeof membersData>[number];
    const members = (membersData || []).map((m: MemberRow) => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
            id: profile?.id,
            fullName: profile?.full_name,
            username: profile?.username,
            avatarUrl: profile?.avatar_url,
            headline: profile?.headline
        };
    }).filter(m => m.id);

    // 4. Fetch upcoming matching events
    // Merge explicit circle tag mappings with expanded tags for better coverage
    const mappedTags = CIRCLE_TAG_MAPPINGS[circle.slug.toLowerCase()] ?? [];
    const expandedTags = TagBasedMatchingService.expandSearchTerm(circle.slug);
    const allFilterTags = Array.from(new Set([...mappedTags, ...expandedTags]));

    const { data: upcomingEventsDataRaw } = await supabase
        .from('events_detailed')
        .select('*')
        .overlaps('tags', allFilterTags)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(20);

    // Rank events by relevance to the circle
    const circleNameLower = circle.name.toLowerCase();
    const circleSlugLower = circle.slug.toLowerCase();
    const circleKeywords = [circleSlugLower, ...circleNameLower.split(/\s+/)]
        .map(k => k.replace(/[^a-z0-9]/g, ''))
        .filter(k => k.length > 2);

    const upcomingEventsData = (upcomingEventsDataRaw || []).map(event => {
        let score = 0;
        const titleLower = (event.title || '').toLowerCase();
        const descriptionLower = (event.description || '').toLowerCase();
        const eventTags = (event.tags || []).map((t: string) => t.toLowerCase());

        // 1. Title matches (highest boost)
        if (titleLower.includes(circleSlugLower) || titleLower.includes(circleNameLower)) {
            score += 100;
        } else {
            // Check for keywords in title
            for (const kw of circleKeywords) {
                if (titleLower.includes(kw)) {
                    score += 30;
                }
            }
        }

        // 2. Tag matches (strong boost)
        if (eventTags.includes(circleSlugLower)) {
            score += 50;
        }

        // 3. Description matches (modest boost)
        if (descriptionLower.includes(circleSlugLower) || descriptionLower.includes(circleNameLower)) {
            score += 20;
        }

        return { ...event, relevanceScore: score };
    })
        .sort((a, b) => {
            // Sort by relevance score descending, then by start_time ascending
            if (b.relevanceScore !== a.relevanceScore) {
                return b.relevanceScore - a.relevanceScore;
            }
            const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
            const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
            return timeA - timeB;
        })
        .slice(0, 4);

    // 5. Fetch posts and their comments
    const { data: postsData } = await supabase
        .from('circle_posts')
        .select(`
id,
    content,
    created_at,
    author: author_id(id, full_name, avatar_url),
        comments: circle_comments(
            id,
            parent_id,
            content,
            created_at,
            author: author_id(id, full_name, avatar_url),
            votes: circle_comment_votes(user_id, vote_type)
        ),
        votes: circle_post_votes(user_id, vote_type)
            `)
        .eq('circle_id', circle.id)
        .order('created_at', { ascending: false })
        .limit(50);

    // Format comments and posts (resolving array relations and building trees)
    type RawPost = NonNullable<typeof postsData>[number];
    const formattedPosts: PostType[] = (postsData || []).map((post: RawPost) => {
        // Post Aggregates
        const postVotes = (post.votes as VoteRow[]) || [];
        const score = postVotes.reduce((acc, v) => acc + v.vote_type, 0);
        const userVote = user ? postVotes.find(v => v.user_id === user.id)?.vote_type || 0 : 0;

        // Map and resolve comment relations
        const rawComments = ((post.comments as CommentRow[]) || []).map((comment) => {
            const commentVotes: VoteRow[] = comment.votes || [];
            const cScore = commentVotes.reduce((acc, v) => acc + v.vote_type, 0);
            const cUserVote = user ? commentVotes.find(v => v.user_id === user.id)?.vote_type || 0 : 0;
            const resolvedAuthor = Array.isArray(comment.author) ? comment.author[0] : comment.author;

            return {
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                parent_id: comment.parent_id,
                author: resolvedAuthor ?? { id: '', full_name: null, avatar_url: null },
                score: cScore,
                userVote: cUserVote,
                replies: [] as PostType['comments']
            };
        }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Build Nested Comment Tree
        type FlatComment = (typeof rawComments)[number];
        const commentMap = new Map<string, FlatComment>();
        rawComments.forEach(c => commentMap.set(c.id, c));
        const rootComments: FlatComment[] = [];

        rawComments.forEach(c => {
            if (c.parent_id) {
                const parent = commentMap.get(c.parent_id);
                if (parent) {
                    parent.replies.push(c);
                } else {
                    rootComments.push(c);
                }
            } else {
                rootComments.push(c);
            }
        });

        const resolvedPostAuthor = Array.isArray(post.author) ? post.author[0] : post.author;
        return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            author: resolvedPostAuthor ?? { id: '', full_name: null, avatar_url: null },
            comments: rootComments,
            score,
            userVote
        };
    });

    // 6. Build toggle action
    async function toggleMembership(circleId: string, join: boolean) {
        'use server';
        const client = await createClient();
        const { data: { user } } = await client.auth.getUser();

        if (!user) return false;

        if (join) {
            const { error } = await client.from('circle_members')
                .insert({
                    circle_id: circleId,
                    user_id: user.id
                });
            if (error) return false;
        } else {
            const { error } = await client.from('circle_members')
                .delete()
                .eq('circle_id', circleId)
                .eq('user_id', user.id);
            if (error) return false;
        }

        revalidatePath(`/circle/${slug}`);
        return true;
    }

    return (
        <SidebarProvider>
            <div className="flex flex-col md:flex-row h-screen overflow-hidden w-full bg-zinc-50 dark:bg-[#08090a]">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full transition-all duration-300 relative">
                    <UnifiedMobileNavbar
                        navItems={APP_MOBILE_NAV_ITEMS}
                        fixed={true}
                        className="bg-white/95 dark:bg-[#08090a]/95 backdrop-blur-xl border-b border-border/40 md:hidden"
                    />

                    <main className="flex-1 pb-24 pt-16 md:pt-0">
                        <div className="sticky top-16 md:top-0 z-30">
                            <CircleHero
                                id={circle.id}
                                name={circle.name}
                                description={circle.description || ''}
                                memberCount={circle.member_count ?? 0}
                                isJoined={isJoined}
                                icon={undefined}
                                onJoinToggle={toggleMembership}
                            />
                        </div>

                        <div className="max-w-[960px] mx-auto px-6 lg:px-8 py-8">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                                {/* Main Content Area - Feed */}
                                <div className="lg:col-span-8 space-y-8">
                                    <CircleDiscussions
                                        circleId={circle.id}
                                        circleSlug={circle.slug}
                                        isJoined={isJoined}
                                        currentUser={currentUserProfile}
                                        posts={formattedPosts}
                                    />
                                </div>

                                {/* Sidebar - Upcoming Events & Members */}
                                <div className="lg:col-span-4 space-y-8">
                                    <div className="sticky top-24 space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between pb-3 mt-1">
                                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                                    Upcoming
                                                </h2>
                                                <div className="flex items-center gap-3 text-xs font-medium">

                                                    <Link href={`/calendar?view=month&circle=${circle.slug}`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                                                        View calendar
                                                    </Link>
                                                </div>
                                            </div>

                                            {(!upcomingEventsData || upcomingEventsData.length === 0) ? (
                                                <p className="text-zinc-500 dark:text-zinc-400 text-sm py-2">No upcoming events.</p>
                                            ) : (
                                                <div className="flex flex-col">
                                                    {upcomingEventsData.map((evt, i) => {
                                                        const eventSlug = generateEventSlug(evt.title ?? '', evt.id ?? '');
                                                        const startTime = evt.start_time ? new Date(evt.start_time) : null;

                                                        return (
                                                            <Link
                                                                key={evt.id}
                                                                href={`/events/${eventSlug}`}
                                                                className={`group flex flex-col hover:bg-zinc-50 dark:hover:bg-zinc-800/50 py-2 transition-all ${i !== 0 ? 'border-t border-zinc-100 dark:border-zinc-800/60' : ''}`}
                                                            >
                                                                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors truncate">
                                                                    {evt.title}
                                                                </h3>
                                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                                    {startTime && (
                                                                        <span>{formatDate(startTime)}</span>
                                                                    )}
                                                                    {evt.organizer_name && (
                                                                        <>
                                                                            <span>·</span>
                                                                            <span className="truncate">{evt.organizer_name}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <CircleMembers
                                            members={members}
                                            totalMembers={circle.member_count ?? 0}
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
