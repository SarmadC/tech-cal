import {
  mobileCommunityCirclePageSchema,
  mobileCommunityEventsSchema,
  mobileCommunityHomeSchema,
  mobileCommunityPeopleSchema,
  mobileCommunityPostPageSchema,
  mobileNetworkingStateSchema,
  mobilePublicProfileSchema,
  type MobileCommunityAuthor,
  type MobileCommunityCircle,
  type MobileCommunityCirclePage,
  type MobileCommunityCircleMember,
  type MobileCommunityComment,
  type MobileCommunityCurrentUser,
  type MobileCommunityEvents,
  type MobileCommunityHome,
  type MobileCommunityPeople,
  type MobileCommunityPost,
  type MobileCommunityPostPage,
  type MobileCommunityUpcomingEvent,
  type MobileNetworkingState,
  type MobilePublicProfile,
} from "@kurecal/domain";

import type {
  CircleDiscussionPageData,
  CirclePostPageData,
} from "@/services/circleDiscussionService";
import type { CommunityEventsData } from "@/services/communityEventsService";
import type { CommunityPeopleData } from "@/services/communityPeopleService";
import type { FollowStatus } from "@/services/followService";
import type { PublicProfileResult } from "@/services/publicProfileService";
import type {
  CommunityNetworkingHomeData,
  MobileCommunityPulsePreviewData,
  NetworkingFollowUpCard,
  NetworkingOpportunityEvent,
  NetworkingPersonCard,
  NetworkingSharedEvent,
} from "@/types/community";
import type {
  CircleDiscussionAuthor,
  CircleDiscussionComment,
  CircleDiscussionCurrentUser,
  CircleDiscussionMember,
  CircleDiscussionPost,
  CircleDiscussionUpcomingEvent,
} from "@/types/circleDiscussions";

function toAuthor(author: CircleDiscussionAuthor): MobileCommunityAuthor {
  return {
    id: author.id,
    fullName: author.full_name,
    avatarUrl: author.avatar_url,
  };
}

function toCurrentUser(
  currentUser: CircleDiscussionCurrentUser | null,
): MobileCommunityCurrentUser | null {
  if (!currentUser) {
    return null;
  }

  return {
    id: currentUser.id,
    fullName: currentUser.fullName,
    username: currentUser.username,
    avatarUrl: currentUser.avatarUrl,
  };
}

function toMember(member: CircleDiscussionMember): MobileCommunityCircleMember {
  return {
    id: member.id,
    fullName: member.fullName,
    username: member.username,
    avatarUrl: member.avatarUrl,
    headline: member.headline,
  };
}

function toUpcomingEvent(
  event: CircleDiscussionUpcomingEvent,
): MobileCommunityUpcomingEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title ?? "Untitled Event",
    startTime: event.startTime ?? new Date(0).toISOString(),
    location: event.organizerName,
    format: null,
    organizerLogoUrl: event.organizerLogoUrl,
  };
}

function normalizeVoteValue(
  value: number | null | undefined,
): -1 | 0 | 1 | null {
  if (value === -1 || value === 0 || value === 1) {
    return value;
  }

  return null;
}

function toComment(comment: CircleDiscussionComment): MobileCommunityComment {
  return {
    id: comment.id,
    parentId: comment.parent_id,
    content: comment.content,
    createdAt: comment.created_at,
    author: toAuthor(comment.author),
    isRemoved: comment.isRemoved ?? false,
    score: comment.score ?? undefined,
    userVote: normalizeVoteValue(comment.userVote) ?? undefined,
    replies: comment.replies.map((reply) => toComment(reply)),
  };
}

function toPost(post: CircleDiscussionPost): MobileCommunityPost {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.created_at,
    author: toAuthor(post.author),
    comments: post.comments.map((comment) => toComment(comment)),
    isRemoved: post.isRemoved ?? false,
    score: post.score ?? undefined,
    userVote: normalizeVoteValue(post.userVote) ?? undefined,
    postType: post.postType,
    eventId: post.eventId,
    event: post.event ?? null,
    mentions: post.mentions ?? [],
    media: post.media ?? [],
    linkPreviews: post.linkPreviews ?? [],
    isPinned: post.isPinned ?? false,
  };
}

