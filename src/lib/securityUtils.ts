// src/lib/securityUtils.ts

/**
 * Sanitizes a string for a PostgreSQL Full-Text Search query.
 * This prevents FTS query injection by removing special operators and
 * constructing a safe query string with a specified joiner.
 *
 * @param query The raw search string from user input.
 * @param joiner The operator to join terms with ('&' for AND, '|' for OR).
 * @returns A sanitized query string safe for Supabase FTS.
 */
export function sanitizeFtsQuery(query: string, joiner: ' & ' | ' | ' = ' & '): string {
    // 1. Remove special FTS operators: & | ! : ' ( ) < >
    const sanitized = query.replace(/[&|!:'()<>]+/g, '');

    // 2. Split into words, filter out empty strings, and join with the safe operator.
    const terms = sanitized.trim().split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
        return '';
    }

    // 3. Return the safe, structured query string.
    return terms.join(joiner);
}