import * as Sentry from '@sentry/nextjs';

import { sanitizeStoragePath } from '@/lib/storagePathUtils';
import { ProfileService } from '@/services/profileService';
import type { SupabaseClientType } from '@/types';

const AVATAR_BUCKET = 'avatars';

export function getOwnedAvatarStoragePath(
  avatarUrl: string | null | undefined,
  userId: string,
): string | null {
  const trimmedUrl = avatarUrl?.trim();
  const trimmedUserId = userId.trim();
  if (!trimmedUrl || !trimmedUserId) return null;

  try {
    const marker = '/storage/v1/object/public/avatars/';
    const pathname = new URL(trimmedUrl).pathname;
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    const storagePath = decodeURIComponent(
      pathname.slice(markerIndex + marker.length),
    );
    return storagePath.startsWith(`avatars/${trimmedUserId}-`) ||
      storagePath.startsWith(`${trimmedUserId}-`)
      ? storagePath
      : null;
  } catch {
    return null;
  }
}

async function getCurrentAvatarUrl(
  userId: string,
  supabase: SupabaseClientType,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data?.avatar_url ?? null;
}

async function removeOwnedAvatarObject(
  avatarUrl: string | null,
  userId: string,
  supabase: SupabaseClientType,
): Promise<void> {
  const storagePath = getOwnedAvatarStoragePath(avatarUrl, userId);
  if (!storagePath) return;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([storagePath]);
  if (error) {
    console.warn('Failed to remove a replaced avatar object.', error);
    Sentry.captureException(error, {
      level: 'warning',
      extra: { function: 'removeOwnedAvatarObject', userId, storagePath },
    });
  }
}

export class MobileAvatarService {
  static async replaceAvatar(
    userId: string,
    avatarFile: File,
    supabase: SupabaseClientType,
  ): Promise<{ avatarUrl: string }> {
    const currentAvatarUrl = await getCurrentAvatarUrl(userId, supabase);
    const filePath = sanitizeStoragePath(
      `avatars/${userId}-${Date.now()}.webp`,
    );
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, avatarFile, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    try {
      await ProfileService.updateProfile(
        userId,
        { avatarUrl: urlData.publicUrl },
        supabase,
      );
    } catch (error) {
      const { error: cleanupError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .remove([filePath]);
      if (cleanupError) {
        console.warn(
          'Failed to clean up an uncommitted avatar upload.',
          cleanupError,
        );
      }
      throw error;
    }

    await removeOwnedAvatarObject(currentAvatarUrl, userId, supabase);
    return { avatarUrl: urlData.publicUrl };
  }

  static async removeAvatar(
    userId: string,
    supabase: SupabaseClientType,
  ): Promise<void> {
    const currentAvatarUrl = await getCurrentAvatarUrl(userId, supabase);
    await ProfileService.updateProfile(userId, { avatarUrl: null }, supabase);
    await removeOwnedAvatarObject(currentAvatarUrl, userId, supabase);
  }
}