function toCircleSummary(input: {
  id: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  isJoined?: boolean;
  membershipState?: "none" | "following" | "joined";
  tagline?: string | null;
  coverImageUrl?: string | null;
  iconUrl?: string | null;
  theme?: string | null;
  topicTags?: string[];
  locationScope?: string | null;
  activeMemberCount30d?: number;
  upcomingEventCount?: number;
}): MobileCommunityCircle {
  const isJoined =
    input.isJoined ??
    (input.membershipState ? input.membershipState === "joined" : undefined);

  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    description: input.description,
    memberCount: input.memberCount,
    isJoined,
    membershipState: input.membershipState,
    tagline: input.tagline ?? null,
    coverImageUrl: input.coverImageUrl ?? null,
    iconUrl: input.iconUrl ?? null,
    theme: input.theme ?? null,
    topicTags: input.topicTags ?? [],
    locationScope: input.locationScope ?? null,
    activeMemberCount30d: input.activeMemberCount30d ?? 0,
    upcomingEventCount: input.upcomingEventCount ?? 0,
  };
}

function getNetworkingDisplayName(value: {
  fullName: string | null;
  username: string;
}): string {
  return value.fullName || `@${value.username}`;
}

function getEventPrimaryReason(event: NetworkingOpportunityEvent): string {
  if (event.contextLabel) {
    if (event.visibleAttendeeCount > 0) {
      return `${event.visibleAttendeeCount} public attendees are already visible`;
    }

    if ((event.recentTrackerCount ?? 0) > 0) {
      return `${event.recentTrackerCount} public profiles tracked this event this week`;
    }

    if (event.totalAttendeeCount > 0) {
      return `${event.totalAttendeeCount} people already have this event on their radar`;
    }

    return "This event is already drawing broader community attention";
  }

  if (event.relationshipAttendeeCount > 0) {
    return `${event.relationshipAttendeeCount} people you already know are visible here`;
  }

  if (event.networkAttendingCount > 0) {
    return `${event.networkAttendingCount} people you follow are visible here`;
  }

  if ((event.recentTrackerCount ?? 0) > 0) {
    return `${event.recentTrackerCount} public profiles tracked this event this week`;
  }

  if (event.totalAttendeeCount > 0) {
    return `${event.totalAttendeeCount} attendees are already attached to this event`;
  }

  return "Attendee visibility is still building around this event";
}

function getEventWhyNow(event: NetworkingOpportunityEvent): string {
  if (event.contextLabel) {
    if (event.visibleAttendeeCount > 0) {
      return "Public attendees are already visible here, so this is a stronger event to start networking around.";
    }

    if (event.location) {
      return `This event is already attracting public interest, especially if ${event.location} is part of your tech-event orbit.`;
    }

    return "The wider community is already clustering around this event, so it is a useful place to start before your own overlap builds up.";
  }

  if (event.relationshipAttendeeCount > 0) {
    return "This event already has people you know attached to it, so the networking path is clearer before you arrive.";
  }

  if (event.networkAttendingCount > 0) {
    return "Your network is already starting to gather here, which makes this event more useful than a cold start.";
  }

  if ((event.recentTrackerCount ?? 0) > 0) {
    return "This event is already drawing real interest, even before attendee visibility fully opens up.";
  }

  if (event.totalAttendeeCount > 0) {
    return "People are already attaching themselves to this event, so it is worth keeping on your radar before visibility gets stronger.";
  }

  return "This is a real upcoming event worth tracking while attendee signal catches up.";
}

function getStrongestSharedEvent(
  sharedEvents: NetworkingSharedEvent[],
): NetworkingSharedEvent | null {
  return sharedEvents[0] ?? null;
}

function getPersonWhyNow(person: NetworkingPersonCard): string {
  const strongestSharedEvent = getStrongestSharedEvent(person.sharedEvents);
  const displayName = getNetworkingDisplayName(person);

  if (!strongestSharedEvent) {
    return `${displayName} is already moving inside the same event orbit as you.`;
  }

  if (person.isMutualFollow) {
    return `You already follow each other, and ${strongestSharedEvent.title} gives you a concrete reason to reconnect.`;
  }

  if (person.followsViewer) {
    return `${displayName} already follows you, and ${strongestSharedEvent.title} gives you a clear opening to respond.`;
  }

  if (person.sharedUpcomingEventCount > 1) {
    return `${displayName} overlaps with ${person.sharedUpcomingEventCount} of your tracked events, starting with ${strongestSharedEvent.title}.`;
  }

  return `${displayName} is tied to ${strongestSharedEvent.title}, so this is a timely connection instead of a random profile browse.`;
}

