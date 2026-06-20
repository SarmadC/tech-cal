import type {
  CommunityNetworkingAmbientActivity,
  CommunityNetworkingHomeData,
  NetworkingAttendeePreview,
  NetworkingFollowUpCard,
  NetworkingOpportunityEvent,
  NetworkingPersonCard,
  NetworkingSpeakerMatch,
  NetworkingSharedEvent,
  NetworkingSpeakerPreview,
  NetworkingStarterProfile,
} from '@/types/community';
import type { SupabaseClientType } from '@/types';
import { BlockService } from '@/services/blockService';
import { CommunityDirectoryService } from '@/services/communityDirectoryService';

interface ViewerEventRow {
  event_id: string;
  status: 'attending' | 'attended' | 'cancelled' | null;
  is_bookmarked: boolean | null;
}

interface EventRow {
  id: string;
  slug: string;
  title: string | null;
  start_time: string;
  event_image_url: string | null;
  source_url: string | null;
  source_domain: string | null;
  organizer?: { logo_url: string | null } | Array<{ logo_url: string | null }> | null;
  location: string | null;
  attendee_count: number | null;
  event_format: string | null;
  event_type_id: string | null;
  status: string | null;
}

interface AttendanceRow {
  event_id: string;
  user_id: string;
  status: 'attending' | 'attended' | 'cancelled' | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  headline: string | null;
  location: string | null;
  profile_visibility: string | null;
  show_attendance: boolean | null;
}

interface CareerProfileRow {
  user_id: string;
  current_role: string | null;
  industry: string | null;
  company_size: string | null;
}

interface ViewerCareerProfileRow {
  current_role: string | null;
  industry: string | null;
  interests: string[] | null;
}

interface FollowingRow {
  following_id: string;
}

interface FollowedByRow {
  follower_id: string;
}

interface CandidateFollowingRow {
  follower_id: string;
  following_id: string;
}

interface ViewerProfileRow {
  show_attendance: boolean | null;
}

interface ActivityProfileRow {
  id: string;
}

interface RecentTrackingRow {
  event_id: string;
  user_id: string;
}

export interface CommunityNetworkingEventInput {
  id: string;
  slug: string;
  title: string;
  startTime: string;
  imageUrl?: string | null;
  organizerLogoUrl?: string | null;
  attendeeCount?: number | null;
  location: string | null;
  format: string | null;
  viewerContext: 'attending' | 'saved';
}

export interface CommunityNetworkingAttendeeInput {
  eventId: string;
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  headline: string | null;
  location: string | null;
  currentRole: string | null;
  industry: string | null;
  companySize: string | null;
  mutualConnectionsCount: number;
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
  isVisibleToViewer: boolean;
}

export interface BuildCommunityNetworkingHomeDataOptions {
  attendanceVisibilityEnabled: boolean;
  priorityEventInputs: CommunityNetworkingEventInput[];
  recentEventInputs: CommunityNetworkingEventInput[];
  attendeeInputs: CommunityNetworkingAttendeeInput[];
  totalAttendeeCountByEventId?: Record<string, number>;
  includeEmptyPriorityEvents?: boolean;
  priorityEventLimit?: number;
}

interface PersonAggregate {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
  location: string | null;
  currentRole: string | null;
  industry: string | null;
  companySize: string | null;
  mutualConnectionsCount: number;
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
  sharedEvents: NetworkingSharedEvent[];
}

const PRIORITY_EVENT_LIMIT = 6;
const MEET_PEOPLE_LIMIT = 8;
const FOLLOW_UP_LIMIT = 6;
const ATTENDEE_PREVIEW_LIMIT = 3;
const SHARED_EVENT_PREVIEW_LIMIT = 3;
const FOLLOW_UP_WINDOW_DAYS = 14;
const AMBIENT_ACTIVITY_WINDOW_DAYS = 7;
const STARTER_EVENT_CANDIDATE_LIMIT = 24;
const SHOWCASE_SOURCE_DOMAIN = 'showcase.kurecal.local';
const PAST_SPEAKER_WINDOW_DAYS = 365;
const PAST_SPEAKER_CANDIDATE_EVENT_TARGET = 64;
const PAST_SPEAKER_FETCH_BATCH_SIZE = 64;
const PAST_SPEAKER_FETCH_SCAN_LIMIT = 320;
const SPEAKER_DETAIL_BATCH_SIZE = 250;
const SPEAKER_MATCH_LIMIT = 6;
const SHORT_KEYWORD_ALLOWLIST = new Set(['ai', 'ml', 'ux', 'ui', 'vr', 'ar']);
const GENERIC_SPEAKER_KEYWORDS = new Set([
  'conference',
  'event',
  'expo',
  'forum',
  'inc',
  'labs',
  'meetup',
  'summit',
]);

function dedupeEvents(
  events: CommunityNetworkingEventInput[]
): CommunityNetworkingEventInput[] {
  const deduped = new Map<string, CommunityNetworkingEventInput>();

  for (const event of events) {
    if (!deduped.has(event.id)) {
      deduped.set(event.id, event);
    }
  }

  return Array.from(deduped.values());
}

function getTimeValue(value: string | null | undefined): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function normalizeEventFormat(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'online' || normalized === 'virtual') {
    return 'virtual';
  }

  if (normalized === 'hybrid') {
    return 'hybrid';
  }

  if (normalized === 'in-person' || normalized === 'in person') {
    return 'in-person';
  }

  return normalized;
}

function normalizeKeywordTokens(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/i)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 3 || SHORT_KEYWORD_ALLOWLIST.has(token)
        )
    )
  );
}

function addKeywords(target: Set<string>, value: string | null | undefined) {
  for (const token of normalizeKeywordTokens(value)) {
    target.add(token);
  }
}

function getPreferredOverlap(
  source: Iterable<string>,
  candidateKeywords: Set<string>
): string | null {
  let fallback: string | null = null;

  for (const token of source) {
    if (!candidateKeywords.has(token)) {
      continue;
    }

    if (!GENERIC_SPEAKER_KEYWORDS.has(token)) {
      return token;
    }

    if (!fallback) {
      fallback = token;
    }
  }

  return fallback;
}

function formatKeywordLabel(value: string): string {
  if (SHORT_KEYWORD_ALLOWLIST.has(value.toLowerCase())) {
    return value.toUpperCase();
  }

  return value
    .split(/[\s_-]+/)
    .map((segment) =>
      segment.length > 0
        ? `${segment[0]!.toUpperCase()}${segment.slice(1)}`
        : segment
    )
    .join(' ');
}

function formatSpeakerMatchReason(options: {
  audience: string;
  audienceLabel: string;
  matchedToken?: string | null;
  prefix: string;
  speaker: NetworkingSpeakerPreview;
  event: EventRow;
  kind: 'role' | 'industry';
}): string {
  const normalizedAudience = options.audience.trim().toLowerCase();
  const topicLabel = options.matchedToken ? formatKeywordLabel(options.matchedToken) : null;
  const normalizedTopic = topicLabel?.toLowerCase() ?? null;
  const speakerCompany = options.speaker.company?.trim() ?? '';
  const eventTitle = options.event.title?.trim() ?? '';

  if (options.kind === 'role') {
    if (topicLabel && normalizedTopic && !normalizedAudience.includes(normalizedTopic)) {
      return `Strong overlap with ${options.audienceLabel}, especially around ${topicLabel}.`;
    }

    if (speakerCompany) {
      return `${speakerCompany}'s perspective maps well to your ${options.audienceLabel}.`;
    }

    if (eventTitle) {
      return `Best fit for your ${options.audienceLabel} from ${eventTitle}.`;
    }
  }

  if (topicLabel && normalizedTopic && !normalizedAudience.includes(normalizedTopic)) {
    return `Useful for your ${options.audienceLabel}, especially around ${topicLabel}.`;
  }

  if (speakerCompany) {
    return `Relevant to your ${options.audienceLabel} through ${speakerCompany}'s lens.`;
  }

  if (eventTitle) {
    return `Useful context for your ${options.audienceLabel} from ${eventTitle}.`;
  }

  return `${options.prefix} your ${options.audienceLabel}.`;
}

