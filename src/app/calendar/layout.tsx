import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/profileService';
import { EventTypeService } from '@/services/eventTypeService';
import { CalendarLayout } from './CalendarLayout';

export default async function Layout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch data needed for the layout (sidebar, header)
    const profile = user ? await ProfileService.getProfile(user.id, supabase) : null;
    const categories = await EventTypeService.getEventTypes(supabase);

    return (
        <CalendarLayout profile={profile} categories={categories}>
            {children}
        </CalendarLayout>
    );
}