function getFollowUpWhyNow(person: NetworkingFollowUpCard): string {
  const strongestSharedEvent = getStrongestSharedEvent(person.sharedEvents);
  const displayName = getNetworkingDisplayName(person);

  if (!strongestSharedEvent) {
    return `${displayName} is still warm from a recent shared event.`;
  }

  if (person.isMutualFollow) {
    return `You already follow each other, and ${strongestSharedEvent.title} keeps the follow-up specific.`;
  }

  if (person.followsViewer) {
    return `${displayName} already follows you, and ${strongestSharedEvent.title} gives you a concrete reason to reply.`;
  }

  if (person.sharedPastEventCount > 1) {
    return `You recently crossed paths at ${person.sharedPastEventCount} events, most recently ${strongestSharedEvent.title}.`;
  }

  return `You recently shared ${strongestSharedEvent.title}, so this follow-up still has context.`;
}

export function buildMobileCommunityHome(
  data: CommunityNetworkingHomeData,
  pulse?: MobileCommunityPulsePreviewData,
): MobileCommunityHome {
  return mobileCommunityHomeSchema.parse({
    summary: data.summary,
    upcomingMoments: data.priorityEvents.map((event) => ({
      ...event,
      imageUrl: event.imageUrl ?? null,
      speakerPreview: event.speakers?.map((speaker) => ({
        id: speaker.id,
        name: speaker.name,
        title: speaker.title,
        company: speaker.company,
        photoUrl: speaker.photoUrl,
        linkedinUrl: speaker.linkedinUrl,
        twitterUrl: speaker.twitterUrl,
        websiteUrl: speaker.websiteUrl,
        matchedProfileUsername: null,
      })),
      primaryReason: getEventPrimaryReason(event),
      whyNow: getEventWhyNow(event),
      newVisibleAttendeeCount: event.recentTrackerCount ?? 0,
      recommendedAction:
        event.attendeePreview.length > 0 ? "expand_people" : "open_event",
    })),
    peopleToMeet: data.meetPeople.map((person) => ({
      ...person,
      strongestSharedEvent: getStrongestSharedEvent(person.sharedEvents),
      whyNow: getPersonWhyNow(person),
      recommendedAction: person.isInNetwork ? "expand_context" : "follow",
    })),
    followUpNow: data.followUps.map((person) => ({
      ...person,
      strongestSharedEvent: getStrongestSharedEvent(person.sharedEvents),
      whyNow: getFollowUpWhyNow(person),
      recommendedAction: person.isInNetwork ? "expand_context" : "follow",
    })),
    speakerMatches: data.speakerMatches?.map((match) => ({
      speaker: {
        id: match.speaker.id,
        name: match.speaker.name,
        title: match.speaker.title,
        company: match.speaker.company,
        photoUrl: match.speaker.photoUrl,
        linkedinUrl: match.speaker.linkedinUrl,
        twitterUrl: match.speaker.twitterUrl,
        websiteUrl: match.speaker.websiteUrl,
        matchedProfileUsername: null,
      },
      event: match.event,
      matchReason: match.matchReason,
      isPastEvent: true,
    })),
    starterProfiles: data.starterProfiles ?? [],
    publicProfileCount: data.publicProfileCount ?? 0,
    ambientActivity: data.ambientActivity ?? {
      publicTrackersToday: 0,
      newPublicProfilesThisWeek: 0,
      roomsWithFreshTrackingCount: 0,
    },
    feed: pulse?.feed ?? [],
    circles:
      pulse?.circles.map((circle) => ({
        id: circle.id,
        slug: circle.slug,
        name: circle.name,
        description: circle.description,
        memberCount: circle.memberCount,
        isJoined: circle.isJoined,
      })) ?? [],
    communityUpcomingEvents: pulse?.communityUpcomingEvents ?? [],
  });
}

export function buildMobileCommunityCirclePage(
  data: CircleDiscussionPageData,
): MobileCommunityCirclePage {
  return mobileCommunityCirclePageSchema.parse({
    header: {
      eyebrow: "Circle",
      title: data.circle.name,
      subtitle: data.circle.description,
    },
    circle: toCircleSummary({
      id: data.circle.id,
      slug: data.circle.slug,
      name: data.circle.name,
      description: data.circle.description,
      memberCount: data.circle.memberCount,
      isJoined: data.isJoined,
      membershipState: data.membershipState,
    }),
    isJoined: data.isJoined,
    isModerator: data.isModerator,
    currentUser: toCurrentUser(data.currentUserProfile),
    members: data.members.map((member) => toMember(member)),
    upcomingEvents: data.upcomingEvents.map((event) => toUpcomingEvent(event)),
    posts: data.posts.map((post) => toPost(post)),
  });
}

