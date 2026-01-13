
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugDisconnect() {
    console.log('1. Listing all calendar connections...');
    const { data, error } = await supabase
        .from('calendar_connections')
        .select('*');

    if (error) {
        console.error('Select failed:', error);
    } else {
        console.log('Found connections:', data);
    }
    return;

    console.log('2. Attempting to delete connection...');
    // Placeholders for dead code
    const userId = 'placeholder-user-id';
    const provider = 'google'; 

    const { error: deleteError } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

    if (deleteError) {
        console.error('Delete failed:', deleteError);
    } else {
        console.log('Delete successful.');
    }
}

debugDisconnect();
