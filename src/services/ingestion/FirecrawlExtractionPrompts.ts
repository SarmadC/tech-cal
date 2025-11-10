/**
 * Firecrawl Extraction Prompts
 *
 * Refined prompts for better semantic understanding and context-aware extraction
 * Handles variations in terminology (e.g., "Sessions" vs "Agenda", "Presenters" vs "Speakers")
 */

export const extractionPrompts = {
    /**
     * Semantic-aware description extraction
     * Focuses on event-specific content and ignores navigation/footer
     */
    description: `Extract a clear, concise description of the event from the page content.

Focus on:
- Event overview and purpose
- Key objectives and highlights
- Target audience
- What attendees will learn or gain

Ignore:
- Navigation elements, menus, footers
- Sidebars and related event boxes
- Technical metadata
- Repeated headers

Return only the most relevant event description. If multiple descriptions exist, combine them into one comprehensive overview. Keep it concise (2-5 sentences max).`,

    /**
     * Event timing extraction with timezone awareness
     */
    eventTiming: `Extract the event's start and end times/dates.

Look for:
- Event date range or specific dates
- Start and end times
- Timezone information if available
- Multi-day event schedules

Return times in ISO 8601 format (YYYY-MM-DDTHH:MM:SS) if possible, with timezone.
For multi-day events, provide the overall start and end times.`,

    /**
     * Semantic agenda/sessions extraction
     * Handles variations: "Agenda", "Schedule", "Program", "Sessions", "Timetable", "Itinerary"
     * CRITICAL: Extract actual session times to help determine daily schedule
     */
    agenda: `CRITICAL: Extract all agenda items, sessions, or schedule entries from the page.

Look for sections labeled:
- Agenda
- Schedule
- Program
- Sessions
- Tracks
- Timetable
- Itinerary
- Breakout sessions
- Workshops
- Timeline

For each item, extract:
- Session/Activity title or name - REQUIRED
- Start time in 24-hour HH:MM format (e.g., "09:00", "14:30") or ISO timestamp - REQUIRED when available
- End time in 24-hour HH:MM format or ISO timestamp - REQUIRED when available
- Duration (if times not available, e.g., "60 minutes", "2 hours")
- Description, abstract, or summary
- Presenter/Speaker names (might be labeled as speakers, presenters, instructors, facilitators, hosts)
- Location/Room name
- Track or category (if multi-track event)
- Day number or date if multi-day event

IMPORTANT:
- Extract ACTUAL session times from the schedule content
- Times help determine daily schedule start/end times
- Include all sessions even if some details are missing
- Look for time patterns like "9:00 AM", "14:00", "2:30 PM"`,

    /**
     * Semantic speaker/presenter extraction
     * CRITICAL: Extract from speakers pages or agenda sessions
     */
    speakers: `CRITICAL: Extract all speakers, presenters, instructors, panelists, or experts featured at the event.

Look for sections labeled:
- Speakers
- Presenters
- Keynote speakers
- Instructors
- Facilitators
- Panelists
- Featured experts
- Bios
- Team
- Committee
- Our Speakers
- Meet the Speakers

Also extract speakers from agenda items/sessions if a dedicated speakers page isn't found.

For each person, extract:
- Full name - REQUIRED
- Job title or role
- Company or organization
- Professional bio or description
- LinkedIn profile URL
- Twitter/X handle or URL
- Website or personal blog URL
- Photo/headshot URL if available

IMPORTANT:
- Extract from speakers pages, agenda items, or session descriptions
- Handle variations in naming (full_name, firstName + lastName, etc.)
- Include all speakers even if some details are missing
- Deduplicate by name if speaker appears multiple times`,

    /**
     * Venue and location extraction
     */
    venue: `Extract location and venue information for the event.

Look for:
- Venue name
- Street address
- City/State/Province
- Country
- Postal code
- Map coordinates (latitude, longitude)
- Venue website or phone
- Directions/parking info

Even if only partial information is available, extract what you can find.`,

    /**
     * Pricing and ticket information extraction
     */
    pricing: `Extract pricing and ticketing information.

Look for:
- Ticket price or price range
- Currency (USD, EUR, GBP, etc.)
- Pricing tiers or levels
- Free/Paid status
- Early bird pricing
- VIP or premium options
- Registration/ticketing page URL

Standardize to provide minimum price, maximum price, currency, and pricing type (Free/Paid/Varies).`,

    /**
     * Daily schedule extraction for multi-day events
     * CRITICAL: Extract actual schedule times from schedule/agenda pages
     */
    dailySchedule: `CRITICAL: Extract the daily schedule for multi-day events.

Look for this information in:
- Schedule pages (/schedule, /agenda, /program)
- Agenda pages with day-by-day breakdown
- Event details pages showing daily timelines
- Registration pages with event timing

For each day, extract:
- Day number (1, 2, 3, etc.) - REQUIRED
- Date in YYYY-MM-DD format if available
- Start time in 24-hour HH:MM LOCAL time format (e.g., "09:00", "14:30") - REQUIRED
- End time in 24-hour HH:MM LOCAL time format (e.g., "17:00", "18:00") - REQUIRED
- Day label if available (e.g., "Day 1: Keynotes", "Monday Workshops")
- Any special notes or highlights

IMPORTANT: 
- Extract ACTUAL times from the page content, not defaults
- If times vary by day, include all days with their specific times
- If only start time or end time is available for a day, still include that day with the available time
- Look for phrases like "Day 1 runs from 9am to 5pm" or "Monday: 9:00-17:00"
- Return null only if no daily schedule information is found at all`,

    /**
     * Context-aware fallback prompt for missing fields
     * Used when specific extraction prompts don't yield results
     * PRIORITIZES: Daily schedule, speakers, agenda, start/end times
     */
    contextualFallback: `Review the page content for event information. PRIORITIZE extracting schedule, speakers, and agenda data.

Look for these key details in order of priority:
1. Daily schedule - Multi-day event daily start/end times (CRITICAL)
2. Agenda/Sessions - All sessions with times, speakers, descriptions (CRITICAL)
3. Speakers/Presenters - Full speaker list with bios and details (CRITICAL)
4. Event start and end times - Actual event times in ISO 8601 format (CRITICAL)
5. Event title or name
6. Location/venue
7. Event description or overview
8. Pricing or registration information

IMPORTANT:
- Look for schedule pages, agenda sections, or program details
- Extract ACTUAL times from schedule/agenda content, not placeholder times
- For multi-day events, extract daily schedule with start/end times for each day
- Extract speakers from dedicated pages, agenda items, or session descriptions
- Extract all agenda items/sessions with their times and speakers

Extract any structured data available. Handle variations in terminology and formatting.
For dates/times, prefer ISO 8601 format when possible, or 24-hour HH:MM format for daily schedule.`,

    /**
     * Description quality score prompt
     * Used to evaluate and improve description extraction
     */
    descriptionQuality: `Evaluate the quality of this event description:

Score criteria:
- Relevance: Does it focus on event-specific content? (ignore nav, footer, ads)
- Completeness: Does it cover what the event is about and who should attend?
- Conciseness: Is it a reasonable length without being too verbose?
- Accuracy: Is it factually correct based on the page content?

Return a score from 0-1 and suggest improvements if the description is low quality.`,

    /**
     * Multi-page context aggregation prompt
     * Used when combining data from multiple pages
     */
    multiPageAggregation: `Combine information from multiple pages of an event website.

The source pages may cover:
- Event overview/details
- Agenda/schedule
- Speakers/presenters
- Tickets/pricing
- Venue/location

Create a complete event data structure that merges all information from these pages.
When there are conflicts, prefer:
1. More recent/specific information
2. Official event pages over social media
3. Detailed content over summaries

Return complete event metadata including all extracted fields.`,
};

