'use client';

import type { AgendaItem, Event, Speaker } from '@/types';

const normalizeSpeakerIdentityPart = (value?: string | null): string | null => {
    const normalized = value?.trim().toLowerCase();
    return normalized ? normalized : null;
};

export const getSpeakerIdentity = (speaker: Speaker, fallbackIndex?: number): string => {
    const explicitId = normalizeSpeakerIdentityPart(speaker.id);
    if (explicitId) {
        return `id:${explicitId}`;
    }

    const linkedInIdentity = normalizeSpeakerIdentityPart(speaker.linkedinUrl);
    if (linkedInIdentity) {
        return `linkedin:${linkedInIdentity}`;
    }

    const profileIdentity = [
        speaker.name,
        speaker.company,
        speaker.title,
        speaker.photoUrl,
    ]
        .map(normalizeSpeakerIdentityPart)
        .filter(Boolean)
        .join('|');

    if (profileIdentity) {
        return `profile:${profileIdentity}`;
    }

    return `speaker:${fallbackIndex ?? 0}`;
};

export const getAgendaSpeakers = (agenda: AgendaItem[] | undefined): Speaker[] => {
    if (!Array.isArray(agenda) || agenda.length === 0) {
        return [];
    }

    return agenda.flatMap((item) => [
        ...(item.speakers ?? []),
        ...(item.speaker ? [item.speaker] : []),
    ]);
};

export const hasSpeakerData = (event: Pick<Event, 'speakerLineup' | 'agenda'>): boolean => {
    if (Array.isArray(event.speakerLineup) && event.speakerLineup.length > 0) {
        return true;
    }

    return getAgendaSpeakers(event.agenda).length > 0;
};

export const dedupeSpeakersFromEvent = (event: Pick<Event, 'speakerLineup' | 'agenda'>): Speaker[] => {
    const seenSpeakerIdentities = new Set<string>();
    const speakerCandidates = [
        ...(event.speakerLineup ?? []),
        ...getAgendaSpeakers(event.agenda),
    ];

    return speakerCandidates.filter((speaker, index) => {
        const speakerIdentity = getSpeakerIdentity(speaker, index);

        if (seenSpeakerIdentities.has(speakerIdentity)) {
            return false;
        }

        seenSpeakerIdentities.add(speakerIdentity);
        return true;
    });
};
