import type {
  NetworkingFollowUpCard,
  NetworkingOpportunityEvent,
  NetworkingPersonCard,
} from '@/types/community';

interface RelationshipShape {
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
}

interface PersonNameShape {
  fullName: string | null;
  username: string;
}

export function formatNetworkingDayBadge(value: string): {
  day: string;
  month: string;
} {
  const date = new Date(value);

  return {
    day: new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date),
    month: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      timeZone: 'UTC',
    }).format(date),
  };
}

export function formatNetworkingEventDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function formatNetworkingEventTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatNetworkingLocation(
  location: string | null,
  format: string | null
): string {
  if (format === 'virtual') {
    return 'Virtual';
  }

  if (format === 'hybrid' && location) {
    return `${location} · Hybrid`;
  }

  return location || 'Location TBA';
}

export function getNetworkingDisplayName(person: PersonNameShape): string {
  return person.fullName || `@${person.username}`;
}

export function getNetworkingRelationshipLabels(
  person: RelationshipShape
): string[] {
  if (person.isMutualFollow) {
    return ['Mutual follow'];
  }

  const labels: string[] = [];

  if (person.followsViewer) {
    labels.push('Follows you');
  }

  if (person.isInNetwork) {
    labels.push('You follow');
  }

  if (labels.length === 0 && person.isInNetwork) {
    labels.push('In your network');
  }

  return labels.slice(0, 2);
}

export function formatViewerContextLabel(
  viewerContext: NetworkingOpportunityEvent['viewerContext']
): string {
  return viewerContext === 'attending' ? 'Attending' : 'Saved';
}

export function formatFollowUpRecency(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return 'Recently';
  }

  const diffMs = Date.now() - timestamp;
  const dayDiff = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));

  if (dayDiff <= 1) {
    return 'Yesterday';
  }

  if (dayDiff < 7) {
    return `${dayDiff} days ago`;
  }

  const weekDiff = Math.round(dayDiff / 7);
  if (weekDiff <= 1) {
    return 'Last week';
  }

  return `${weekDiff} weeks ago`;
}

export function getEventOpportunityCopy(event: NetworkingOpportunityEvent): string {
  if (event.relationshipAttendeeCount > 0) {
    return `${event.relationshipAttendeeCount} people you already know are visible here.`;
  }

  if (event.networkAttendingCount > 0) {
    return `${event.networkAttendingCount} people you follow are visible here.`;
  }

  return `${event.visibleAttendeeCount} public attendee profiles to browse before you go.`;
}

export function getMeetPeopleCopy(person: NetworkingPersonCard): string {
  if (person.sharedUpcomingEventCount === 1) {
    return 'You overlap on 1 upcoming event.';
  }

  return `You overlap on ${person.sharedUpcomingEventCount} upcoming events.`;
}

export function getFollowUpCopy(person: NetworkingFollowUpCard): string {
  if (person.sharedPastEventCount === 1) {
    return 'You recently shared 1 event.';
  }

  return `You recently shared ${person.sharedPastEventCount} events.`;
}
