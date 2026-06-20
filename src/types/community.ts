export interface CommunityLaunchpadMetrics {
  publicProfileCount: number;
  weeklyActiveCommunityUsers: number;
  publicProfileThreshold: number;
  weeklyActiveThreshold: number;
}

export type CommunityTelemetryEvent = "profile_completion_started";

export interface CommunityLaunchpadTask {
  id: "add_photo" | "add_headline" | "pick_interests" | "set_profile_public";
  title: string;
  description: string;
  completed: boolean;
  weight: number;
  ctaLabel: string;
  ctaHref: string;
  telemetryEvent: CommunityTelemetryEvent;
}

export interface CommunityLaunchpadProgress {
  completionPercent: number;
  completedWeight: number;
  totalWeight: number;
  tasks: CommunityLaunchpadTask[];
}

export interface CommunityLaunchpadMember {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  headline: string | null;
  followerCount: number;
  followingCount: number;
}

export interface CommunityLaunchpadCircle {
  id: string;
  slug: string;
  name: string;
  description: string;
  href: string;
  isJoined: boolean;
  memberCount: number;
  icon?: string;
}

export interface CommunityLaunchpadPrompt {
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
}

export interface CommunityLaunchpadEvent {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  location: string | null;
  href: string;
}

export interface CommunityLaunchpadResource {
  id: string;
  title: string;
  description: string;
  href: string;
}

export interface CommunityLaunchpadData {
  showLaunchpad: boolean;
  metrics: CommunityLaunchpadMetrics;
  progress: CommunityLaunchpadProgress;
  featuredMembers: CommunityLaunchpadMember[];
  circles: CommunityLaunchpadCircle[];
  weeklyPrompt: CommunityLaunchpadPrompt;
  upcomingEvent: CommunityLaunchpadEvent | null;
  starterResources: CommunityLaunchpadResource[];
  inviteTarget: number;
}

// ── Community Hub (redesigned page) ──────────────────────────────

export type CommunityPostType =
  | 'update'
  | 'question'
  | 'intro'
  | 'showcase'
  | 'event_note'
  | 'announcement';

export interface CommunityEmbeddedEvent {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  location?: string | null;
  startTime: string;
  endTime?: string | null;
  imageUrl?: string | null;
  organizerLogoUrl?: string | null;
  organizerName?: string | null;
  tags?: string[];
  timeLabel?: string | null;
  formatLabel?: string | null;
  priceLabel?: string | null;
}

export interface CommunityFeedPost {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  author: { id: string; fullName: string | null; avatarUrl: string | null };
  circle: { slug: string; name: string };
  commentCount: number;
  isTrending: boolean;
  recentComments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; fullName: string | null; avatarUrl: string | null };
  }>;
  score?: number;
  userVote?: -1 | 0 | 1;
  postType?: CommunityPostType;
  eventId?: string | null;
  event?: CommunityEmbeddedEvent | null;
  mentions?: Array<{
    userId: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  }>;
  media?: Array<{
    id?: string;
    path: string;
    url: string;
    width: number;
    height: number;
    position: number;
  }>;
  linkPreviews?: Array<{
    id?: string;
    url: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    siteName: string | null;
  }>;
}

export interface CommunityUpcomingEvent {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  location: string | null;
  format: string | null;
}

export interface CommunityFeedPageData {
  feed: CommunityFeedPost[];
  circles: CommunityLaunchpadCircle[];
  upcomingEvents: CommunityUpcomingEvent[];
}

export interface MobileCommunityCirclePreview {
  id: string;
  slug: string;
  name: string;
  description: string;
  isJoined: boolean;
  memberCount: number;
}

// ── Community Networking Hub ───────────────────────────────────

export interface CommunityNetworkingSummary {
  trackedUpcomingCount: number;
  visibleOpportunityCount: number;
  followUpCount: number;
  attendanceVisibilityEnabled: boolean;
}

export interface CommunityNetworkingAmbientActivity {
  publicTrackersToday: number;
  newPublicProfilesThisWeek: number;
  roomsWithFreshTrackingCount: number;
}

export interface NetworkingSharedEvent {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  location: string | null;
  format: string | null;
  viewerContext?: "attending" | "saved";
}

export interface NetworkingAttendeePreview {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
}

export interface NetworkingSpeakerPreview {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
}

export interface NetworkingSpeakerMatch {
  speaker: NetworkingSpeakerPreview;
  event: NetworkingSharedEvent;
  matchReason: string;
  isPastEvent: true;
}

export interface NetworkingOpportunityEvent {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  imageUrl?: string | null;
  organizerLogoUrl?: string | null;
  location: string | null;
  format: string | null;
  viewerContext: "attending" | "saved";
  contextLabel?: string;
  recentTrackerCount?: number;
  totalAttendeeCount: number;
  visibleAttendeeCount: number;
  networkAttendingCount: number;
  relationshipAttendeeCount: number;
  attendeePreview: NetworkingAttendeePreview[];
  speakers?: NetworkingSpeakerPreview[];
}

export interface NetworkingPersonCard {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
  company?: string | null;
  bio?: string | null;
  location: string | null;
  currentRole: string | null;
  industry: string | null;
  companySize: string | null;
  mutualConnectionsCount: number;
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
  sharedUpcomingEventCount: number;
  soonestSharedEventStartTime: string | null;
  sharedEvents: NetworkingSharedEvent[];
}

export interface NetworkingFollowUpCard {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
  company?: string | null;
  bio?: string | null;
  location: string | null;
  currentRole: string | null;
  industry: string | null;
  companySize: string | null;
  mutualConnectionsCount: number;
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
  sharedPastEventCount: number;
  mostRecentSharedEventStartTime: string | null;
  sharedEvents: NetworkingSharedEvent[];
}

export interface NetworkingStarterProfile {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
  location: string | null;
  currentRole: string | null;
  industry: string | null;
  followerCount: number;
  followingCount: number;
}

export interface CommunityNetworkingHomeData {
  summary: CommunityNetworkingSummary;
  priorityEvents: NetworkingOpportunityEvent[];
  meetPeople: NetworkingPersonCard[];
  followUps: NetworkingFollowUpCard[];
  speakerMatches?: NetworkingSpeakerMatch[];
  starterProfiles?: NetworkingStarterProfile[];
  publicProfileCount?: number;
  ambientActivity?: CommunityNetworkingAmbientActivity;
}
