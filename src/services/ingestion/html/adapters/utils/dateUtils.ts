export function toISODateTime(value?: string | null): string | undefined {
    if (!value || typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
        return undefined;
    }

    return date.toISOString();
}