function sortStarterEventRows(left: EventRow, right: EventRow): number {
  const attendeeDiff = (right.attendee_count ?? 0) - (left.attendee_count ?? 0);
  if (attendeeDiff !== 0) {
    return attendeeDiff;
  }

  return getTimeValue(left.start_time) - getTimeValue(right.start_time);
}

function toEventInput(
  event: EventRow,
  viewerContext: 'attending' | 'saved' = 'saved'
): CommunityNetworkingEventInput {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title || 'Untitled event',
    startTime: event.start_time,
    imageUrl: event.event_image_url,
    organizerLogoUrl: getEventOrganizerLogoUrl(event),
    attendeeCount: event.attendee_count,
    location: event.location,
    format: normalizeEventFormat(event.event_format),
    viewerContext,
  };
}

function getEventOrganizerLogoUrl(event: EventRow): string | null {
  const organizer = Array.isArray(event.organizer)
    ? event.organizer[0]
    : event.organizer;

  return organizer?.logo_url ?? null;
}

function isShowcaseEventSource(value: {
  source_domain?: string | null;
  source_url?: string | null;
}): boolean {
  if (value.source_domain === SHOWCASE_SOURCE_DOMAIN) {
    return true;
  }

  return Boolean(value.source_url?.includes(SHOWCASE_SOURCE_DOMAIN));
}

function toPastSpeakerEventContext(event: EventRow): NetworkingSharedEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title || 'Untitled event',
    startTime: event.start_time,
    location: event.location,
    format: normalizeEventFormat(event.event_format),
  };
}

function buildSpeakerCandidateKeywordSet(input: {
  speaker: NetworkingSpeakerPreview;
  event: EventRow;
}): Set<string> {
  const keywords = new Set<string>();
  addKeywords(keywords, input.speaker.title);
  addKeywords(keywords, input.speaker.company);
  addKeywords(keywords, input.event.title);
  addKeywords(keywords, input.event.slug);
  return keywords;
}

function rankStarterFallbackEvents(
  left: NetworkingOpportunityEvent,
  right: NetworkingOpportunityEvent
): number {
  if (right.visibleAttendeeCount !== left.visibleAttendeeCount) {
    return right.visibleAttendeeCount - left.visibleAttendeeCount;
  }

  if (right.relationshipAttendeeCount !== left.relationshipAttendeeCount) {
    return right.relationshipAttendeeCount - left.relationshipAttendeeCount;
  }

  if (right.networkAttendingCount !== left.networkAttendingCount) {
    return right.networkAttendingCount - left.networkAttendingCount;
  }

  if ((right.recentTrackerCount ?? 0) !== (left.recentTrackerCount ?? 0)) {
    return (right.recentTrackerCount ?? 0) - (left.recentTrackerCount ?? 0);
  }

  if (right.totalAttendeeCount !== left.totalAttendeeCount) {
    return right.totalAttendeeCount - left.totalAttendeeCount;
  }

  return getTimeValue(left.startTime) - getTimeValue(right.startTime);
}

function relationshipStrength(person: {
  isMutualFollow: boolean;
  followsViewer: boolean;
  isInNetwork: boolean;
}): number {
  if (person.isMutualFollow) {
    return 3;
  }

  if (person.followsViewer) {
    return 2;
  }

  if (person.isInNetwork) {
    return 1;
  }

  return 0;
}

function sortAttendeePreview(
  left: CommunityNetworkingAttendeeInput,
  right: CommunityNetworkingAttendeeInput
): number {
  const relationshipDiff = relationshipStrength(right) - relationshipStrength(left);
  if (relationshipDiff !== 0) {
    return relationshipDiff;
  }

  return (left.fullName || left.username || '').localeCompare(
    right.fullName || right.username || ''
  );
}

function toSharedEvent(
  event: CommunityNetworkingEventInput,
  includeViewerContext: boolean
): NetworkingSharedEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    startTime: event.startTime,
    location: event.location,
    format: event.format,
    ...(includeViewerContext ? { viewerContext: event.viewerContext } : {}),
  };
}

export function rankPriorityEvents(
  left: NetworkingOpportunityEvent,
  right: NetworkingOpportunityEvent
): number {
  const dateDiff = getTimeValue(left.startTime) - getTimeValue(right.startTime);
  if (dateDiff !== 0) {
    return dateDiff;
  }

  if (right.visibleAttendeeCount !== left.visibleAttendeeCount) {
    return right.visibleAttendeeCount - left.visibleAttendeeCount;
  }

  if (right.networkAttendingCount !== left.networkAttendingCount) {
    return right.networkAttendingCount - left.networkAttendingCount;
  }

  const relationshipPresenceDiff =
    Number(right.relationshipAttendeeCount > 0) -
    Number(left.relationshipAttendeeCount > 0);
  if (relationshipPresenceDiff !== 0) {
    return relationshipPresenceDiff;
  }

  if (right.totalAttendeeCount !== left.totalAttendeeCount) {
    return right.totalAttendeeCount - left.totalAttendeeCount;
  }

  return left.title.localeCompare(right.title);
}

export function rankMeetPeople(
  left: NetworkingPersonCard,
  right: NetworkingPersonCard
): number {
  const mutualDiff = Number(right.isMutualFollow) - Number(left.isMutualFollow);
  if (mutualDiff !== 0) {
    return mutualDiff;
  }

  const followsDiff = Number(right.followsViewer) - Number(left.followsViewer);
  if (followsDiff !== 0) {
    return followsDiff;
  }

  const networkDiff = Number(right.isInNetwork) - Number(left.isInNetwork);
  if (networkDiff !== 0) {
    return networkDiff;
  }

  if (right.mutualConnectionsCount !== left.mutualConnectionsCount) {
    return right.mutualConnectionsCount - left.mutualConnectionsCount;
  }

  if (right.sharedUpcomingEventCount !== left.sharedUpcomingEventCount) {
    return right.sharedUpcomingEventCount - left.sharedUpcomingEventCount;
  }

  const soonestDiff =
    getTimeValue(left.soonestSharedEventStartTime) -
    getTimeValue(right.soonestSharedEventStartTime);
  if (soonestDiff !== 0) {
    return soonestDiff;
  }

  return (left.fullName || left.username).localeCompare(
    right.fullName || right.username
  );
}

export function rankFollowUps(
  left: NetworkingFollowUpCard,
  right: NetworkingFollowUpCard
): number {
  if (right.sharedPastEventCount !== left.sharedPastEventCount) {
    return right.sharedPastEventCount - left.sharedPastEventCount;
  }

  const recencyDiff =
    getTimeValue(right.mostRecentSharedEventStartTime) -
    getTimeValue(left.mostRecentSharedEventStartTime);
  if (recencyDiff !== 0) {
    return recencyDiff;
  }

  const relationshipDiff = relationshipStrength(right) - relationshipStrength(left);
  if (relationshipDiff !== 0) {
    return relationshipDiff;
  }

  if (right.mutualConnectionsCount !== left.mutualConnectionsCount) {
    return right.mutualConnectionsCount - left.mutualConnectionsCount;
  }

  return (left.fullName || left.username).localeCompare(
    right.fullName || right.username
  );
}

