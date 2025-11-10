const TECHMEME_PATTERNS = [
    /techmeme\.com\/r2/i,
    /from techmeme's event calendar/i,
];

/**
 * Determine whether a description is too thin to be useful.
 * Treat as thin when:
 * - Empty or whitespace
 * - Shorter than a reasonable length threshold
 * - Matches the title exactly (case-insensitive)
 * - Contains TechMeme boilerplate
 */
export function isDescriptionThin(description?: string | null, title?: string | null): boolean {
    if (!description) {
        return true;
    }

    const trimmed = description.trim();
    if (trimmed.length === 0) {
        return true;
    }

    if (trimmed.length < 40) {
        return true;
    }

    if (title && trimmed.toLowerCase() === title.trim().toLowerCase()) {
        return true;
    }

    if (TECHMEME_PATTERNS.some((pattern) => pattern.test(trimmed))) {
        return true;
    }

    return false;
}




