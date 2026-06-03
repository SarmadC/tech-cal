import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { EventService } from '@/services/eventServices';
import { CommunityRoomThreadService } from '@/services/communityRoomThreadService';
import { extractIdFromSlug } from '@/utils/slugUtils';
import EventRoomPage from '@/components/events/EventRoomPage';

type EventRoomPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventRoomRoute({ params }: EventRoomPageProps) {
  const { id: slugOrId } = await params;
  const eventId = extractIdFromSlug(slugOrId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  let event;
  try {
    event = await EventService.getEventById(eventId, supabase);
  } catch {
    notFound();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) notFound();

  const serviceClient = createServiceClient(supabaseUrl, serviceRoleKey);

  const [{ threads, nextCursor }, totalCount] = await Promise.all([
    CommunityRoomThreadService.listThreads({
      eventId,
      viewerId: user.id,
      readClient: serviceClient,
    }),
    CommunityRoomThreadService.getThreadCount(eventId, serviceClient),
  ]);

  return (
    <EventRoomPage
      eventId={eventId}
      eventTitle={event.title}
      initialThreads={threads}
      initialTotalCount={totalCount}
      nextCursor={nextCursor}
    />
  );
}