export function buildCommunityNetworkingHomeData({
  attendanceVisibilityEnabled,
  priorityEventInputs,
  recentEventInputs,
  attendeeInputs,
  totalAttendeeCountByEventId = {},
  includeEmptyPriorityEvents = false,
  priorityEventLimit = PRIORITY_EVENT_LIMIT,
}: BuildCommunityNetworkingHomeDataOptions): CommunityNetworkingHomeData {
  const visibleAttendees = attendeeInputs.filter(
    (attendee) => attendee.isVisibleToViewer && attendee.username
  );
  const visibleAttendeesByEventId = new Map<
    string,
    CommunityNetworkingAttendeeInput[]
  >();

  for (const attendee of visibleAttendees) {
    const eventAttendees = visibleAttendeesByEventId.get(attendee.eventId) ?? [];
    eventAttendees.push(attendee);
    visibleAttendeesByEventId.set(attendee.eventId, eventAttendees);
  }

  const priorityEvents = priorityEventInputs
    .map<NetworkingOpportunityEvent | null>((event) => {
      const attendees = visibleAttendeesByEventId.get(event.id) ?? [];

      if (attendees.length === 0 && !includeEmptyPriorityEvents) {
        return null;
      }

      const sortedAttendees = [...attendees].sort(sortAttendeePreview);
      const attendeePreview: NetworkingAttendeePreview[] = sortedAttendees
        .slice(0, ATTENDEE_PREVIEW_LIMIT)
        .map((attendee) => ({
          id: attendee.id,
          fullName: attendee.fullName,
          username: attendee.username || '',
          avatarUrl: attendee.avatarUrl,
          isInNetwork: attendee.isInNetwork,
          followsViewer: attendee.followsViewer,
          isMutualFollow: attendee.isMutualFollow,
        }));

      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        startTime: event.startTime,
        imageUrl: event.imageUrl ?? null,
        organizerLogoUrl: event.organizerLogoUrl ?? null,
        location: event.location,
        format: event.format,
        viewerContext: event.viewerContext,
        totalAttendeeCount:
          totalAttendeeCountByEventId[event.id] ??
          event.attendeeCount ??
          attendees.length,
        visibleAttendeeCount: attendees.length,
        networkAttendingCount: attendees.filter((attendee) => attendee.isInNetwork)
          .length,
        relationshipAttendeeCount: attendees.filter(
          (attendee) => attendee.isMutualFollow || attendee.followsViewer
        ).length,
        attendeePreview,
      };
    })
    .filter((event): event is NetworkingOpportunityEvent => event !== null)
    .sort(rankPriorityEvents)
    .slice(0, priorityEventLimit);

  const priorityEventsById = new Map(priorityEvents.map((event) => [event.id, event]));
  const priorityEventInputsById = new Map(
    priorityEventInputs.map((event) => [event.id, event])
  );
  const meetPeopleMap = new Map<string, PersonAggregate>();

  for (const attendee of visibleAttendees) {
    if (!priorityEventsById.has(attendee.eventId) || !attendee.username) {
      continue;
    }

    const event = priorityEventInputsById.get(attendee.eventId);
    if (!event) {
      continue;
    }

    const existing = meetPeopleMap.get(attendee.id) ?? {
      id: attendee.id,
      fullName: attendee.fullName,
      username: attendee.username,
      avatarUrl: attendee.avatarUrl,
      headline: attendee.headline,
      location: attendee.location,
      currentRole: attendee.currentRole,
      industry: attendee.industry,
      companySize: attendee.companySize,
      mutualConnectionsCount: attendee.mutualConnectionsCount,
      isInNetwork: attendee.isInNetwork,
      followsViewer: attendee.followsViewer,
      isMutualFollow: attendee.isMutualFollow,
      sharedEvents: [],
    };

    existing.isInNetwork = existing.isInNetwork || attendee.isInNetwork;
    existing.followsViewer = existing.followsViewer || attendee.followsViewer;
    existing.isMutualFollow = existing.isMutualFollow || attendee.isMutualFollow;
    existing.location = existing.location || attendee.location;
    existing.currentRole = existing.currentRole || attendee.currentRole;
    existing.industry = existing.industry || attendee.industry;
    existing.companySize = existing.companySize || attendee.companySize;
    existing.mutualConnectionsCount = Math.max(
      existing.mutualConnectionsCount,
      attendee.mutualConnectionsCount
    );

    if (!existing.sharedEvents.some((sharedEvent) => sharedEvent.id === event.id)) {
      existing.sharedEvents.push(toSharedEvent(event, true));
    }

    meetPeopleMap.set(attendee.id, existing);
  }

  const meetPeople = Array.from(meetPeopleMap.values())
    .map<NetworkingPersonCard>((person) => {
      const sortedSharedEvents = [...person.sharedEvents].sort(
        (left, right) => getTimeValue(left.startTime) - getTimeValue(right.startTime)
      );

      return {
        id: person.id,
        fullName: person.fullName,
        username: person.username,
        avatarUrl: person.avatarUrl,
        headline: person.headline,
        location: person.location,
        currentRole: person.currentRole,
        industry: person.industry,
        companySize: person.companySize,
        mutualConnectionsCount: person.mutualConnectionsCount,
        isInNetwork: person.isInNetwork,
        followsViewer: person.followsViewer,
        isMutualFollow: person.isMutualFollow,
        sharedUpcomingEventCount: sortedSharedEvents.length,
        soonestSharedEventStartTime: sortedSharedEvents[0]?.startTime ?? null,
        sharedEvents: sortedSharedEvents.slice(0, SHARED_EVENT_PREVIEW_LIMIT),
      };
    })
    .sort(rankMeetPeople)
    .slice(0, MEET_PEOPLE_LIMIT);

  const recentEventInputsById = new Map(recentEventInputs.map((event) => [event.id, event]));
  const followUpsMap = new Map<string, PersonAggregate>();

  for (const attendee of visibleAttendees) {
    const event = recentEventInputsById.get(attendee.eventId);
    if (!event || !attendee.username) {
      continue;
    }

    const existing = followUpsMap.get(attendee.id) ?? {
      id: attendee.id,
      fullName: attendee.fullName,
      username: attendee.username,
      avatarUrl: attendee.avatarUrl,
      headline: attendee.headline,
      location: attendee.location,
      currentRole: attendee.currentRole,
      industry: attendee.industry,
      companySize: attendee.companySize,
      mutualConnectionsCount: attendee.mutualConnectionsCount,
      isInNetwork: attendee.isInNetwork,
      followsViewer: attendee.followsViewer,
      isMutualFollow: attendee.isMutualFollow,
      sharedEvents: [],
    };

    existing.isInNetwork = existing.isInNetwork || attendee.isInNetwork;
    existing.followsViewer = existing.followsViewer || attendee.followsViewer;
    existing.isMutualFollow = existing.isMutualFollow || attendee.isMutualFollow;
    existing.location = existing.location || attendee.location;
    existing.currentRole = existing.currentRole || attendee.currentRole;
    existing.industry = existing.industry || attendee.industry;
    existing.companySize = existing.companySize || attendee.companySize;
    existing.mutualConnectionsCount = Math.max(
      existing.mutualConnectionsCount,
      attendee.mutualConnectionsCount
    );

    if (!existing.sharedEvents.some((sharedEvent) => sharedEvent.id === event.id)) {
      existing.sharedEvents.push(toSharedEvent(event, false));
    }

    followUpsMap.set(attendee.id, existing);
  }

  const followUps = Array.from(followUpsMap.values())
    .map<NetworkingFollowUpCard>((person) => {
      const sortedSharedEvents = [...person.sharedEvents].sort(
        (left, right) => getTimeValue(right.startTime) - getTimeValue(left.startTime)
      );

      return {
        id: person.id,
        fullName: person.fullName,
        username: person.username,
        avatarUrl: person.avatarUrl,
        headline: person.headline,
        location: person.location,
        currentRole: person.currentRole,
        industry: person.industry,
        companySize: person.companySize,
        mutualConnectionsCount: person.mutualConnectionsCount,
        isInNetwork: person.isInNetwork,
        followsViewer: person.followsViewer,
        isMutualFollow: person.isMutualFollow,
        sharedPastEventCount: sortedSharedEvents.length,
        mostRecentSharedEventStartTime: sortedSharedEvents[0]?.startTime ?? null,
        sharedEvents: sortedSharedEvents.slice(0, SHARED_EVENT_PREVIEW_LIMIT),
      };
    })
    .sort(rankFollowUps)
    .slice(0, FOLLOW_UP_LIMIT);

  return {
    summary: {
      trackedUpcomingCount: priorityEventInputs.length,
      visibleOpportunityCount: meetPeople.length,
      followUpCount: followUps.length,
      attendanceVisibilityEnabled,
    },
    priorityEvents,
    meetPeople,
    followUps,
  };
}

