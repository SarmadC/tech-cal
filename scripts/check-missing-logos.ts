import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEvents() {
    // Find events with titles matching the ones in the screenshot
    const { data, error } = await supabase
        .from('events')
        .select(
            'id, title, source_url, organizer_id, organizers(id, name, logo_url, domain)'
        )
        .or(
            'title.ilike.%Norfolk%,title.ilike.%DataGrillen%,title.ilike.%Hackmiami%,title.ilike.%MiXiT%,title.ilike.%Neos Conference%'
        )
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Events found:');
    for (const event of data || []) {
        console.log('---');
        console.log('Title:', event.title);
        console.log('Source URL:', event.source_url);
        console.log('Organizer ID:', event.organizer_id);
        console.log('Organizer:', JSON.stringify(event.organizers, null, 2));
    }
}

checkEvents();
