import type { SupabaseClientType } from '@/utils/supabase/service';
import { CalendarConnectionService } from '@/services/calendarConnectionService';

const STORAGE_PAGE_SIZE = 100;

async function removeStorageFolder(
  supabase: SupabaseClientType,
  bucket: string,
  folder: string,
  search?: string
): Promise<void> {
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: STORAGE_PAGE_SIZE,
      offset: 0,
      search,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) {
      throw new Error(`Unable to enumerate ${bucket} data for deletion.`);
    }

    const entries = data ?? [];
    const files = entries
      .filter((item) => Boolean(item.id))
      .map((item) => (folder ? `${folder}/${item.name}` : item.name));
    const folders = entries
      .filter((item) => !item.id)
      .map((item) => (folder ? `${folder}/${item.name}` : item.name));

    for (const nestedFolder of folders) {
      await removeStorageFolder(supabase, bucket, nestedFolder);
    }

    if (files.length > 0) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(files);
      if (removeError) {
        throw new Error(`Unable to remove ${bucket} data.`);
      }
    }

    if (entries.length < STORAGE_PAGE_SIZE) {
      return;
    }
  }
}

async function revokeGoogleCalendarAccess(
  supabase: SupabaseClientType,
  userId: string
): Promise<void> {
  const connection = await CalendarConnectionService.getConnectionWithTokens(
    userId,
    'google',
    supabase
  );
  const token = connection?.refreshToken ?? connection?.accessToken;
  if (!token) {
    return;
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  if (!response.ok && response.status !== 400) {
    throw new Error('Unable to revoke Google Calendar access. Please try again.');
  }
}

async function deleteRevenueCatCustomer(
  supabase: SupabaseClientType,
  userId: string
): Promise<void> {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('billing_provider,revenuecat_customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw new Error('Unable to load subscription data for deletion.');
  }
  if (subscription?.billing_provider !== 'revenuecat') {
    return;
  }

  const secret = process.env.REVENUECAT_V2_SECRET_API_KEY?.trim();
  const projectId = process.env.REVENUECAT_PROJECT_ID?.trim();
  if (!secret || !projectId) {
    throw new Error('RevenueCat account deletion is not configured.');
  }

  const customerId = subscription.revenuecat_customer_id?.trim() || userId;
  const response = await fetch(
    `https://api.revenuecat.com/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(customerId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secret}` },
    }
  );
  if (![200, 202, 404].includes(response.status)) {
    throw new Error('Unable to remove RevenueCat customer data. Please try again.');
  }
}

export async function deleteUserAccount(
  supabase: SupabaseClientType,
  userId: string
): Promise<void> {
  await deleteRevenueCatCustomer(supabase, userId);
  await revokeGoogleCalendarAccess(supabase, userId);
  await removeStorageFolder(supabase, 'community-media', userId);
  await removeStorageFolder(supabase, 'avatars', 'avatars', `${userId}-`);

  const { error } = await supabase.rpc(
    'delete_user_account' as never,
    { p_user_id: userId } as never
  );
  if (error) {
    throw new Error('Unable to delete the account data. Please try again.');
  }
}
