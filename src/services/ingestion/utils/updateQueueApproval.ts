import type { AgendaItemInput, SpeakerInput } from '../EventEnrichmentService';
import { extractRelationIds } from './enrichmentQueue';

const RELATIONSHIP_FIELDS = ['tags', 'audiences', 'prerequisites'] as const;

export interface QueueFieldLike {
    id: string;
    field_name: string;
    new_value: unknown;
}

export interface AgendaApprovalItem extends Omit<AgendaItemInput, 'speakerIds'> {
    speakerIds?: string[];
    speakerNames?: string[];
}

export interface ApprovalPlan<TField extends QueueFieldLike = QueueFieldLike> {
    scalarUpdateData: Record<string, unknown>;
    relationshipUpdates: { tagIds?: string[]; audienceIds?: string[]; prerequisiteIds?: string[] };
    speakerUpdates: SpeakerInput[];
    agendaUpdates: AgendaApprovalItem[];
    fieldsToApprove: TField[];
    fieldsToReject: TField[];
    sanitizedFieldUpdates: Array<{ id: string; newValue: unknown }>;
    warnings: string[];
}

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const toTrimmedString = (value: unknown): string | undefined => {
    if (!isNonEmptyString(value)) {
        return undefined;
    }

    return value.trim();
};

const toPositiveInteger = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.round(value);
    }

    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^\d.]/g, ''));
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.round(parsed);
        }
    }

    return undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', 'yes', 'required'].includes(normalized)) return true;
        if (['false', 'no', 'optional'].includes(normalized)) return false;
    }

    return undefined;
};

const normalizeSpeakerNames = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const names = Array.from(
        new Set(
            value
                .map((speaker) => (typeof speaker === 'string' ? speaker.trim() : ''))
                .filter(Boolean)
        )
    );

    return names.length > 0 ? names : undefined;
};

export const serializeAgendaApprovalItem = (item: AgendaApprovalItem) => ({
    title: item.title,
    start_time: item.startTime,
    end_time: item.endTime ?? null,
    description: item.description ?? null,
    location: item.location ?? null,
    track: item.track ?? null,
    day_number: item.dayNumber ?? null,
    agenda_type: item.type ?? null,
    difficulty_level: item.difficultyLevel ?? null,
    capacity: item.capacity ?? null,
    prerequisites: item.prerequisites ?? null,
    is_required: item.isRequired ?? null,
    duration_minutes: item.durationMinutes ?? null,
    speakerIds: item.speakerIds ?? [],
    speakers: item.speakerNames ?? [],
});

export const serializeSpeakerApprovalItem = (speaker: SpeakerInput) => ({
    name: speaker.name,
    linkedinUrl: speaker.linkedinUrl ?? null,
    title: speaker.title ?? null,
    company: speaker.company ?? null,
    bio: speaker.bio ?? null,
    photoUrl: speaker.photoUrl ?? null,
    twitterUrl: speaker.twitterUrl ?? null,
    websiteUrl: speaker.websiteUrl ?? null,
});

export const coerceAgendaItems = (
    value: unknown
): { items: AgendaApprovalItem[]; invalidItems: string[] } => {
    if (!Array.isArray(value)) {
        return {
            items: [],
            invalidItems: [],
        };
    }

    const items: AgendaApprovalItem[] = [];
    const invalidItems: string[] = [];

    value.forEach((item, index) => {
        const typed = item as Record<string, unknown>;
        const rawTitle = toTrimmedString(typed.title) ?? '';
        const startTime =
            toTrimmedString(typed.start_time) ??
            toTrimmedString(typed.startTime) ??
            '';
        const endTime =
            toTrimmedString(typed.end_time) ??
            toTrimmedString(typed.endTime) ??
            undefined;

        const label = rawTitle || `item ${index + 1}`;
        if (!rawTitle || !startTime) {
            invalidItems.push(label);
            return;
        }

        const speakerIds =
            Array.isArray(typed.speakerIds) && typed.speakerIds.every((s) => typeof s === 'string')
                ? Array.from(new Set((typed.speakerIds as string[]).map((speakerId) => speakerId.trim()).filter(Boolean)))
                : undefined;
        const speakerNames = normalizeSpeakerNames(typed.speakers ?? typed.speakerNames);

        items.push({
            title: rawTitle,
            startTime,
            endTime,
            type: toTrimmedString(typed.agenda_type) ?? toTrimmedString(typed.agendaType) ?? toTrimmedString(typed.type),
            description: toTrimmedString(typed.description),
            location: toTrimmedString(typed.location),
            dayNumber: toPositiveInteger(typed.day_number) ?? toPositiveInteger(typed.dayNumber),
            track: toTrimmedString(typed.track),
            speakerIds,
            speakerNames,
            capacity: toPositiveInteger(typed.capacity) ?? null,
            difficultyLevel:
                toTrimmedString(typed.difficulty_level) ??
                toTrimmedString(typed.difficultyLevel) ??
                null,
            prerequisites: toTrimmedString(typed.prerequisites) ?? null,
            isRequired: toBoolean(typed.is_required) ?? toBoolean(typed.isRequired) ?? null,
            durationMinutes:
                toPositiveInteger(typed.duration_minutes) ??
                toPositiveInteger(typed.durationMinutes) ??
                null,
        });
    });

    return {
        items,
        invalidItems,
    };
};

