export interface SearchableQueueRecord {
    eventId?: string | null;
    sourceEventId?: string | null;
    title?: string | null;
    organizerName?: string | null;
}

export const normalizeUpdateQueueSearch = (value: string | null): string => {
    if (!value) {
        return '';
    }

    return value
        .trim()
        .replace(/[%]/g, '')
        .replace(/,/g, ' ')
        .replace(/\s+/g, ' ');
};

export const isUuidSearch = (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const matchesUpdateQueueSearch = (
    record: SearchableQueueRecord,
    search: string,
): boolean => {
    const normalizedSearch = normalizeUpdateQueueSearch(search);
    if (!normalizedSearch) {
        return true;
    }

    if (isUuidSearch(normalizedSearch)) {
        return record.eventId === normalizedSearch || record.sourceEventId === normalizedSearch;
    }

    const needle = normalizedSearch.toLowerCase();
    return [
        record.title,
        record.organizerName,
    ].some((value) => typeof value === 'string' && value.toLowerCase().includes(needle));
};