export class CommunityNetworkingHomeService {
  private static createEmptyAmbientActivity(): CommunityNetworkingAmbientActivity {
    return {
      publicTrackersToday: 0,
      newPublicProfilesThisWeek: 0,
      roomsWithFreshTrackingCount: 0,
    };
  }

  static createEmptyData(
    attendanceVisibilityEnabled: boolean = false
  ): CommunityNetworkingHomeData {
    return {
      summary: {
        trackedUpcomingCount: 0,
        visibleOpportunityCount: 0,
        followUpCount: 0,
        attendanceVisibilityEnabled,
      },
      priorityEvents: [],
      meetPeople: [],
      followUps: [],
      speakerMatches: [],
      starterProfiles: [],
      publicProfileCount: 0,
      ambientActivity: this.createEmptyAmbientActivity(),
    };
  }

  private static scorePastSpeakerMatch({
    viewerCareerProfile,
    speaker,
    event,
    now,
  }: {
    viewerCareerProfile: ViewerCareerProfileRow;
    speaker: NetworkingSpeakerPreview;
    event: EventRow;
    now: Date;
  }): { score: number; matchReason: string } | null {
    const candidateText = [
      speaker.name,
      speaker.title,
      speaker.company,
      event.title,
      event.slug,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const candidateKeywords = buildSpeakerCandidateKeywordSet({ speaker, event });

    const reasons: Array<{ weight: number; text: string }> = [];
    let baseScore = 0;

    const currentRole = viewerCareerProfile.current_role?.trim() ?? '';
    const industry = viewerCareerProfile.industry?.trim() ?? '';
    const interests = (viewerCareerProfile.interests ?? [])
      .map((value) => value.trim())
      .filter(Boolean);

    if (currentRole) {
      const rolePhrase = currentRole.toLowerCase();
      const roleTokens = normalizeKeywordTokens(currentRole);
      const roleOverlap = roleTokens.filter((token) => candidateKeywords.has(token));
      const matchedRoleToken =
        getPreferredOverlap(roleTokens, candidateKeywords) ?? roleTokens[0] ?? null;

      if (candidateText.includes(rolePhrase)) {
        baseScore += 12;
        reasons.push({
          weight: 12,
          text: formatSpeakerMatchReason({
            audience: currentRole,
            audienceLabel: currentRole,
            matchedToken: matchedRoleToken,
            prefix: 'Strong fit for',
            speaker,
            event,
            kind: 'role',
          }),
        });
      } else if (roleOverlap.length > 0) {
        const roleScore = 6 + roleOverlap.length * 2;
        baseScore += roleScore;
        reasons.push({
          weight: roleScore,
          text: formatSpeakerMatchReason({
            audience: currentRole,
            audienceLabel: currentRole,
            matchedToken: matchedRoleToken,
            prefix: 'Strong fit for',
            speaker,
            event,
            kind: 'role',
          }),
        });
      }
    }

    if (industry) {
      const industryPhrase = industry.toLowerCase();
      const industryTokens = normalizeKeywordTokens(industry);
      const industryOverlap = industryTokens.filter((token) =>
        candidateKeywords.has(token)
      );
      const matchedIndustryToken =
        getPreferredOverlap(industryTokens, candidateKeywords) ??
        industryTokens[0] ??
        null;

      if (candidateText.includes(industryPhrase)) {
        baseScore += 8;
        reasons.push({
          weight: 8,
          text: formatSpeakerMatchReason({
            audience: industry,
            audienceLabel: industry,
            matchedToken: matchedIndustryToken,
            prefix: 'Useful for',
            speaker,
            event,
            kind: 'industry',
          }),
        });
      } else if (industryOverlap.length > 0) {
        const industryScore = 4 + industryOverlap.length * 2;
        baseScore += industryScore;
        reasons.push({
          weight: industryScore,
          text: formatSpeakerMatchReason({
            audience: industry,
            audienceLabel: industry,
            matchedToken: matchedIndustryToken,
            prefix: 'Useful for',
            speaker,
            event,
            kind: 'industry',
          }),
        });
      }
    }

    for (const interest of interests) {
      const interestPhrase = interest.toLowerCase();
      const interestTokens = normalizeKeywordTokens(interest);
      const interestOverlap = interestTokens.filter((token) =>
        candidateKeywords.has(token)
      );

      if (candidateText.includes(interestPhrase)) {
        baseScore += 5;
        reasons.push({
          weight: 5,
          text: speaker.company
            ? `${formatKeywordLabel(interest)} overlap from ${speaker.company}.`
            : `Clear topic overlap in ${formatKeywordLabel(interest)}.`,
        });
        continue;
      }

      if (interestOverlap.length > 0) {
        const matchedToken =
          getPreferredOverlap(interestTokens, candidateKeywords) ?? interest;
        const interestScore = 3 + interestOverlap.length;
        baseScore += interestScore;
        reasons.push({
          weight: interestScore,
          text: speaker.company
            ? `${formatKeywordLabel(matchedToken)} overlap from ${speaker.company}.`
            : `Clear topic overlap in ${formatKeywordLabel(matchedToken)}.`,
        });
      }
    }

    if (baseScore === 0) {
      return null;
    }

    const ageInDays = Math.max(
      0,
      Math.floor((now.getTime() - getTimeValue(event.start_time)) / 86400000)
    );
    const recencyScore =
      ageInDays <= 90 ? 4 : ageInDays <= 180 ? 3 : ageInDays <= 270 ? 2 : 1;
    const strongestReason = [...reasons].sort((left, right) => right.weight - left.weight)[0];

    return {
      score: baseScore + recencyScore,
      matchReason:
        strongestReason?.text ??
        `Past speaker worth knowing from ${event.title || 'a recent event'}.`,
    };
  }

  private static async getPastSpeakerMatches({
    viewerId,
    readClient,
    now,
    excludedSpeakerIds = new Set<string>(),
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
    now: Date;
    excludedSpeakerIds?: Set<string>;
  }): Promise<NetworkingSpeakerMatch[]> {
    const viewerCareerProfileResult = await readClient
      .from('career_profiles')
      .select('current_role, industry, interests')
      .eq('user_id', viewerId)
      .maybeSingle();

    if (viewerCareerProfileResult.error) {
      throw new Error('Failed to load speaker match context.');
    }

    const viewerCareerProfile =
      (viewerCareerProfileResult.data as ViewerCareerProfileRow | null) ?? null;
    const hasCareerContext = Boolean(
      viewerCareerProfile?.current_role ||
        viewerCareerProfile?.industry ||
        (viewerCareerProfile?.interests?.length ?? 0) > 0
    );

    if (!viewerCareerProfile || !hasCareerContext) {
      return [];
    }

    const { pastEvents, speakerRows } = await this.getPastSpeakerCandidateData({
      readClient,
      now,
    });

    if (pastEvents.length === 0 || speakerRows.length === 0) {
      return [];
    }

    const speakerIds = Array.from(
      new Set(
        (speakerRows as Array<{ speaker_id: string | null }>)
          .map((row) => row.speaker_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const speakerDetailsById = new Map<string, NetworkingSpeakerPreview>();
    if (speakerIds.length > 0) {
      for (let index = 0; index < speakerIds.length; index += SPEAKER_DETAIL_BATCH_SIZE) {
        const detailBatch = speakerIds.slice(index, index + SPEAKER_DETAIL_BATCH_SIZE);
        const detailResult = await readClient
          .from('speakers')
          .select(
            'id, name, title, company, photo_url, linkedin_url, twitter_url, website_url'
          )
          .in('id', detailBatch);

        if (detailResult.error) {
          throw new Error('Failed to load speaker details.');
        }

        for (const row of (detailResult.data || []) as Array<{
          id: string;
          name: string;
          title: string | null;
          company: string | null;
          photo_url: string | null;
          linkedin_url: string | null;
          twitter_url: string | null;
          website_url: string | null;
        }>) {
          speakerDetailsById.set(row.id, {
            id: row.id,
            name: row.name,
            title: row.title,
            company: row.company,
            photoUrl: row.photo_url,
            linkedinUrl: row.linkedin_url,
            twitterUrl: row.twitter_url,
            websiteUrl: row.website_url,
          });
        }
      }
    }

    const eventsById = new Map<string, EventRow>(pastEvents.map((event) => [event.id, event]));
    const seenSpeakerKeysByEventId = new Map<string, Set<string>>();
    const bestMatchesBySpeakerId = new Map<
      string,
      {
        speaker: NetworkingSpeakerPreview;
        event: EventRow;
        score: number;
        matchReason: string;
      }
    >();

    for (const row of speakerRows as Array<{
      event_id: string | null;
      speaker_id: string | null;
      speaker_name: string | null;
    }>) {
      if (!row.event_id) {
        continue;
      }

      const event = eventsById.get(row.event_id);
      if (!event || !row.speaker_id) {
        continue;
      }

      const speaker = speakerDetailsById.get(row.speaker_id);
      if (!speaker) {
        continue;
      }

      if (excludedSpeakerIds.has(speaker.id)) {
        continue;
      }

      const seenSpeakerKeys = seenSpeakerKeysByEventId.get(row.event_id) ?? new Set<string>();
      if (seenSpeakerKeys.has(row.speaker_id)) {
        continue;
      }
      seenSpeakerKeys.add(row.speaker_id);
      seenSpeakerKeysByEventId.set(row.event_id, seenSpeakerKeys);

      const scored = this.scorePastSpeakerMatch({
        viewerCareerProfile,
        speaker,
        event,
        now,
      });

      if (!scored) {
        continue;
      }

      const existing = bestMatchesBySpeakerId.get(speaker.id);
      if (
        !existing ||
        scored.score > existing.score ||
        (scored.score === existing.score &&
          getTimeValue(event.start_time) > getTimeValue(existing.event.start_time))
      ) {
        bestMatchesBySpeakerId.set(speaker.id, {
          speaker,
          event,
          score: scored.score,
          matchReason: scored.matchReason,
        });
      }
    }

    return Array.from(bestMatchesBySpeakerId.values())
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        const recencyDiff =
          getTimeValue(right.event.start_time) - getTimeValue(left.event.start_time);
        if (recencyDiff !== 0) {
          return recencyDiff;
        }

        return left.speaker.name.localeCompare(right.speaker.name);
      })
      .slice(0, SPEAKER_MATCH_LIMIT)
      .map((match) => ({
        speaker: match.speaker,
        event: toPastSpeakerEventContext(match.event),
        matchReason: match.matchReason,
        isPastEvent: true,
      }));
  }

  private static async getPastSpeakerCandidateData({
    readClient,
    now,
  }: {
    readClient: SupabaseClientType;
    now: Date;
  }): Promise<{
    pastEvents: EventRow[];
    speakerRows: Array<{
      event_id: string | null;
      speaker_id: string | null;
      speaker_name: string | null;
    }>;
  }> {
    const cutoff = new Date(
      now.getTime() - PAST_SPEAKER_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
    const pastEventsById = new Map<string, EventRow>();
    const speakerRows: Array<{
      event_id: string | null;
      speaker_id: string | null;
      speaker_name: string | null;
    }> = [];
    let offset = 0;

    while (
      pastEventsById.size < PAST_SPEAKER_CANDIDATE_EVENT_TARGET &&
      offset < PAST_SPEAKER_FETCH_SCAN_LIMIT
    ) {
      const batchResult = await readClient
        .from('events')
        .select(
          'id, slug, title, start_time, event_image_url, source_url, source_domain, location, attendee_count, event_format, event_type_id, status, organizer:organizers(logo_url)'
        )
        .eq('status', 'confirmed')
        .lt('start_time', now.toISOString())
        .gte('start_time', cutoff.toISOString())
        .order('start_time', { ascending: false })
        .range(offset, offset + PAST_SPEAKER_FETCH_BATCH_SIZE - 1);

      if (batchResult.error) {
        throw new Error('Failed to load past speaker events.');
      }

      const batchEvents = ((batchResult.data || []) as EventRow[]).filter(
        (event) => Boolean(event.slug && event.title) && !isShowcaseEventSource(event)
      );

      if (batchEvents.length === 0) {
        break;
      }

      const batchEventIds = batchEvents.map((event) => event.id);
      const speakerResult = await readClient
        .from('event_speakers_flat')
        .select('event_id, speaker_id, speaker_name')
        .in('event_id', batchEventIds)
        .not('speaker_id', 'is', null);

      if (speakerResult.error || !speakerResult.data) {
        throw new Error('Failed to load past speaker matches.');
      }

      const eventIdsWithSpeakers = new Set(
        (speakerResult.data as Array<{ event_id: string | null }>)
          .map((row) => row.event_id)
          .filter((eventId): eventId is string => Boolean(eventId))
      );

      for (const row of speakerResult.data as Array<{
        event_id: string | null;
        speaker_id: string | null;
        speaker_name: string | null;
      }>) {
        speakerRows.push(row);
      }

      for (const event of batchEvents) {
        if (!eventIdsWithSpeakers.has(event.id) || pastEventsById.has(event.id)) {
          continue;
        }

        pastEventsById.set(event.id, event);
      }

      if (batchEvents.length < PAST_SPEAKER_FETCH_BATCH_SIZE) {
        break;
      }

      offset += PAST_SPEAKER_FETCH_BATCH_SIZE;
    }

    return {
      pastEvents: Array.from(pastEventsById.values()),
      speakerRows,
    };
  }

  private static async getStarterProfiles({
    viewerId,
    readClient,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
  }): Promise<
    Pick<CommunityNetworkingHomeData, 'starterProfiles' | 'publicProfileCount'>
  > {
    const directory = await CommunityDirectoryService.searchProfiles({
      viewerId,
      viewerScopedClient: readClient,
      readClient,
      options: { limit: 6 },
    });

    const starterProfiles: NetworkingStarterProfile[] = directory.profiles.map(
      (profile) => ({
        id: profile.id,
        fullName: profile.fullName,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        headline: profile.headline,
        location: null,
        currentRole: profile.currentRole,
        industry: profile.industry,
        followerCount: profile.followerCount,
        followingCount: profile.followingCount,
      })
    );

    return {
      starterProfiles,
      publicProfileCount: directory.totalCount,
    };
  }

  private static async getVisibleAttendeeContext({
    viewerId,
    readClient,
    eventRows,
    attendanceRows,
    now,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
    eventRows: EventRow[];
    attendanceRows: AttendanceRow[];
    now: Date;
  }): Promise<{
    attendeeInputs: CommunityNetworkingAttendeeInput[];
    totalAttendeeCountByEventId: Record<string, number>;
  }> {
    const nowTime = now.getTime();
    const eventsById = new Map<string, EventRow>(eventRows.map((event) => [event.id, event]));
    const totalAttendeeCountByEventId: Record<string, number> = {};
    const attendeeIds = new Set<string>();
    const seenAttendanceKeys = new Set<string>();

    for (const row of attendanceRows) {
      if (row.user_id === viewerId) {
        continue;
      }

      const event = eventsById.get(row.event_id);
      if (!event) {
        continue;
      }

      const eventTime = getTimeValue(event.start_time);
      if (eventTime > nowTime && row.status !== 'attending') {
        continue;
      }

      const dedupeKey = `${row.event_id}:${row.user_id}`;
      if (seenAttendanceKeys.has(dedupeKey)) {
        continue;
      }

      seenAttendanceKeys.add(dedupeKey);
      totalAttendeeCountByEventId[row.event_id] =
        (totalAttendeeCountByEventId[row.event_id] ?? 0) + 1;
      attendeeIds.add(row.user_id);
    }

    if (attendeeIds.size === 0) {
      return {
        attendeeInputs: [],
        totalAttendeeCountByEventId,
      };
    }

    const candidateUserIds = Array.from(attendeeIds);
    const blockedIds = await BlockService.getBlockedUserIdsForViewer(
      viewerId,
      candidateUserIds,
      readClient
    );

    const visibleCandidateIds = candidateUserIds.filter((userId) => !blockedIds.has(userId));
    if (visibleCandidateIds.length === 0) {
      return {
        attendeeInputs: [],
        totalAttendeeCountByEventId,
      };
    }

    const [
      profilesResult,
      careerProfilesResult,
      viewerFollowingResult,
      followedByResult,
    ] = await Promise.all([
      readClient
        .from('profiles')
        .select(
          'id, full_name, avatar_url, username, headline, location, profile_visibility, show_attendance'
        )
        .in('id', visibleCandidateIds),
      readClient
        .from('career_profiles')
        .select('user_id, current_role, industry, company_size')
        .in('user_id', visibleCandidateIds),
      readClient.from('follows').select('following_id').eq('follower_id', viewerId),
      readClient
        .from('follows')
        .select('follower_id')
        .eq('following_id', viewerId)
        .in('follower_id', visibleCandidateIds),
    ]);

    if (profilesResult.error) {
      throw new Error('Failed to load attendee profiles.');
    }

    if (careerProfilesResult.error) {
      throw new Error('Failed to load attendee career context.');
    }

    if (viewerFollowingResult.error || followedByResult.error) {
      throw new Error('Failed to load follow graph for networking hub.');
    }

    const profilesById = new Map<string, ProfileRow>(
      ((profilesResult.data || []) as ProfileRow[]).map((profile) => [
        profile.id,
        profile,
      ])
    );
    const careerProfilesById = new Map<string, CareerProfileRow>(
      ((careerProfilesResult.data || []) as CareerProfileRow[]).map((row) => [
        row.user_id,
        row,
      ])
    );
    const followingIds = new Set(
      ((viewerFollowingResult.data || []) as FollowingRow[]).map(
        (row) => row.following_id
      )
    );
    const followedByIds = new Set(
      ((followedByResult.data || []) as FollowedByRow[]).map(
        (row) => row.follower_id
      )
    );
    const mutualConnectionsCountByUserId = new Map<string, number>();

    if (followingIds.size > 0) {
      const candidateFollowingResult = await readClient
        .from('follows')
        .select('follower_id, following_id')
        .in('follower_id', visibleCandidateIds);

      if (candidateFollowingResult.error) {
        throw new Error('Failed to load mutual connection context.');
      }

      const candidateMutualIdsByUserId = new Map<string, Set<string>>();
      const mutualProfileIds = new Set<string>();

      for (const row of (candidateFollowingResult.data || []) as CandidateFollowingRow[]) {
        if (!followingIds.has(row.following_id)) {
          continue;
        }

        const existing =
          candidateMutualIdsByUserId.get(row.follower_id) ?? new Set<string>();
        existing.add(row.following_id);
        candidateMutualIdsByUserId.set(row.follower_id, existing);
        mutualProfileIds.add(row.following_id);
      }

      if (mutualProfileIds.size > 0) {
        const mutualProfilesResult = await readClient
          .from('profiles')
          .select('id, username, profile_visibility')
          .in('id', Array.from(mutualProfileIds));

        if (mutualProfilesResult.error) {
          throw new Error('Failed to validate mutual connection visibility.');
        }

        const visibleMutualIds = new Set(
          (mutualProfilesResult.data || [])
            .filter(
              (profile) =>
                profile.profile_visibility === 'public' && Boolean(profile.username)
            )
            .map((profile) => profile.id)
        );

        for (const [userId, mutualIds] of candidateMutualIdsByUserId.entries()) {
          let count = 0;

          for (const mutualId of mutualIds) {
            if (visibleMutualIds.has(mutualId)) {
              count += 1;
            }
          }

          mutualConnectionsCountByUserId.set(userId, count);
        }
      }
    }

    const attendeeInputs: CommunityNetworkingAttendeeInput[] = [];
    const seenVisibleAttendanceKeys = new Set<string>();

    for (const row of attendanceRows) {
      const event = eventsById.get(row.event_id);
      const profile = profilesById.get(row.user_id);
      const careerProfile = careerProfilesById.get(row.user_id);

      if (!event || !profile || row.user_id === viewerId) {
        continue;
      }

      const eventTime = getTimeValue(event.start_time);
      if (eventTime > nowTime && row.status !== 'attending') {
        continue;
      }

      const dedupeKey = `${row.event_id}:${row.user_id}`;
      if (seenVisibleAttendanceKeys.has(dedupeKey)) {
        continue;
      }

      seenVisibleAttendanceKeys.add(dedupeKey);
      const isVisibleToViewer =
        profile.profile_visibility === 'public' &&
        profile.show_attendance === true &&
        !blockedIds.has(row.user_id) &&
        Boolean(profile.username);

      attendeeInputs.push({
        eventId: row.event_id,
        id: row.user_id,
        fullName: profile.full_name,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        headline: profile.headline,
        location: profile.location,
        currentRole: careerProfile?.current_role ?? null,
        industry: careerProfile?.industry ?? null,
        companySize: careerProfile?.company_size ?? null,
        mutualConnectionsCount: mutualConnectionsCountByUserId.get(row.user_id) ?? 0,
        isInNetwork: followingIds.has(row.user_id),
        followsViewer: followedByIds.has(row.user_id),
        isMutualFollow:
          followingIds.has(row.user_id) && followedByIds.has(row.user_id),
        isVisibleToViewer,
      });
    }

    return {
      attendeeInputs,
      totalAttendeeCountByEventId,
    };
  }

  private static async getStarterEventData({
    viewerId,
    readClient,
    now,
  }: {
    viewerId: string;
    readClient: SupabaseClientType;
    now: Date;
  }): Promise<Pick<CommunityNetworkingHomeData, 'priorityEvents' | 'meetPeople'>> {
    const nowIso = now.toISOString();
    const starterEventsResult = await readClient
      .from('events')
      .select(
        'id, slug, title, start_time, event_image_url, source_url, source_domain, location, attendee_count, event_format, event_type_id, status, organizer:organizers(logo_url)'
      )
      .eq('status', 'confirmed')
      .gte('start_time', nowIso)
      .order('start_time', { ascending: true })
      .limit(STARTER_EVENT_CANDIDATE_LIMIT);

    if (starterEventsResult.error) {
      throw new Error('Failed to load starter community events.');
    }

    const visibleStarterEventRows = ((starterEventsResult.data || []) as EventRow[])
      .filter((event) => Boolean(event.slug && event.title) && !isShowcaseEventSource(event))
      .sort(sortStarterEventRows)
      .slice(0, STARTER_EVENT_CANDIDATE_LIMIT);

    if (visibleStarterEventRows.length === 0) {
      return {
        priorityEvents: [],
        meetPeople: [],
      };
    }

    const starterEventIds = visibleStarterEventRows.map((event) => event.id);
    const attendanceResult = await readClient
      .from('user_events')
      .select('event_id, user_id, status')
      .in('event_id', starterEventIds)
      .in('status', ['attending', 'attended']);

    if (attendanceResult.error) {
      throw new Error('Failed to load starter event attendees.');
    }

    const { attendeeInputs, totalAttendeeCountByEventId } =
      await this.getVisibleAttendeeContext({
        viewerId,
        readClient,
        eventRows: visibleStarterEventRows,
        attendanceRows: (attendanceResult.data || []) as AttendanceRow[],
        now,
      });
    const starterHomeData = buildCommunityNetworkingHomeData({
      attendanceVisibilityEnabled: false,
      priorityEventInputs: visibleStarterEventRows.map((event) => toEventInput(event)),
      recentEventInputs: [],
      attendeeInputs,
      totalAttendeeCountByEventId,
      includeEmptyPriorityEvents: true,
      priorityEventLimit: STARTER_EVENT_CANDIDATE_LIMIT,
    });

    return {
      priorityEvents: starterHomeData.priorityEvents,
      meetPeople: starterHomeData.meetPeople,
    };
  }

  private static async getAmbientActivityCounts({
    readClient,
    now,
  }: {
    readClient: SupabaseClientType;
    now: Date;
  }): Promise<Omit<CommunityNetworkingAmbientActivity, 'roomsWithFreshTrackingCount'>> {
    const weekAgo = new Date(
      now.getTime() - AMBIENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );

    const [todayTrackersResult, newProfilesResult] = await Promise.all([
      readClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('profile_visibility', 'public')
        .not('username', 'is', null)
        .gt('bookmark_count_today', 0),
      readClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('profile_visibility', 'public')
        .not('username', 'is', null)
        .gte('created_at', weekAgo.toISOString()),
    ]);

    if (todayTrackersResult.error || newProfilesResult.error) {
      throw new Error('Failed to load ambient community activity.');
    }

    return {
      publicTrackersToday: todayTrackersResult.count ?? 0,
      newPublicProfilesThisWeek: newProfilesResult.count ?? 0,
    };
  }

  private static async attachRecentTrackerCounts({
    events,
    viewerId,
    readClient,
    now,
  }: {
    events: NetworkingOpportunityEvent[];
    viewerId: string;
    readClient: SupabaseClientType;
    now: Date;
  }): Promise<NetworkingOpportunityEvent[]> {
    if (events.length === 0) {
      return events;
    }

    const weekAgo = new Date(
      now.getTime() - AMBIENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
    const eventIds = Array.from(new Set(events.map((event) => event.id)));
    const recentTrackingResult = await readClient
      .from('user_events')
      .select('event_id, user_id')
      .in('event_id', eventIds)
      .eq('is_bookmarked', true)
      .gte('bookmarked_at', weekAgo.toISOString())
      .not('bookmarked_at', 'is', null);

    if (recentTrackingResult.error) {
      throw new Error('Failed to load recent community tracking.');
    }

    const recentTrackingRows = (recentTrackingResult.data || []) as RecentTrackingRow[];
    const trackerIds = Array.from(
      new Set(
        recentTrackingRows
          .map((row) => row.user_id)
          .filter((userId) => Boolean(userId) && userId !== viewerId)
      )
    );

    if (trackerIds.length === 0) {
      return events.map((event) => ({
        ...event,
        recentTrackerCount: 0,
      }));
    }

    const publicProfilesResult = await readClient
      .from('profiles')
      .select('id')
      .in('id', trackerIds)
      .eq('profile_visibility', 'public')
      .not('username', 'is', null);

    if (publicProfilesResult.error) {
      throw new Error('Failed to validate recent community tracking visibility.');
    }

    const publicTrackerIds = new Set(
      ((publicProfilesResult.data || []) as ActivityProfileRow[]).map(
        (profile) => profile.id
      )
    );
    const recentTrackerCountByEventId = new Map<string, number>();

    for (const row of recentTrackingRows) {
      if (!publicTrackerIds.has(row.user_id) || row.user_id === viewerId) {
        continue;
      }

      recentTrackerCountByEventId.set(
        row.event_id,
        (recentTrackerCountByEventId.get(row.event_id) ?? 0) + 1
      );
    }

    return events.map((event) => ({
      ...event,
      recentTrackerCount: recentTrackerCountByEventId.get(event.id) ?? 0,
    }));
  }

  private static async attachSpeakerPreviews({
    events,
    readClient,
  }: {
    events: NetworkingOpportunityEvent[];
    readClient: SupabaseClientType;
  }): Promise<NetworkingOpportunityEvent[]> {
    const eventIds = events.map((event) => event.id);
    if (eventIds.length === 0) {
      return events;
    }

    const speakerResult = await readClient
      .from('event_speakers_flat')
      .select('event_id, speaker_id, speaker_name')
      .in('event_id', eventIds);

    if (speakerResult.error || !speakerResult.data) {
      return events;
    }

    const speakerIds = Array.from(
      new Set(
        (speakerResult.data as Array<{ speaker_id: string | null }>)
          .map((row) => row.speaker_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const speakerDetailsById = new Map<string, NetworkingSpeakerPreview>();
    if (speakerIds.length > 0) {
      const detailResult = await readClient
        .from('speakers')
        .select(
          'id, name, title, company, photo_url, linkedin_url, twitter_url, website_url'
        )
        .in('id', speakerIds);

      if (detailResult.data) {
        for (const row of detailResult.data as Array<{
          id: string;
          name: string;
          title: string | null;
          company: string | null;
          photo_url: string | null;
          linkedin_url: string | null;
          twitter_url: string | null;
          website_url: string | null;
        }>) {
          speakerDetailsById.set(row.id, {
            id: row.id,
            name: row.name,
            title: row.title,
            company: row.company,
            photoUrl: row.photo_url,
            linkedinUrl: row.linkedin_url,
            twitterUrl: row.twitter_url,
            websiteUrl: row.website_url,
          });
        }
      }
    }

    const speakersByEventId = new Map<string, NetworkingSpeakerPreview[]>();
    const seenSpeakerIdsByEventId = new Map<string, Set<string>>();
    for (const row of speakerResult.data as Array<{
      event_id: string | null;
      speaker_id: string | null;
      speaker_name: string | null;
    }>) {
      if (!row.event_id || !row.speaker_id) {
        continue;
      }

      const seenSpeakerIds = seenSpeakerIdsByEventId.get(row.event_id) ?? new Set<string>();
      if (seenSpeakerIds.has(row.speaker_id)) {
        continue;
      }

      const speakerPreview = speakerDetailsById.get(row.speaker_id);
      if (!speakerPreview) {
        continue;
      }

      const existing = speakersByEventId.get(row.event_id) ?? [];
      if (existing.length < 3) {
        existing.push(speakerPreview);
        speakersByEventId.set(row.event_id, existing);
      }
      seenSpeakerIds.add(row.speaker_id);
      seenSpeakerIdsByEventId.set(row.event_id, seenSpeakerIds);
    }

    return events.map((event) => ({
      ...event,
      speakers: speakersByEventId.get(event.id),
    }));
  }

  private static async attachAmbientCommunity({
    homeData,
    viewerId,
    readClient,
    now,
  }: {
    homeData: CommunityNetworkingHomeData;
    viewerId: string;
    readClient: SupabaseClientType;
    now: Date;
  }): Promise<CommunityNetworkingHomeData> {
    const needsStarterProfiles =
      homeData.summary.visibleOpportunityCount === 0 &&
      homeData.followUps.length === 0 &&
      (homeData.starterProfiles?.length ?? 0) === 0;
    const needsStarterEvents = homeData.priorityEvents.length === 0;

    const [starterProfileData, starterEventData, ambientActivityCounts] =
      await Promise.all([
        needsStarterProfiles
          ? this.getStarterProfiles({ viewerId, readClient })
          : Promise.resolve({
              starterProfiles: homeData.starterProfiles ?? [],
              publicProfileCount: homeData.publicProfileCount ?? 0,
            }),
        needsStarterEvents
          ? this.getStarterEventData({ viewerId, readClient, now })
          : Promise.resolve({
              priorityEvents: homeData.priorityEvents,
              meetPeople: [],
            }),
        this.getAmbientActivityCounts({ readClient, now }),
      ]);

    const eventsWithTrackers = await this.attachRecentTrackerCounts({
      events: starterEventData.priorityEvents,
      viewerId,
      readClient,
      now,
    });
    const rankedEvents = needsStarterEvents
      ? [...eventsWithTrackers]
          .sort(rankStarterFallbackEvents)
          .slice(0, PRIORITY_EVENT_LIMIT)
      : eventsWithTrackers;
    const priorityEvents = await this.attachSpeakerPreviews({
      events: rankedEvents,
      readClient,
    });
    const visiblePrioritySpeakerIds = new Set(
      priorityEvents.flatMap((event) =>
        (event.speakers ?? [])
          .map((speaker) => speaker.id)
          .filter((speakerId): speakerId is string => Boolean(speakerId))
      )
    );
    const speakerMatches = await this.getPastSpeakerMatches({
      viewerId,
      readClient,
      now,
      excludedSpeakerIds: visiblePrioritySpeakerIds,
    });
    const meetPeople =
      homeData.meetPeople.length > 0 ? homeData.meetPeople : starterEventData.meetPeople;

    return {
      ...homeData,
      summary: {
        ...homeData.summary,
        visibleOpportunityCount: Math.max(
          homeData.summary.visibleOpportunityCount,
          meetPeople.length
        ),
      },
      priorityEvents,
      meetPeople,
      speakerMatches,
      ...starterProfileData,
      ambientActivity: {
        ...ambientActivityCounts,
        roomsWithFreshTrackingCount: priorityEvents.filter(
          (event) => (event.recentTrackerCount ?? 0) > 0
        ).length,
      },
    };
  }

  static async getHomeData({
    viewerId,
    readClient,
    now = new Date(),
  }: {
    viewerId: string | null;
    readClient: SupabaseClientType;
    now?: Date;
  }): Promise<CommunityNetworkingHomeData> {
    if (!viewerId) {
      return this.createEmptyData(false);
    }

    const [viewerProfileResult, viewerEventsResult] = await Promise.all([
      readClient.from('profiles').select('show_attendance').eq('id', viewerId).maybeSingle(),
      readClient
        .from('user_events')
        .select('event_id, status, is_bookmarked')
        .eq('user_id', viewerId),
    ]);

    if (viewerProfileResult.error) {
      throw new Error('Failed to load community visibility preferences.');
    }

    if (viewerEventsResult.error) {
      throw new Error('Failed to load tracked events for community.');
    }

    const attendanceVisibilityEnabled =
      ((viewerProfileResult.data || null) as ViewerProfileRow | null)?.show_attendance ===
      true;

    const viewerEvents = ((viewerEventsResult.data || []) as ViewerEventRow[]).filter(
      (row) => row.is_bookmarked || row.status === 'attending' || row.status === 'attended'
    );

    const eventIds = Array.from(new Set(viewerEvents.map((row) => row.event_id)));
    if (eventIds.length === 0) {
      return this.attachAmbientCommunity({
        homeData: this.createEmptyData(attendanceVisibilityEnabled),
        viewerId,
        readClient,
        now,
      });
    }

    const eventsResult = await readClient
      .from('events')
      .select(
        'id, slug, title, start_time, event_image_url, source_url, source_domain, location, attendee_count, event_format, event_type_id, status, organizer:organizers(logo_url)'
      )
      .in('id', eventIds)
      .eq('status', 'confirmed');

    if (eventsResult.error) {
      throw new Error('Failed to load community events.');
    }

    const nowTime = now.getTime();
    const followUpCutoff = nowTime - FOLLOW_UP_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const eventsById = new Map<string, EventRow>(
      ((eventsResult.data || []) as EventRow[])
        .filter((event) => !isShowcaseEventSource(event))
        .map((event) => [event.id, event])
    );

    const priorityEventInputs: CommunityNetworkingEventInput[] = [];
    const recentEventInputs: CommunityNetworkingEventInput[] = [];

    for (const row of viewerEvents) {
      const event = eventsById.get(row.event_id);
      if (!event) {
        continue;
      }

      const startTime = getTimeValue(event.start_time);
      const viewerContext = row.status === 'attending' ? 'attending' : 'saved';
      const normalizedEvent = {
        id: event.id,
        slug: event.slug,
        title: event.title || 'Untitled event',
        startTime: event.start_time,
        imageUrl: event.event_image_url,
        organizerLogoUrl: getEventOrganizerLogoUrl(event),
        location: event.location,
        format: normalizeEventFormat(event.event_format),
        viewerContext,
      } satisfies CommunityNetworkingEventInput;

      if (startTime >= nowTime && (row.status === 'attending' || row.is_bookmarked)) {
        priorityEventInputs.push(normalizedEvent);
      }

      if (
        startTime <= nowTime &&
        startTime >= followUpCutoff &&
        (row.status === 'attended' || row.status === 'attending')
      ) {
        recentEventInputs.push(normalizedEvent);
      }
    }

    const dedupedPriorityEvents = dedupeEvents(priorityEventInputs);
    const dedupedRecentEvents = dedupeEvents(recentEventInputs);
    const relevantEventIds = Array.from(
      new Set([
        ...dedupedPriorityEvents.map((event) => event.id),
        ...dedupedRecentEvents.map((event) => event.id),
      ])
    );

    if (relevantEventIds.length === 0) {
      return this.attachAmbientCommunity({
        homeData: this.createEmptyData(attendanceVisibilityEnabled),
        viewerId,
        readClient,
        now,
      });
    }

    const attendanceResult = await readClient
      .from('user_events')
      .select('event_id, user_id, status')
      .in('event_id', relevantEventIds)
      .in('status', ['attending', 'attended']);

    if (attendanceResult.error) {
      throw new Error('Failed to load networking attendees.');
    }

    const attendanceRows = (attendanceResult.data || []) as AttendanceRow[];
    const { attendeeInputs, totalAttendeeCountByEventId } =
      await this.getVisibleAttendeeContext({
        viewerId,
        readClient,
        eventRows: Array.from(eventsById.values()),
        attendanceRows,
        now,
      });

    return this.attachAmbientCommunity({
      homeData: buildCommunityNetworkingHomeData({
        attendanceVisibilityEnabled,
        priorityEventInputs: dedupedPriorityEvents,
        recentEventInputs: dedupedRecentEvents,
        attendeeInputs,
        totalAttendeeCountByEventId,
        includeEmptyPriorityEvents: true,
      }),
      viewerId,
      readClient,
      now,
    });
  }
}
