/**
 * API Route: Create Event Tag
 * 
 * POST: Create a new tag in the event_tags table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { isAdminUser } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check admin access
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { tagName, category } = body as {
            tagName: string;
            category?: string;
        };

        if (!tagName || !tagName.trim()) {
            return NextResponse.json(
                { error: 'Tag name is required' },
                { status: 400 }
            );
        }

        const trimmedName = tagName.trim();

        // Use service client to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase service credentials');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey);

        // Check for existing tag (case-insensitive)
        const { data: existingTags, error: searchError } = await serviceClient
            .from('event_tags')
            .select('id')
            .ilike('event_tag', trimmedName)
            .limit(1);

        if (searchError) {
            console.error('Error searching for tag:', searchError);
            return NextResponse.json(
                { error: 'Database error checking for duplicates' },
                { status: 500 }
            );
        }

        if (existingTags && existingTags.length > 0) {
            return NextResponse.json(
                { 
                    success: true, 
                    tagId: existingTags[0].id,
                    message: 'Tag already exists' 
                }
            );
        }

        // Create new tag
        const { data: newTag, error: insertError } = await serviceClient
            .from('event_tags')
            .insert({
                event_tag: trimmedName,
                category: category || null,
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('Error creating tag:', insertError);
            return NextResponse.json(
                { error: 'Failed to create tag' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            tagId: newTag.id,
            message: 'Tag created successfully',
        });

    } catch (error) {
        console.error('Error in create tag API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

