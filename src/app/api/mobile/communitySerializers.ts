import {
  mobileCommunityCirclePageSchema,
  mobileCommunityNetworkingHomeSchema,
  mobileCommunityPostPageSchema,
  type MobileCommunityAuthor,
  type MobileCommunityCirclePage,
  type MobileCommunityComment,
  type MobileCommunityCurrentUser,
  type MobileCommunityNetworkingHome,
  type MobileCommunityMember,
  type MobileCommunityPost,
  type MobileCommunityPostPage,
  mobilePublicProfileSchema,
  type MobilePublicProfile,
} from "@kurecal/domain";
import type {
  CircleDiscussionPageData,
  CirclePostPageData,
} from "@/services/circleDiscussionService";
import type { PublicProfileResult } from "@/services/publicProfileService";
import type {
  CommunityNetworkingHomeData,
  NetworkingFollowUpCard,
  NetworkingOpportunityEvent,
  NetworkingPersonCard,
  NetworkingSharedEvent,
} from "@/types/community";
import type {
  CircleDiscussionAuthor,
  CircleDiscussionComment,
  CircleDiscussionPost,
} from "@/types/circleDiscussions";
import type { FollowStatus } from "@/services/followService";

function toMobileCommunityAuthor(
  author: CircleDiscussionAuthor,
): MobileCommunityAuthor {
  return {
    id: author.id,
    fullName: author.full_name,
    avatarUrl: author.avatar_url,
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

function toMobileCommunityComment(
  comment: CircleDiscussionComment,
): MobileCommunityComment {
  return {
    id: comment.id,
    parentId: comment.parent_id,
    content: comment.content,
    createdAt: comment.created_at,
    author: toMobileCommunityAuthor(comment.author),
    isRemoved: comment.isRemoved,
    score: comment.score ?? null,
    userVote: normalizeVoteValue(comment.userVote),
    replies: (comment.replies ?? []).map(toMobileCommunityComment),
  };
}

function toMobileCommunityPost(
  post: CircleDiscussionPost,
): MobileCommunityPost {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.created_at,
    author: toMobileCommunityAuthor(post.author),
    comments: (post.comments ?? []).map(toMobileCommunityComment),
    isRemoved: post.isRemoved,
    score: post.score ?? null,
    userVote: normalizeVoteValue(post.userVote),
  };
}

function toMobileCommunityCurrentUser(
  user: CircleDiscussionPageData["currentUserProfile"],
): MobileCommunityCurrentUser | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}

function toMobileCommunityMembers(
  members: CircleDiscussionPageData["members"],
): MobileCommunityMember[] {
  return members.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    username: member.username,
    avatarUrl: member.avatarUrl,
    headline: member.headline,
  }));
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

export function toMobileCommunityHome(
  data: CommunityNetworkingHomeData,
): MobileCommunityNetworkingHome {
  return mobileCommunityNetworkingHomeSchema.parse({
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
  });
}

export function toMobileCommunityCirclePage(
  data: CircleDiscussionPageData,
): MobileCommunityCirclePage {
  return mobileCommunityCirclePageSchema.parse({
    circle: {
      id: data.circle.id,
      slug: data.circle.slug,
      name: data.circle.name,
      description: data.circle.description,
      memberCount: data.circle.memberCount,
    },
    isJoined: data.isJoined,
    currentUser: toMobileCommunityCurrentUser(data.currentUserProfile),
    members: toMobileCommunityMembers(data.members),
    upcomingEvents: data.upcomingEvents.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      startTime: event.startTime,
      organizerName: event.organizerName,
      organizerLogoUrl: event.organizerLogoUrl,
    })),
    posts: data.posts.map(toMobileCommunityPost),
  });
}

export function toMobileCommunityPostPage(
  data: CirclePostPageData,
): MobileCommunityPostPage {
  return mobileCommunityPostPageSchema.parse({
    circle: {
      id: data.circle.id,
      slug: data.circle.slug,
      name: data.circle.name,
      description: data.circle.description,
      memberCount: data.circle.memberCount,
    },
    isJoined: data.isJoined,
    currentUser: toMobileCommunityCurrentUser(data.currentUserProfile),
    members: toMobileCommunityMembers(data.members),
    upcomingEvents: data.upcomingEvents.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      startTime: event.startTime,
      organizerName: event.organizerName,
      organizerLogoUrl: event.organizerLogoUrl,
    })),
    post: toMobileCommunityPost(data.post),
  });
}

export function toMobilePublicProfile(
  profile: PublicProfileResult,
  relationship: FollowStatus | null,
): MobilePublicProfile {
  return mobilePublicProfileSchema.parse({
    id: profile.id,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    username: profile.username,
    headline: profile.headline,
    isViewerOwner: profile.isViewerOwner,
    followerCount: profile.followerCount,
    followingCount: profile.followingCount,
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
      location: event.location,
    })),
    careerProfile: profile.careerProfile
      ? {
          currentRole: profile.careerProfile.currentRole,
          seniority: profile.careerProfile.seniority,
          industry: profile.careerProfile.industry,
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
  });
}
