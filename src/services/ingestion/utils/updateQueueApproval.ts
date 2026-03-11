import type { AgendaItemInput, SpeakerInput } from '../EventEnrichmentService';
import type { AgendaTimeAnchor } from './agendaTimeNormalization';
import { normalizeAgendaTimeRangeForEvent } from './agendaTimeNormalization';
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

export interface AgendaNormalizationIssue {
    label: string;
    reason: string;
}

export interface NormalizedAgendaItemsResult {
    items: AgendaApprovalItem[];
    issues: AgendaNormalizationIssue[];
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

const normalizeTopicList = (value: unknown): string[] | undefined => {
    const rawValues =
        Array.isArray(value)
            ? value
            : typeof value === 'string'
                ? value.split(/[,\n;]/)
                : [];

    const topics = Array.from(
        new Set(
            rawValues
                .map((topic) => (typeof topic === 'string' ? topic.trim() : ''))
                .filter(Boolean)
        )
    );

    return topics.length > 0 ? topics : undefined;
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
    topics: item.topics ?? [],
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

const getAgendaItemLabel = (item: Pick<AgendaApprovalItem, 'title'>, index: number): string =>
    item.title?.trim() || `item ${index + 1}`;

const readErrorMessage = (error: unknown): string =>
    error instanceof Error && error.message ? error.message : 'Unknown agenda normalization error';

const formatIssueLabels = (issues: AgendaNormalizationIssue[]): string =>
    issues.slice(0, 5).map((issue) => issue.label).join(', ');

const upsertSanitizedFieldUpdate = (
    sanitizedFieldUpdates: Array<{ id: string; newValue: unknown }>,
    nextUpdate: { id: string; newValue: unknown }
) => {
    const nextIndex = sanitizedFieldUpdates.findIndex((update) => update.id === nextUpdate.id);
    if (nextIndex >= 0) {
        sanitizedFieldUpdates[nextIndex] = nextUpdate;
        return;
    }

    sanitizedFieldUpdates.push(nextUpdate);
};

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
            topics: normalizeTopicList(typed.topics ?? typed.topic),
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

export const normalizeAgendaApprovalItems = (
    items: AgendaApprovalItem[],
    anchor: AgendaTimeAnchor
): NormalizedAgendaItemsResult => {
    const normalizedItems: AgendaApprovalItem[] = [];
    const issues: AgendaNormalizationIssue[] = [];

    items.forEach((item, index) => {
        try {
            const normalizedTimes = normalizeAgendaTimeRangeForEvent(
                {
                    startTime: item.startTime,
                    endTime: item.endTime,
                    dayNumber: item.dayNumber,
                    durationMinutes: item.durationMinutes ?? null,
                },
                anchor
            );

            normalizedItems.push({
                ...item,
                startTime: normalizedTimes.startTime,
                endTime: normalizedTimes.endTime,
                durationMinutes: normalizedTimes.durationMinutes,
            });
        } catch (error) {
            issues.push({
                label: getAgendaItemLabel(item, index),
                reason: readErrorMessage(error),
            });
        }
    });

    return {
        items: normalizedItems,
        issues,
    };
};

export const sanitizeAgendaFieldValue = (
    value: unknown,
    anchor: AgendaTimeAnchor
): { items: AgendaApprovalItem[]; sanitizedValue: ReturnType<typeof serializeAgendaApprovalItem>[] } => {
    if (!Array.isArray(value)) {
        throw new Error('Agenda must be a JSON array of agenda items');
    }

    const { items, invalidItems } = coerceAgendaItems(value);
    if (invalidItems.length > 0) {
        throw new Error(`Agenda items missing title/start: ${invalidItems.slice(0, 5).join(', ')}`);
    }

    const normalizedItems = normalizeAgendaApprovalItems(items, anchor);
    if (normalizedItems.issues.length > 0) {
        const issueSummary = normalizedItems.issues
            .slice(0, 3)
            .map((issue) => `${issue.label} (${issue.reason})`)
            .join('; ');
        throw new Error(`Agenda items have invalid times: ${issueSummary}`);
    }

    return {
        items: normalizedItems.items,
        sanitizedValue: normalizedItems.items.map(serializeAgendaApprovalItem),
    };
};

export const normalizeApprovalPlanAgendaUpdates = <TField extends QueueFieldLike>(
    plan: ApprovalPlan<TField>,
    anchor: AgendaTimeAnchor
): ApprovalPlan<TField> => {
    const agendaUpdates: AgendaApprovalItem[] = [];
    const fieldsToApprove: TField[] = [];
    const fieldsToReject = [...plan.fieldsToReject];
    const sanitizedFieldUpdates = [...plan.sanitizedFieldUpdates];
    const warnings = [...plan.warnings];

    for (const field of plan.fieldsToApprove) {
        if (field.field_name !== 'agenda') {
            fieldsToApprove.push(field);
            continue;
        }

        const { items } = coerceAgendaItems(field.new_value);
        const normalized = normalizeAgendaApprovalItems(items, anchor);

        if (normalized.items.length === 0) {
            fieldsToReject.push(field);
            if (normalized.issues.length > 0) {
                warnings.push(
                    `Rejected agenda field because every agenda item had invalid times: ${formatIssueLabels(normalized.issues)}`
                );
            }
            continue;
        }

        fieldsToApprove.push(field);
        agendaUpdates.push(...normalized.items);
        upsertSanitizedFieldUpdate(sanitizedFieldUpdates, {
            id: field.id,
            newValue: normalized.items.map(serializeAgendaApprovalItem),
        });

        if (normalized.issues.length > 0) {
            warnings.push(`Skipped agenda items with invalid times: ${formatIssueLabels(normalized.issues)}`);
        }
    }

    return {
        ...plan,
        agendaUpdates,
        fieldsToApprove,
        fieldsToReject,
        sanitizedFieldUpdates,
        warnings,
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
