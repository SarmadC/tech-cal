import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CommunityPostDraft } from '@kurecal/domain';
import { HeaderActionButton } from '@/components/chrome/MobilePage';
import { KureScreen } from '@/components/chrome/KureScreen';
import { ScreenState } from '@/components/chrome/ScreenState';
import { CommunityAvatar } from '@/components/community/CommunityAvatar';
import { CommunityFeedCard } from '@/components/community/CommunityFeedCard';
import { CommunityPostComposer } from '@/components/community/CommunityPostComposer';
import { CommunitySection } from '@/components/community/CommunitySection';
import { CommunityUpcomingEventRow } from '@/components/community/CommunityUpcomingEventRow';
import { countThreadComments, formatCommunityCompactCount } from '@/components/community/presentation';
import { getMobileApiClient } from '@/lib/mobileApi';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';
import { useAppTheme } from '@/providers/ThemeProvider';

export default function CommunityCircleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>();
  const circleSlug = Array.isArray(slug) ? slug[0] : slug;
  const queryClient = useQueryClient();
  const apiClient = useMemo(() => getMobileApiClient(), []);
  const { tokens } = useAppTheme();
  const [draft, setDraft] = useState('');

  const circleQuery = useQuery({
    queryKey: mobileQueryKeys.community.circle(circleSlug),
    enabled: Boolean(circleSlug),
    staleTime: mobileQueryStaleTimes.live,
    queryFn: async () => {
      const result = await apiClient.getCommunityCircle(circleSlug!);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Unable to load this circle.');
      }

      return result.data;
    },
  });

  const toggleMembershipMutation = useMutation({
    mutationFn: async ({
      circleId,
      isJoined,
    }: {
      circleId: string;
      isJoined: boolean;
    }) => {
      const result = isJoined
        ? await apiClient.leaveCommunityCircle(circleId)
        : await apiClient.joinCommunityCircle(circleId);

      if (!result.success) {
        throw new Error(result.error ?? 'Unable to update membership.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.root() });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (payload: CommunityPostDraft) => {
      const result = await apiClient.createCommunityPost(payload);
      if (!result.success) {
        throw new Error(result.error ?? 'Unable to publish post.');
      }
    },
    onSuccess: async () => {
      setDraft('');
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.community.root() });
    },
  });

  const page = circleQuery.data;

  async function handleToggleMembership() {
    if (!page) {
      return;
    }

    try {
      await toggleMembershipMutation.mutateAsync({
        circleId: page.circle.id,
        isJoined: page.isJoined,
      });
    } catch (error) {
      Alert.alert(
        page.isJoined ? 'Leave failed' : 'Join failed',
        error instanceof Error ? error.message : 'Unable to update membership.'
      );
    }
  }

  async function handleCreatePost() {
    if (!page) {
      return;
    }

    try {
      await createPostMutation.mutateAsync({
        circleId: page.circle.id,
        circleSlug: page.circle.slug,
        content: draft,
      });
    } catch (error) {
      Alert.alert(
        'Post failed',
        error instanceof Error ? error.message : 'Unable to publish post.'
      );
    }
  }

  return (
    <KureScreen
      title={page?.circle.name ?? 'Circle'}
      subtitle={page?.circle.description ?? 'Circle discussion'}
      action={<HeaderActionButton label="Back" onPress={() => router.back()} />}
    >
      {circleQuery.isLoading && !page ? (
        <ScreenState
          mode="loading"
          title="Loading circle"
          description="Pulling the latest posts, members, and upcoming events."
        />
      ) : null}

      {circleQuery.isError ? (
        <ScreenState
          mode="error"
          title="Circle unavailable"
          description="This circle could not be loaded right now."
        />
      ) : null}

      {page ? (
        <>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.md,
              },
            ]}
          >
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  {formatCommunityCompactCount(page.circle.memberCount)}
                </Text>
                <Text style={[styles.heroStatLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                  members
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  {formatCommunityCompactCount(page.posts.length)}
                </Text>
                <Text style={[styles.heroStatLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                  threads
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  {formatCommunityCompactCount(page.upcomingEvents.length)}
                </Text>
                <Text style={[styles.heroStatLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                  upcoming
                </Text>
              </View>
            </View>
            <View style={styles.heroAction}>
              <HeaderActionButton
                label={toggleMembershipMutation.isPending ? 'Working...' : page.isJoined ? 'Leave circle' : 'Join circle'}
                onPress={handleToggleMembership}
              />
            </View>
          </View>

          {page.isJoined && page.currentUser ? (
            <CommunityPostComposer
              title="Start a conversation"
              value={draft}
              placeholder={`Share something with ${page.circle.name}`}
              submitLabel="Publish post"
              isSubmitting={createPostMutation.isPending}
              onChangeText={setDraft}
              onSubmit={handleCreatePost}
            />
          ) : (
            <ScreenState
              mode="empty"
              title="Join to post"
              description="You can browse this circle now. Join it to publish a thread."
            />
          )}

          {page.members.length > 0 ? (
            <CommunitySection
              title="Members"
              meta={`${formatCommunityCompactCount(page.members.length)} shown`}
            >
              <View style={styles.memberList}>
                {page.members.slice(0, 5).map((member) => (
                  <View
                    key={member.id}
                    style={[
                      styles.memberRow,
                      {
                        borderBottomColor: tokens.colors.divider,
                      },
                    ]}
                  >
                    <CommunityAvatar
                      name={member.fullName}
                      avatarUrl={member.avatarUrl}
                      size={36}
                    />
                    <View style={styles.memberCopy}>
                      <Text style={[styles.memberName, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                        {member.fullName || member.username || 'Community member'}
                      </Text>
                      {member.headline ? (
                        <Text
                          numberOfLines={1}
                          style={[styles.memberHeadline, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}
                        >
                          {member.headline}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </CommunitySection>
          ) : null}

          <CommunitySection
            title="Discussions"
            meta={`${formatCommunityCompactCount(page.posts.length)} threads`}
          >
            {page.posts.length > 0 ? (
              page.posts.map((post, index) => {
                const commentCount = countThreadComments(post.comments ?? []);
                return (
                  <CommunityFeedCard
                    key={post.id}
                    post={{
                      id: post.id,
                      content: post.content,
                      createdAt: post.createdAt,
                      commentCount,
                      isTrending: commentCount >= 8,
                      author: post.author,
                      circle: {
                        slug: page.circle.slug,
                        name: page.circle.name,
                      },
                    }}
                    onPress={() => router.push(`/community/post/${post.id}`)}
                    showDivider={index < page.posts.length - 1}
                  />
                );
              })
            ) : (
              <View style={styles.sectionState}>
                <Text style={[styles.sectionStateTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  No discussions yet
                </Text>
                <Text style={[styles.sectionStateBody, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                  Be the first person to start a thread in this circle.
                </Text>
              </View>
            )}
          </CommunitySection>

          {page.upcomingEvents.length > 0 ? (
            <CommunitySection
              title="Upcoming"
              meta={`${formatCommunityCompactCount(page.upcomingEvents.length)} events`}
            >
              {page.upcomingEvents.map((event, index) => (
                <CommunityUpcomingEventRow
                  key={event.id}
                  title={event.title || 'Upcoming event'}
                  startTime={event.startTime}
                  meta={event.organizerName || 'Community event'}
                  onPress={() => router.push(`/event/${event.id}`)}
                  showDivider={index < page.upcomingEvents.length - 1}
                />
              ))}
            </CommunitySection>
          ) : null}
        </>
      ) : null}
    </KureScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 12,
  },
  heroStat: {
    flex: 1,
    gap: 3,
  },
  heroStatValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  heroStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  heroAction: {
    alignItems: 'flex-start',
  },
  memberList: {
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberCopy: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  memberHeadline: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionState: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 4,
  },
  sectionStateTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionStateBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});