export function buildMobileCommunityPeople(
  data: CommunityPeopleData,
): MobileCommunityPeople {
  return mobileCommunityPeopleSchema.parse({
    header: {
      eyebrow: data.circle.name,
      title: "People",
      subtitle: "Members worth meeting in this community",
    },
    circle: toCircleSummary(data.circle),
    peopleForYou: data.peopleForYou,
    activeMembers: data.activeMembers,
    goingToNextEvent: data.goingToNextEvent,
    mutuals: data.mutuals,
    newMembers: data.newMembers,
  });
}

export function buildMobileCommunityEvents(
  data: CommunityEventsData,
): MobileCommunityEvents {
  return mobileCommunityEventsSchema.parse({
    header: {
      eyebrow: data.circle.name,
      title: "Events",
      subtitle: "Activations from this community",
    },
    circle: toCircleSummary(data.circle),
    nextUp: data.nextUp,
    thisMonth: data.thisMonth,
    past: data.past,
    popularWithMembers: data.popularWithMembers,
  });
}

export function buildMobileCommunityPostPage(
  data: CirclePostPageData,
): MobileCommunityPostPage {
  return mobileCommunityPostPageSchema.parse({
    header: {
      eyebrow: "Thread",
      title: data.circle.name,
      subtitle: data.circle.description,
    },
    circle: toCircleSummary({
      id: data.circle.id,
      slug: data.circle.slug,
      name: data.circle.name,
      description: data.circle.description,
      memberCount: data.circle.memberCount,
      isJoined: data.isJoined,
      membershipState: data.membershipState,
    }),
    isJoined: data.isJoined,
    currentUser: toCurrentUser(data.currentUserProfile),
    upcomingEvents: data.upcomingEvents.map((event) => toUpcomingEvent(event)),
    post: toPost(data.post),
  });
}

export function toMobilePublicProfile(
  profile: PublicProfileResult,
  relationship: FollowStatus | null,
  networkingState?: MobileNetworkingState,
): MobilePublicProfile {
  return mobilePublicProfileSchema.parse({
    id: profile.id,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    username: profile.username,
    headline: profile.headline,
    bio: profile.bio,
    showAttendance: profile.showAttendance,
    isViewerOwner: profile.isViewerOwner,
    followerCount: profile.followerCount,
    followingCount: profile.followingCount,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl,
    relationship: relationship
      ? {
          isFollowing: relationship.isFollowing,
          isFollowedBy: relationship.isFollowedBy,
          isBlockedByUser: relationship.isBlockedByUser,
          hasBlockedUser: relationship.hasBlockedUser,
        }
      : null,
    recentAttendingEvents: profile.recentAttendingEvents.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      activityType: event.activityType,
      role: event.role,
      mutualAttendeeCount: event.mutualAttendeeCount,
      connectionsMadeCount: event.connectionsMadeCount,
    })),
    eventCounts: profile.eventCounts,
    careerProfile: profile.careerProfile
      ? {
          currentRole: profile.careerProfile.currentRole,
          seniority: profile.careerProfile.seniority,
          industry: profile.careerProfile.industry,
          primarySkills: profile.careerProfile.primarySkills,
          skillsToLearn: profile.careerProfile.skillsToLearn,
          interests: profile.careerProfile.interests,
          careerGoals: profile.careerProfile.careerGoals,
          networkingGoals: profile.careerProfile.networkingGoals,
          preferredEventTypes: profile.careerProfile.preferredEventTypes,
        }
      : null,
    mutualConnections: profile.mutualConnections.map((connection) => ({
      id: connection.id,
      fullName: connection.fullName,
      username: connection.username,
      avatarUrl: connection.avatarUrl,
      headline: connection.headline,
    })),
    mutualConnectionsCount: profile.mutualConnectionsCount,
    sharedEventsCount: profile.sharedEventsCount,
    sharedTopics: profile.sharedTopics,
    sharedCircles: profile.sharedCircles,
    sharedCirclesCount: profile.sharedCirclesCount,
    recommendedBy: profile.recommendedBy,
    sharedCareerGoals: profile.sharedCareerGoals,
    networkingState: networkingState
      ? mobileNetworkingStateSchema.parse(networkingState)
      : undefined,
  });
}
