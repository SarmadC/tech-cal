import { describe, expect, it } from "vitest";

import {
  blockedUserSummarySchema,
  communityPostDraftSchema,
  mobileCommunityCirclePageSchema,
  mobileCommunityHubHomeSchema,
  mobileCommunityHomeSchema,
  mobileCommunityNetworkingHomeSchema,
  mobileCommunityPostPageSchema,
  mobileCommunityRoomThreadDetailSchema,
  mobilePublicProfileSchema,
  mobileSpeakerDetailSchema,
} from "./community";

describe("community domain contracts", () => {
  it("parses community drafts used by the shared mutation routes", () => {
    const parsed = communityPostDraftSchema.parse({
      circleId: "11111111-1111-4111-8111-111111111111",
      circleSlug: "ai-builders",
      content: "Launching a new thread for AI Builders",
    });

    expect(parsed.circleSlug).toBe("ai-builders");
  });

  it("parses the mobile community home feed contract", () => {
    const parsed = mobileCommunityHomeSchema.parse({
      summary: {
        trackedUpcomingCount: 2,
        visibleOpportunityCount: 1,
        followUpCount: 1,
        attendanceVisibilityEnabled: true,
      },
      upcomingMoments: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          slug: "design-review-week",
          title: "Design Review Week",
          startTime: "2026-04-02T18:00:00.000Z",
          imageUrl: "https://example.com/design-review-week.png",
          location: "Remote",
          format: "virtual",
          viewerContext: "attending",
          contextLabel: "Tracked",
          recentTrackerCount: 3,
          totalAttendeeCount: 12,
          visibleAttendeeCount: 4,
          networkAttendingCount: 2,
          relationshipAttendeeCount: 1,
          attendeePreview: [
            {
              id: "99999999-9999-4999-8999-999999999999",
              fullName: "Jordan",
              username: "jordan",
              avatarUrl: null,
              isInNetwork: false,
              followsViewer: false,
              isMutualFollow: false,
            },
          ],
          primaryReason: "Visible attendees are already here.",
          whyNow: "The networking context is already warming up.",
          newVisibleAttendeeCount: 3,
          recommendedAction: "expand_people",
        },
      ],
      peopleToMeet: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          fullName: "Ada Lovelace",
          username: "ada",
          avatarUrl: null,
          headline: "Staff engineer",
          company: null,
          bio: null,
          location: "Remote",
          currentRole: "Staff engineer",
          industry: "Developer tools",
          companySize: "medium",
          mutualConnectionsCount: 4,
          isInNetwork: true,
          followsViewer: false,
          isMutualFollow: false,
          sharedUpcomingEventCount: 2,
          soonestSharedEventStartTime: "2026-04-02T18:00:00.000Z",
          sharedEvents: [
            {
              id: "11111111-1111-4111-8111-111111111111",
              slug: "design-review-week",
              title: "Design Review Week",
              startTime: "2026-04-02T18:00:00.000Z",
              location: "Remote",
              format: "virtual",
              viewerContext: "attending",
            },
          ],
          strongestSharedEvent: {
            id: "11111111-1111-4111-8111-111111111111",
            slug: "design-review-week",
            title: "Design Review Week",
            startTime: "2026-04-02T18:00:00.000Z",
            location: "Remote",
            format: "virtual",
            viewerContext: "attending",
          },
          whyNow: "You are both orbiting the same events.",
          recommendedAction: "follow",
        },
      ],
      followUpNow: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          fullName: "Grace Hopper",
          username: "grace",
          avatarUrl: null,
          headline: "Platform lead",
          company: null,
          bio: null,
          location: "Calgary",
          currentRole: "Platform lead",
          industry: "Infrastructure",
          companySize: "large",
          mutualConnectionsCount: 2,
          isInNetwork: false,
          followsViewer: true,
          isMutualFollow: false,
          sharedPastEventCount: 1,
          mostRecentSharedEventStartTime: "2026-03-20T18:00:00.000Z",
          sharedEvents: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              slug: "spring-summit",
              title: "Spring Summit",
              startTime: "2026-03-20T18:00:00.000Z",
              location: "Calgary",
              format: "in-person",
            },
          ],
          strongestSharedEvent: {
            id: "44444444-4444-4444-8444-444444444444",
            slug: "spring-summit",
            title: "Spring Summit",
            startTime: "2026-03-20T18:00:00.000Z",
            location: "Calgary",
            format: "in-person",
          },
          whyNow: "The event is still recent enough for a warm follow-up.",
          recommendedAction: "follow",
        },
      ],
      speakerMatches: [
        {
          speaker: {
            id: "speaker-match-1",
            name: "Jamie Chen",
            title: "AI Product Designer",
            company: "Signal Labs",
            avatarUrl: null,
            photoUrl: null,
            linkedinUrl: "https://linkedin.com/in/jamie-chen",
            twitterUrl: null,
            websiteUrl: null,
            matchedProfileUsername: null,
          },
          event: {
            id: "55555555-5555-4555-8555-555555555555",
            slug: "ai-product-summit",
            title: "AI Product Summit",
            startTime: "2026-02-10T18:00:00.000Z",
            location: "Remote",
            format: "virtual",
          },
          matchReason: "Aligned with your interest in AI.",
          isPastEvent: true,
        },
      ],
      starterProfiles: [
        {
          id: "66666666-6666-4666-8666-666666666666",
          fullName: "Linus Torvalds",
          username: "linus",
          avatarUrl: null,
          headline: "Engineering leader",
          location: null,
          currentRole: "Engineering leader",
          industry: "Developer tools",
          followerCount: 42,
          followingCount: 12,
        },
      ],
      publicProfileCount: 12,
      ambientActivity: {
        publicTrackersToday: 18,
        newPublicProfilesThisWeek: 4,
        roomsWithFreshTrackingCount: 1,
      },
    });

    expect(parsed.upcomingMoments[0]?.title).toBe("Design Review Week");
    expect(parsed.peopleToMeet[0]?.username).toBe("ada");
    expect(parsed.followUpNow[0]?.username).toBe("grace");
    expect(parsed.speakerMatches?.[0]?.speaker.name).toBe("Jamie Chen");
    expect(parsed.publicProfileCount).toBe(12);
  });

  it("keeps the networking contract separate from hub preview fields", () => {
    const parsed = mobileCommunityNetworkingHomeSchema.parse({
      summary: {
        trackedUpcomingCount: 0,
        visibleOpportunityCount: 0,
        followUpCount: 0,
        attendanceVisibilityEnabled: true,
      },
      upcomingMoments: [],
      peopleToMeet: [],
      followUpNow: [],
      feed: [
        {
          id: "post-1",
          content: "Hub-only post.",
          createdAt: "2026-04-01T18:00:00.000Z",
          author: { id: "author-1", fullName: null, avatarUrl: null },
          circle: { slug: "ai-builders", name: "AI Builders" },
          commentCount: 0,
          isTrending: false,
        },
      ],
    });

    expect("feed" in parsed).toBe(false);
  });

  it("parses the explicit mobile community hub home contract", () => {
    const parsed = mobileCommunityHubHomeSchema.parse({
      summary: {
        trackedUpcomingCount: 0,
        visibleOpportunityCount: 0,
        followUpCount: 0,
        attendanceVisibilityEnabled: true,
      },
      upcomingMoments: [],
      peopleToMeet: [],
      followUpNow: [],
      feed: [
        {
          id: "post-1",
          content: "What are people using for local AI evals?",
          createdAt: "2026-04-01T18:00:00.000Z",
          author: { id: "author-1", fullName: "Maya Patel", avatarUrl: null },
          circle: { slug: "ai-builders", name: "AI Builders" },
          commentCount: 9,
          isTrending: true,
          recentComments: [],
        },
      ],
      circles: [
        {
          id: "circle-1",
          slug: "mobile-devs",
          name: "Mobile Devs",
          description: "Mobile builders.",
          memberCount: 88,
          isJoined: true,
        },
      ],
      communityUpcomingEvents: [
        {
          id: "event-1",
          slug: "expo-conf",
          title: "Expo Conf",
          startTime: "2026-04-10T18:00:00.000Z",
          location: "Remote",
          format: "virtual",
        },
      ],
    });

    const home = mobileCommunityHomeSchema.parse(parsed);
    expect(home.feed?.[0]?.isTrending).toBe(true);
    expect(home.circles?.[0]?.slug).toBe("mobile-devs");
    expect(home.communityUpcomingEvents?.[0]?.slug).toBe("expo-conf");
  });

  it("parses public profile and speaker payloads used by community drill-downs", () => {
    const profile = mobilePublicProfileSchema.parse({
      id: "77777777-7777-4777-8777-777777777777",
      fullName: "Ada Lovelace",
      avatarUrl: null,
      username: "ada",
      headline: "Staff engineer",
      isViewerOwner: false,
      followerCount: 12,
      followingCount: 8,
      relationship: {
        isFollowing: true,
        isFollowedBy: false,
        isBlockedByUser: false,
        hasBlockedUser: false,
      },
      recentAttendingEvents: [],
      careerProfile: {
        currentRole: "Engineer",
        seniority: "staff",
        industry: "Developer tools",
      },
      mutualConnections: [],
      mutualConnectionsCount: 0,
    });

    const speaker = mobileSpeakerDetailSchema.parse({
      id: "speaker-1",
      name: "Dana Scully",
      title: "AI Research Lead",
      company: "Signal Labs",
      bio: "Leads applied AI research.",
      photoUrl: null,
      linkedinUrl: "https://linkedin.com/in/dana",
      twitterUrl: null,
      websiteUrl: null,
      events: [],
    });

    expect(profile.username).toBe("ada");
    expect(speaker.name).toBe("Dana Scully");
  });

  it("parses circle and post page contracts with nested comments", () => {
    const circlePage = mobileCommunityCirclePageSchema.parse({
      header: {
        eyebrow: "Circle",
        title: "AI Builders",
        subtitle: "A circle for AI builders.",
      },
      circle: {
        id: "circle-1",
        slug: "ai-builders",
        name: "AI Builders",
        description: "A circle for AI builders.",
        memberCount: 42,
      },
      isJoined: true,
      currentUser: {
        id: "user-1",
        fullName: "Ada Lovelace",
        username: "ada",
        avatarUrl: null,
      },
      members: [],
      upcomingEvents: [],
      posts: [
        {
          id: "post-1",
          content: "What are you building?",
          createdAt: "2026-04-03T00:00:00.000Z",
          author: {
            id: "user-2",
            fullName: "Grace Hopper",
            avatarUrl: null,
          },
          comments: [
            {
              id: "comment-1",
              parentId: null,
              content: "An agent workflow.",
              createdAt: "2026-04-03T01:00:00.000Z",
              author: {
                id: "user-3",
                fullName: "Linus Torvalds",
                avatarUrl: null,
              },
              replies: [],
            },
          ],
        },
      ],
    });

    const postPage = mobileCommunityPostPageSchema.parse({
      header: {
        eyebrow: "Thread",
        title: "AI Builders",
        subtitle: "A circle for AI builders.",
      },
      circle: circlePage.circle,
      isJoined: true,
      currentUser: circlePage.currentUser,
      upcomingEvents: [],
      post: circlePage.posts[0],
    });

    expect(circlePage.posts[0]?.comments[0]?.content).toBe(
      "An agent workflow.",
    );
    expect(postPage.post.id).toBe("post-1");
  });

  it("parses blocked user summaries used by mobile community actions", () => {
    const blocked = blockedUserSummarySchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      fullName: "Blocked Member",
      avatarUrl: null,
      username: "blocked-member",
      headline: "ML Engineer",
      blockedAt: "2026-04-04T00:00:00.000Z",
    });

    expect(blocked.username).toBe("blocked-member");
  });

  it("parses paged mobile room thread comments", () => {
    const parsed = mobileCommunityRoomThreadDetailSchema.parse({
      thread: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Realtime comments",
        body: "Discuss live updates.",
        commentCount: 1,
        createdAt: "2026-05-16T18:00:00.000Z",
        lastActivityAt: "2026-05-16T18:01:00.000Z",
        author: {
          id: "22222222-2222-4222-8222-222222222222",
          fullName: "Ada Lovelace",
          username: "ada",
          avatarUrl: null,
          headline: null,
        },
        isAuthor: false,
        editedAt: null,
      },
      comments: [],
      commentPage: {
        comments: [],
        nextCursor: "cursor",
        hasMore: true,
        loadedCount: 0,
      },
    });

    expect(parsed.commentPage.hasMore).toBe(true);
  });
});
