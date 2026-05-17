import { createServiceClient } from '@/utils/supabase/service';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_LIMIT = 100;

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoSendResponse {
  data?: ExpoTicket[];
}

// `push_tokens` isn't in the generated Database types yet. Cast through
// `unknown` for read/delete. Regenerate types after the migration to remove.
type AnyTableClient = {
  from: (table: string) => {
    select: (cols: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      in: (col: string, values: string[]) => Promise<{ data: any; error: any }>;
    };
    delete: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      in: (col: string, values: string[]) => Promise<{ error: any }>;
    };
  };
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function getServiceClient(): AnyTableClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role credentials are not configured');
  }
  return createServiceClient(url, key) as unknown as AnyTableClient;
}

interface TokenRow {
  expo_push_token: string;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  const recipients = Array.from(new Set(userIds.filter(Boolean)));
  if (recipients.length === 0) return;

  const supabase = getServiceClient();

  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('expo_push_token')
    .in('user_id', recipients);

  if (error) {
    console.warn('[push] Failed to load push tokens', error);
    return;
  }

  const expoTokens = ((tokens ?? []) as TokenRow[])
    .map((row) => row.expo_push_token)
    .filter((token): token is string => Boolean(token));

  if (expoTokens.length === 0) return;

  const messages = expoTokens.map((to) => ({
    to,
    sound: 'default' as const,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const invalidTokens: string[] = [];

  for (const batch of chunk(messages, EXPO_BATCH_LIMIT)) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      });

      const result = (await response.json().catch(() => ({}))) as ExpoSendResponse;
      const tickets = result.data ?? [];
      tickets.forEach((ticket, index) => {
        if (
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered'
        ) {
          invalidTokens.push(batch[index].to);
        }
      });
    } catch (sendError) {
      console.warn('[push] Expo push batch failed', sendError);
    }
  }

  if (invalidTokens.length > 0) {
    await supabase
      .from('push_tokens')
      .delete()
      .in('expo_push_token', invalidTokens);
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  await sendPushToUsers([userId], payload);
}
