export interface CommunityLaunchpadMetrics {
  publicProfileCount: number;
  weeklyActiveCommunityUsers: number;
  publicProfileThreshold: number;
  weeklyActiveThreshold: number;
}

export type CommunityTelemetryEvent = 'profile_completion_started';

export interface CommunityLaunchpadTask {
  id: 'add_photo' | 'add_headline' | 'pick_interests' | 'set_profile_public';
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

export interface CommunityFeedPost {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; fullName: string | null; avatarUrl: string | null };
  circle: { slug: string; name: string };
  commentCount: number;
  isTrending: boolean;
}

export interface CommunityUpcomingEvent {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  location: string | null;
  format: string | null;
}

export interface CommunityHubData {
  feed: CommunityFeedPost[];
  circles: CommunityLaunchpadCircle[];
  progress: CommunityLaunchpadProgress;
  upcomingEvents: CommunityUpcomingEvent[];
  suggestedMembers: CommunityLaunchpadMember[];
}

export type CommunityTab = 'directory' | 'feed' | 'circles';
