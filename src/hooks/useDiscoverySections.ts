import { useMemo } from 'react';
import { Event, CareerImpactScore } from '@/types';
import type { CareerProfile } from '@/utils/profileTypeGuards';

type EventWithImpact = Event & { careerImpact?: CareerImpactScore };

export interface DiscoverySection {
    id: string;
    title: string;
    subtitle?: string;
    events: EventWithImpact[];
    priority: number;
}

interface UseDiscoverySectionsInput {
    events: EventWithImpact[];
    profile: CareerProfile | null;
    heroEventIds: Set<string>;
}

interface DiscoverySectionCandidate {
    id: string;
    title: string;
    subtitle?: string;
    priority: number;
    candidates: EventWithImpact[];
}

const MAX_EVENTS_PER_SECTION = 6;
const MIN_EVENTS_PER_SECTION = 2;

function sortByScore(events: EventWithImpact[]): EventWithImpact[] {
    return [...events].sort((a, b) => (b.careerImpact?.overall ?? 0) - (a.careerImpact?.overall ?? 0));
}

function normalizeValue(value: string): string {
    return value.trim().toLowerCase();
}

function dedupeById(events: EventWithImpact[]): EventWithImpact[] {
    const seen = new Set<string>();
    const deduped: EventWithImpact[] = [];

    events.forEach(event => {
        if (!seen.has(event.id)) {
            seen.add(event.id);
            deduped.push(event);
        }
    });

    return deduped;
}

function diversifyCandidates(candidates: EventWithImpact[]): EventWithImpact[] {
    const organizerSeen = new Set<string>();
    const categoryCounts = new Map<string, number>();
    const prioritized: EventWithImpact[] = [];
    const deferred: EventWithImpact[] = [];

    candidates.forEach((event) => {
        const organizerKey = event.organization?.id ?? event.organization?.name ?? event.organizer ?? 'unknown-organizer';
        const categoryKey = event.eventTypeId || event.category?.id || 'unknown-category';
        const organizerAlreadySeen = organizerSeen.has(organizerKey);
        const categoryCount = categoryCounts.get(categoryKey) ?? 0;

        if (!organizerAlreadySeen && categoryCount < 2) {
            prioritized.push(event);
            organizerSeen.add(organizerKey);
            categoryCounts.set(categoryKey, categoryCount + 1);
        } else {
            deferred.push(event);
        }
    });

    return [...prioritized, ...deferred];
}

function matchesGoal(event: EventWithImpact, goal: string): boolean {
    const normalizedGoal = normalizeValue(goal);
    if (!normalizedGoal) return false;

    const matchedGoals = event.careerImpact?.explanation?.matchedGoals ?? [];
    return matchedGoals.some(matchedGoal => normalizeValue(matchedGoal) === normalizedGoal);
}

function allocateSectionEvents(
    candidates: EventWithImpact[],
    allocatedEventIds: Set<string>
): EventWithImpact[] {
    if (candidates.length === 0) return [];

    const uniqueCandidates = diversifyCandidates(candidates.filter(event => !allocatedEventIds.has(event.id)));

    if (uniqueCandidates.length >= MIN_EVENTS_PER_SECTION) {
        const selected = uniqueCandidates.slice(0, MAX_EVENTS_PER_SECTION);
        selected.forEach(event => allocatedEventIds.add(event.id));
        return selected;
    }

    // Fallback mode: section does not have enough unique candidates.
    // Allow overlap only to reach the minimum viable section size.
    const selected = [...uniqueCandidates];
    const selectedIds = new Set(selected.map(event => event.id));
    const overlapCandidates = diversifyCandidates(dedupeById(candidates)).filter(event => !selectedIds.has(event.id));

    for (const event of overlapCandidates) {
        selected.push(event);
        if (selected.length >= MIN_EVENTS_PER_SECTION) break;
    }

    if (selected.length < MIN_EVENTS_PER_SECTION) {
        return [];
    }

    selected.forEach(event => allocatedEventIds.add(event.id));
    return selected;
}

