const ISO_OFFSET_WITHOUT_COLON = /([+-]\d{2})(\d{2})$/;
const HAS_TIME_COMPONENT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/i;

const normalizeAbsoluteDateTimeString = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return trimmed;
    }

    if (!HAS_TIME_COMPONENT.test(trimmed)) {
        return trimmed;
    }

    if (/Z$/i.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    if (ISO_OFFSET_WITHOUT_COLON.test(trimmed)) {
        return trimmed.replace(ISO_OFFSET_WITHOUT_COLON, '$1:$2');
    }

    return trimmed;
};

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

    if (HAS_TIME_COMPONENT.test(trimmed)) {
        return normalizeAbsoluteDateTimeString(trimmed);
    }

    return date.toISOString();
}





