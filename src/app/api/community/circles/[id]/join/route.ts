import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: circleId } = await params;
        if (!circleId) {
            return NextResponse.json({ error: 'Missing circle ID' }, { status: 400 });
        }

        const { supabase, user } = await getApiAuthContext(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify the circle exists before inserting membership
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: circleExists } = await (supabase as any)
            .from('circles')
            .select('id')
            .eq('id', circleId)
            .single();

        if (!circleExists) {
            return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
            .from('circle_members')
            .insert({
                circle_id: circleId,
                user_id: user.id
            });

        if (error) {
            // Handle unique violation if they are already a member
            if (error.code === '23505') {
                 return NextResponse.json({ success: true, message: 'Already a member' });
            }
            console.error('Error joining circle:', error);
            return NextResponse.json({ error: 'Failed to join circle' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Joined circle' });
    } catch (e) {
        console.error('Unexpected error joining circle:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: circleId } = await params;
        if (!circleId) {
            return NextResponse.json({ error: 'Missing circle ID' }, { status: 400 });
        }

        const { supabase, user } = await getApiAuthContext(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify the circle exists before attempting membership removal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: circleExists } = await (supabase as any)
            .from('circles')
            .select('id')
            .eq('id', circleId)
            .single();

        if (!circleExists) {
            return NextResponse.json({ error: 'Circle not found' }, { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
            .from('circle_members')
            .delete()
            .match({
                circle_id: circleId,
                user_id: user.id
            });

        if (error) {
            console.error('Error leaving circle:', error);
            return NextResponse.json({ error: 'Failed to leave circle' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Left circle' });
    } catch (e) {
        console.error('Unexpected error leaving circle:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