export function buildDiscoverySections({ events, profile, heroEventIds }: UseDiscoverySectionsInput): DiscoverySection[] {
    const nonHeroEvents = events.filter(e => !heroEventIds.has(e.id));
    const sectionCandidates: DiscoverySectionCandidate[] = [];

    if (profile) {
        // Goal-based sections (strict goal matching via matchedGoals)
        (profile.careerGoals ?? []).forEach((goal, index) => {
            const goalEvents = nonHeroEvents.filter(event => matchesGoal(event, goal));
            const goalLabel = formatGoalLabel(goal);

            sectionCandidates.push({
                id: `goal-${goal}`,
                title: goalLabel,
                // subtitle: 'Events aligned with your career growth',
                candidates: sortByScore(goalEvents),
                priority: 10 + index,
            });
        });

        // Skills you're learning
        const skillsToLearn = profile.skillsToLearn ?? [];
        if (skillsToLearn.length > 0) {
            const normalizedSkills = new Set(skillsToLearn.map(skill => normalizeValue(skill)));
            const skillEvents = nonHeroEvents.filter(event => {
                const matchedSkills = event.careerImpact?.explanation?.matchedSkills ?? [];
                return matchedSkills.some(matchedSkill => normalizedSkills.has(normalizeValue(matchedSkill)));
            });

            sectionCandidates.push({
                id: 'skills-learning',
                title: 'Skills You\'re Learning',
                subtitle: `Events matching ${skillsToLearn.slice(0, 3).join(', ')}`,
                candidates: sortByScore(skillEvents),
                priority: 20,
            });
        }
    }

    // Quick Wins This Week (always shown)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const quickWins = nonHeroEvents.filter(event => {
        const start = new Date(event.startTime);
        if (start < now || start > weekFromNow) return false;
        // Duration <= 4 hours
        if (event.endTime) {
            const durationHours = (new Date(event.endTime).getTime() - start.getTime()) / (1000 * 60 * 60);
            if (durationHours > 4) return false;
        }
        return true;
    });

    sectionCandidates.push({
        id: 'quick-wins',
        title: 'Quick Wins This Week',
        subtitle: 'Short events happening soon',
        candidates: sortByScore(quickWins),
        priority: 30,
    });

    // Trending (by attendee count)
    const trending = [...nonHeroEvents]
        .filter(event => (event.attendeeCount ?? 0) > 0)
        .sort((a, b) => (b.attendeeCount ?? 0) - (a.attendeeCount ?? 0));

    sectionCandidates.push({
        id: 'trending',
        title: 'Trending',
        subtitle: 'Popular events in the community',
        candidates: trending,
        priority: 40,
    });

    // Deep Dives (multi-day or 8+ hours)
    const deepDives = nonHeroEvents.filter(event => {
        if (!event.endTime) return false;
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return durationHours >= 8;
    });

    sectionCandidates.push({
        id: 'deep-dives',
        title: 'Deep Dives',
        subtitle: 'Multi-day events and intensive workshops',
        candidates: sortByScore(deepDives),
        priority: 50,
    });

    const allocatedEventIds = new Set<string>();
    const sections: DiscoverySection[] = [];

    sectionCandidates
        .sort((a, b) => a.priority - b.priority)
        .forEach(section => {
            const sectionEvents = allocateSectionEvents(section.candidates, allocatedEventIds);
            if (sectionEvents.length < MIN_EVENTS_PER_SECTION) return;

            sections.push({
                id: section.id,
                title: section.title,
                subtitle: section.subtitle,
                events: sectionEvents,
                priority: section.priority,
            });
        });

    return sections;
}

export function useDiscoverySections({ events, profile, heroEventIds }: UseDiscoverySectionsInput): DiscoverySection[] {
    return useMemo(() => buildDiscoverySections({ events, profile, heroEventIds }), [events, profile, heroEventIds]);
}

function formatGoalLabel(goal: string): string {
    return goal
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
