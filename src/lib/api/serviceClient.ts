import { createServiceClient } from '@/utils/supabase/service';

export function getServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createServiceClient(url, key);
}

export function requireServiceSupabaseClient() {
  const client = getServiceSupabaseClient();
  if (!client) {
    throw new Error('Supabase service config missing');
  }
  return client;
}
