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

    /**
     * High-precision extraction prompt for TechMeme-sourced destinations
     * Focuses on factual fidelity and anti-hallucination for the extract API
     */
    techMemeExtract: `You are parsing an event page reached from a TechMeme listing. Extract ONLY facts explicitly present on the page or embedded structured data. If a value is missing, leave it null/omitted instead of guessing.

Return JSON that strictly matches the provided schema.

Rules:
- Prefer structured data (JSON-LD, microdata, RDFa). If multiple sources conflict, pick the most specific event page over summaries.
- Event timing must include timezone when present. Use ISO 8601 (e.g. 2025-08-04T09:00:00-07:00).
- Agenda times must be local HH:MM (24-hour). If only “9:00 AM” is shown, convert to 09:00.
- Speakers require exact display names. Do not invent social links or companies.
- Price fields must be numbers. Strip currency symbols. If a range is given, set both min and max.
- Never infer start/end dates from context like blog timestamps. Extract only explicit event details.
- Capture the canonical/registration URLs exactly as shown.

If information is repeated across sections, keep the most complete version. Omit marketing fluff, navigation, unrelated news, or historical recaps.`,
};

/**
 * Get semantic-aware JSON extraction schema
 * Includes alternate field names to handle terminology variations
 */
export function getSemanticEventSchema() {
    return {
        type: 'object' as const,
        properties: {
            event: {
                type: 'object' as const,
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    startDateTime: {
                        type: 'string',
                        description: 'ISO 8601 date-time with timezone when present.',
                    },
                    endDateTime: { type: 'string' },
                    timezone: {
                        type: 'string',
                        description: 'IANA timezone identifier if explicitly stated.',
                    },
                    status: { type: 'string' },
                    format: { type: 'string' },
                    location: {
                        type: 'object' as const,
                        properties: {
                            venue: { type: 'string' },
                            address: { type: 'string' },
                            city: { type: 'string' },
                            country: { type: 'string' },
                            virtualPlatform: { type: 'string' },
                        },
                    },
                    registrationUrl: { type: 'string' },
                    agendaUrl: { type: 'string' },
                    priceMin: { type: 'number' },
                    priceMax: { type: 'number' },
                    currency: { type: 'string' },
                    language: { type: 'string' },
                    difficulty: { type: 'string' },
                    targetAudience: { type: 'string' },
                },
                required: ['title', 'startDateTime'],
            },
            speakers: {
                type: 'array' as const,
                items: {
                    type: 'object' as const,
                    properties: {
                        name: { type: 'string' },
                        title: { type: 'string' },
                        company: { type: 'string' },
                        bio: { type: 'string' },
                        photoUrl: { type: 'string' },
                        linkedin: { type: 'string' },
                        twitter: { type: 'string' },
                        website: { type: 'string' },
                    },
                    required: ['name'],
                },
            },
            agenda: {
                type: 'array' as const,
                items: {
                    type: 'object' as const,
                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        dayNumber: { type: 'integer', minimum: 1 },
                        startTimeLocal: {
                            type: 'string',
                            description: 'Local start time, HH:mm or ISO.',
                        },
                        endTimeLocal: { type: 'string' },
                        durationMinutes: { type: 'integer' },
                        location: { type: 'string' },
                        track: { type: 'string' },
                        type: { type: 'string' },
                        speakers: {
                            type: 'array' as const,
                            items: { type: 'string' },
                        },
                    },
                    required: ['title', 'startTimeLocal'],
                },
            },
            source: {
                type: 'object' as const,
                properties: {
                    finalUrl: { type: 'string' },
                    sourceUrl: { type: 'string' },
                    ogUrl: { type: 'string' },
                },
            },
        },
        required: ['event'],
    };
}
