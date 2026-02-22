import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import { formatDate } from '@/utils/dateUtils';
import { SITE_URL } from '@/config/site';

export const revalidate = 3600;
export const dynamicParams = true;

interface EmbedPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({
    params,
}: EmbedPageProps): Promise<Metadata> {
    const { slug } = await params;

    return {
        title: 'Embedded Event Card | Kure-Cal',
        description: 'Embeddable event card for Kure-Cal events.',
        robots: {
            index: false,
            follow: true,
        },
        alternates: {
            canonical: `${SITE_URL}/events/${slug}`,
        },
    };
}

interface EmbedEvent {
    id: string;
    slug: string;
    title: string;
    start_time: string;
    end_time: string | null;
    location: string | null;
    event_format: string | null;
    event_type: { name: string; color: string | null } | null;
}

export default async function EmbedEventPage({ params }: EmbedPageProps) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('events')
        .select(
            'id, slug, title, start_time, end_time, location, event_format, event_type:event_type_id(name, color)'
        )
        .eq('slug' as never, slug)
        .eq('status', 'confirmed')
        .single();

    if (error || !data) notFound();

    const event = data as unknown as EmbedEvent;
    const eventUrl = `${SITE_URL}/events/${event.slug}`;

    return (
        <div
            style={{
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                background: '#0B0C0E',
                color: '#EDEDEF',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '16px 20px',
                maxWidth: '100%',
                boxSizing: 'border-box',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                }}
            >
                {event.event_type && (
                    <span
                        style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#8A8F98',
                        }}
                    >
                        {event.event_type.name}
                    </span>
                )}
                {event.event_format && (
                    <span style={{ fontSize: '11px', color: '#8A8F98' }}>
                        {event.event_format}
                    </span>
                )}
            </div>

            <a
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#EDEDEF',
                    textDecoration: 'none',
                    display: 'block',
                    marginBottom: '8px',
                    lineHeight: 1.3,
                }}
            >
                {event.title}
            </a>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '13px',
                    color: '#8A8F98',
                    marginBottom: '12px',
                }}
            >
                <span>{formatDate(event.start_time)}</span>
                {event.location && (
                    <>
                        <span style={{ color: 'rgba(138,143,152,0.3)' }}>
                            ·
                        </span>
                        <span>{event.location}</span>
                    </>
                )}
            </div>

            <a
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    fontSize: '12px',
                    color: '#8A8F98',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}
            >
                View on Kure-Cal
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
            </a>
        </div>
    );
}