export const coerceSpeakerLineup = (
    value: unknown
): { items: SpeakerInput[]; invalidItems: string[] } => {
    if (!Array.isArray(value)) {
        return {
            items: [],
            invalidItems: [],
        };
    }

    const items: SpeakerInput[] = [];
    const invalidItems: string[] = [];

    value.forEach((speaker, index) => {
        const typed = speaker as Record<string, unknown>;
        const name = toTrimmedString(typed.name) ?? '';
        if (!name) {
            invalidItems.push(`speaker ${index + 1}`);
            return;
        }

        items.push({
            name,
            linkedinUrl: toTrimmedString(typed.linkedinUrl),
            title: toTrimmedString(typed.title),
            company: toTrimmedString(typed.company),
            bio: toTrimmedString(typed.bio),
            photoUrl: toTrimmedString(typed.photoUrl),
            twitterUrl: toTrimmedString(typed.twitterUrl),
            websiteUrl: toTrimmedString(typed.websiteUrl),
        });
    });

    return {
        items,
        invalidItems,
    };
};

export const collectFieldUpdates = <TField extends QueueFieldLike>(
    fields: TField[],
): ApprovalPlan<TField> => {
    const scalarUpdateData: Record<string, unknown> = {};
    const relationshipUpdates: { tagIds?: string[]; audienceIds?: string[]; prerequisiteIds?: string[] } = {};
    const speakerUpdates: SpeakerInput[] = [];
    const agendaUpdates: AgendaApprovalItem[] = [];
    const fieldsToApprove: TField[] = [];
    const fieldsToReject: TField[] = [];
    const sanitizedFieldUpdates: Array<{ id: string; newValue: unknown }> = [];
    const warnings: string[] = [];

    for (const field of fields) {
        if (field.field_name === 'agenda') {
            const { items, invalidItems } = coerceAgendaItems(field.new_value);

            if (items.length > 0) {
                agendaUpdates.push(...items);
                fieldsToApprove.push(field);
                if (invalidItems.length > 0) {
                    sanitizedFieldUpdates.push({
                        id: field.id,
                        newValue: items.map(serializeAgendaApprovalItem),
                    });
                    warnings.push(
                        `Skipped invalid agenda items missing title/start: ${invalidItems.slice(0, 5).join(', ')}`
                    );
                }
            } else if (invalidItems.length > 0) {
                fieldsToReject.push(field);
                warnings.push(
                    `Rejected agenda field because every agenda item was missing title/start: ${invalidItems.slice(0, 5).join(', ')}`
                );
            }
            continue;
        }

        if (field.field_name === 'speaker_lineup') {
            const { items, invalidItems } = coerceSpeakerLineup(field.new_value);

            if (items.length > 0) {
                speakerUpdates.push(...items);
                fieldsToApprove.push(field);
                if (invalidItems.length > 0) {
                    sanitizedFieldUpdates.push({
                        id: field.id,
                        newValue: items.map(serializeSpeakerApprovalItem),
                    });
                    warnings.push(
                        `Skipped invalid speaker entries missing name: ${invalidItems.slice(0, 5).join(', ')}`
                    );
                }
            } else if (invalidItems.length > 0) {
                fieldsToReject.push(field);
                warnings.push(
                    `Rejected speaker lineup field because every speaker entry was missing a name: ${invalidItems.slice(0, 5).join(', ')}`
                );
            }
            continue;
        }

        if (RELATIONSHIP_FIELDS.includes(field.field_name as typeof RELATIONSHIP_FIELDS[number])) {
            const relationIds = extractRelationIds(field.new_value);
            if (!relationIds) {
                continue;
            }

            if (field.field_name === 'tags') {
                relationshipUpdates.tagIds = relationIds;
            } else if (field.field_name === 'audiences') {
                relationshipUpdates.audienceIds = relationIds;
            } else if (field.field_name === 'prerequisites') {
                relationshipUpdates.prerequisiteIds = relationIds;
            }
            fieldsToApprove.push(field);
            continue;
        }

        scalarUpdateData[field.field_name] = field.new_value;
        fieldsToApprove.push(field);
    }

    return {
        scalarUpdateData,
        relationshipUpdates,
        speakerUpdates,
        agendaUpdates,
        fieldsToApprove,
        fieldsToReject,
        sanitizedFieldUpdates,
        warnings,
    };
};
