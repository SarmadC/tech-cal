export function sanitizeStoragePath(path: string): string {
    return path
        .replace(/\.\.[/\\]/g, '')
        .replace(/^\.\.$/,     '')
        .replace(/\0/g, '');
}

const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg':               'jpg',
    'image/png':                'png',
    'image/webp':               'webp',
    'image/gif':                'gif',
    'image/heic':               'heic',
    'image/heif':               'heif',
    'image/svg+xml':            'svg',
    'image/avif':               'avif',
    'image/x-icon':             'ico',
    'image/vnd.microsoft.icon': 'ico',
};

export function imageExtFromMimeType(mimeType: string): string {
    return MIME_TO_EXT[mimeType.toLowerCase()] ?? 'png';
}
