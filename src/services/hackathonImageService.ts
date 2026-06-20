import * as Sentry from '@sentry/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { imageExtFromMimeType, sanitizeStoragePath } from '@/lib/storagePathUtils';

export class HackathonImageService {
    private static normalizeImageMimeType(mimeType?: string | null): string {
        const normalized = (mimeType || '').split(';')[0].trim().toLowerCase();

        if (normalized === 'image/pjpeg') return 'image/jpeg';
        if (normalized === 'image/x-png') return 'image/png';
        if (normalized === 'image/svg') return 'image/svg+xml';

        return normalized;
    }

    static async uploadHackathonHeaderImage(
        hackathonId: string,
        file: File,
        supabaseClient: SupabaseClient
    ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
        try {
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
            const normalizedType = HackathonImageService.normalizeImageMimeType(file.type);
            if (!validTypes.includes(normalizedType)) {
                return { success: false, error: `Invalid file type. Allowed: ${validTypes.join(', ')}` };
            }

            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                return { success: false, error: 'File size exceeds 5MB limit' };
            }

            const fileExt = imageExtFromMimeType(normalizedType);
            const fileName = sanitizeStoragePath(`hackathons/${hackathonId}.${fileExt}`);

            const bucketName = 'logos'; // Reuse existing public bucket
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from(bucketName)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError || !uploadData) {
                throw new Error(`Failed to upload hackathon image: ${uploadError?.message || 'Unknown error'}`);
            }

            const { data: urlData } = supabaseClient.storage.from(bucketName).getPublicUrl(fileName);
            const publicUrl = urlData.publicUrl;

            const { error: updateError } = await supabaseClient
                .from('hackathons')
                .update({ header_image_url: publicUrl })
                .eq('id', hackathonId);

            if (updateError) {
                console.warn('Failed to update hackathons.header_image_url:', updateError);
            }

            return { success: true, imageUrl: publicUrl };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error uploading hackathon header image:', error);
            Sentry.captureException(error, {
                extra: { function: 'uploadHackathonHeaderImage', hackathonId },
            });
            return { success: false, error: errorMessage };
        }
    }
}
