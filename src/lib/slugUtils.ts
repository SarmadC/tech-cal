export function generateSlug(title: string): string {
    if (!title) return '';
    
    return title
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD') // Decompose combined characters (e.g. 'é' -> 'e' + '´')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars (except spaces and hyphens)
        .replace(/[\s_]+/g, '-') // Replace spaces and underscores with single hyphen
        .replace(/-+/g, '-') // Collapse multiple hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