/**
 * Get semantic-aware JSON extraction schema
 * Includes alternate field names to handle terminology variations
 */
export function getSemanticEventSchema() {
    return {
        type: 'object' as const,
        properties: {
            description: {
                type: 'string',
                description:
                    'Event description focusing on content, not page structure. Should be concise and event-specific.',
            },
            startTime: {
                type: 'string',
                description:
                    'Event start date/time in ISO 8601 format (YYYY-MM-DDTHH:MM:SS) or readable format. Extract even if labeled as "Date", "When", "Begin", "Registration".',
            },
            endTime: {
                type: 'string',
                description:
                    'Event end date/time. Handle labels like "End", "Until", "Concludes", "Last day".',
            },
            agenda: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description:
                                'Session/activity title. Look for "Session", "Workshop", "Talk", "Panel", "Break", "Keynote".',
                        },
                        startTime: {
                            type: 'string',
                            description: 'Start time in HH:MM (24-hour) or ISO format.',
                        },
                        endTime: {
                            type: 'string',
                            description: 'End time in HH:MM (24-hour) or ISO format.',
                        },
                        duration: {
                            type: 'string',
                            description: 'Duration if times not available (e.g., "60 minutes").',
                        },
                        description: {
                            type: 'string',
                            description: 'Session description, abstract, or summary.',
                        },
                        speakers: {
                            type: 'array',
                            items: { type: 'string' },
                            description:
                                'Speaker/presenter names. Even if labeled as "Facilitator", "Instructor", "Host".',
                        },
                        location: {
                            type: 'string',
                            description: 'Room, hall, or venue for this session.',
                        },
                        track: {
                            type: 'string',
                            description: 'Track category for multi-track conferences.',
                        },
                    },
                },
                description:
                    'Agenda items, sessions, or schedule entries. Look for any of: Agenda, Schedule, Program, Sessions, Tracks, Timetable.',
            },
            speakers: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Full speaker name.',
                        },
                        title: {
                            type: 'string',
                            description: 'Job title or role (CEO, Engineer, etc.).',
                        },
                        company: {
                            type: 'string',
                            description: 'Organization or company name.',
                        },
                        bio: {
                            type: 'string',
                            description: 'Professional biography or background.',
                        },
                        linkedinUrl: {
                            type: 'string',
                            description: 'LinkedIn profile URL.',
                        },
                        twitterUrl: {
                            type: 'string',
                            description: 'Twitter/X profile URL or handle.',
                        },
                        photoUrl: {
                            type: 'string',
                            description: 'URL to speaker headshot or photo.',
                        },
                        websiteUrl: {
                            type: 'string',
                            description: 'Personal website or blog URL.',
                        },
                    },
                },
                description:
                    'Featured speakers or presenters. Look for: Speakers, Presenters, Keynotes, Instructors, Facilitators, Panelists.',
            },
            venue: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Venue name.' },
                    address: { type: 'string', description: 'Street address.' },
                    city: { type: 'string', description: 'City.' },
                    state_province: { type: 'string', description: 'State or province.' },
                    country: { type: 'string', description: 'Country.' },
                    latitude: { type: 'number', description: 'Latitude coordinate.' },
                    longitude: { type: 'number', description: 'Longitude coordinate.' },
                },
                description: 'Event venue and location details.',
            },
            pricing: {
                type: 'object',
                properties: {
                    priceMin: {
                        type: 'number',
                        description: 'Minimum ticket price.',
                    },
                    priceMax: {
                        type: 'number',
                        description: 'Maximum ticket price.',
                    },
                    currency: {
                        type: 'string',
                        description: 'Currency code (USD, EUR, GBP, etc.).',
                    },
                    pricingType: {
                        type: 'string',
                        enum: ['Free', 'Paid', 'Varies'],
                        description: 'Whether event is free, paid, or has varying prices.',
                    },
                },
                description: 'Pricing and ticket information.',
            },
            imageUrl: {
                type: 'string',
                description:
                    'Event image URL (from Open Graph, hero image, or featured image). Prefer high-quality images.',
            },
            dailySchedule: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        dayNumber: {
                            type: 'number',
                            description: 'Day number (1, 2, 3, ...). REQUIRED. Extract from schedule pages or agenda.',
                        },
                        date: {
                            type: 'string',
                            description: 'Date in YYYY-MM-DD format if available on the page.',
                        },
                        startTime: {
                            type: 'string',
                            description:
                                'Daily start time in 24-hour HH:MM LOCAL time format (e.g., "09:00", "14:30"). REQUIRED. Extract ACTUAL times from schedule/agenda pages, not defaults.',
                        },
                        endTime: {
                            type: 'string',
                            description:
                                'Daily end time in 24-hour HH:MM LOCAL time format (e.g., "17:00", "18:00"). REQUIRED when available. Extract ACTUAL times from schedule/agenda pages.',
                        },
                        dayLabel: {
                            type: 'string',
                            description: 'Optional day label (e.g., "Day 1: Keynotes", "Monday Workshops").',
                        },
                        notes: {
                            type: 'string',
                            description: 'Optional notes or highlights for this day.',
                        },
                    },
                    required: ['dayNumber', 'startTime'],
                },
                description:
                    'CRITICAL: For multi-day events, extract daily schedule from schedule/agenda pages. Include each day with actual start/end times. If times vary by day, include all days.',
            },
        },
    };
}
