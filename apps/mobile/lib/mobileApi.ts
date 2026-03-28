import { MobileApiClient } from '@kurecal/mobile-client';
import { getApiBaseUrl } from '@/lib/env';
import { getSupabaseClient } from '@/lib/supabase';

let mobileApiClient: MobileApiClient | null = null;

export function getMobileApiClient(): MobileApiClient {
  if (!mobileApiClient) {
    mobileApiClient = new MobileApiClient({
      baseUrl: getApiBaseUrl(),
      getAccessToken: async () => {
        const {
          data: { session },
        } = await getSupabaseClient().auth.getSession();

        return session?.access_token ?? null;
      },
    });
  }

  return mobileApiClient;
}
