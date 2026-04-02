'use client';

import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const EVENT_TYPES = [
    { value: 'tech_event', label: 'Tech Event' },
    { value: 'hackathon', label: 'Hackathon' },
    { value: 'meetup', label: 'Meetup' },
    { value: 'conference', label: 'Conference' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'other', label: 'Other' },
];

const EVENT_FORMATS = ['In-person', 'Online', 'Hybrid'] as const;
const EVENT_PATTERNS = ['single', 'multi_day', 'all_day', 'custom'] as const;
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const PRICING_TYPES = ['Free', 'Paid', 'Varies'] as const;

interface FormState {
    title: string;
    description: string;
    event_type: string;
    organizer_name: string;
    organizer_description: string;
    organizer_website_url: string;
    organizer_logo_url: string;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    timezone: string;
    event_format: (typeof EVENT_FORMATS)[number];
    location: string;
    location_city: string;
    location_state: string;
    location_country: string;
    virtual_platform: string;
    event_pattern: '' | (typeof EVENT_PATTERNS)[number];
    is_multi_day: boolean;
    language: string;
    difficulty_level: '' | (typeof DIFFICULTY_LEVELS)[number];
    capacity: string;
    attendee_count: string;
    certificate_offered: boolean;
    recording_available: boolean;
    social_media_hashtag: string;
    target_audience: string;
    prerequisites: string;
    accessibility_captioning: boolean;
    accessibility_sign_language: boolean;
    accessibility_translator: boolean;
    source_url: string;
    registration_url: string;
    livestream_url: string;
    event_image_url: string;
    agenda_url: string;
    pricing_type: '' | (typeof PRICING_TYPES)[number];
    price_min: string;
    price_max: string;
    currency: string;
    registration_deadline: string;
    speaker_names_input: string;
    tags_input: string;
    series_name: string;
    series_description: string;
    series_website_url: string;
}

const createInitialState = (initialOrganizerName: string): FormState => ({
    title: '',
    description: '',
    event_type: 'tech_event',
    organizer_name: initialOrganizerName,
    organizer_description: '',
    organizer_website_url: '',
    organizer_logo_url: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    timezone: '',
    event_format: 'In-person',
    location: '',
    location_city: '',
    location_state: '',
    location_country: '',
    virtual_platform: '',
    event_pattern: '',
    is_multi_day: false,
    language: '',
    difficulty_level: '',
    capacity: '',
    attendee_count: '',
    certificate_offered: false,
    recording_available: false,
    social_media_hashtag: '',
    target_audience: '',
    prerequisites: '',
    accessibility_captioning: false,
    accessibility_sign_language: false,
    accessibility_translator: false,
    source_url: '',
    registration_url: '',
    livestream_url: '',
    event_image_url: '',
    agenda_url: '',
    pricing_type: '',
    price_min: '',
    price_max: '',
    currency: '',
    registration_deadline: '',
    speaker_names_input: '',
    tags_input: '',
    series_name: '',
    series_description: '',
    series_website_url: '',
});

function combineDateTime(date: string, time: string): string | null {
    if (!date || !time) return null;
    return `${date}T${time}:00`;
}

interface FieldProps {
    label: string;
    required?: boolean;
    children: ReactNode;
    hint?: string;
    htmlFor?: string;
}

function Field({ label, required, children, hint, htmlFor }: FieldProps) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={htmlFor} className="text-[13px] font-medium text-white/70">
                {label}
                {required && <span className="ml-0.5 text-rose-400">*</span>}
            </label>
            {children}
            {hint && <p className="text-[11px] text-white/35">{hint}</p>}
        </div>
    );
}

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div>
                <h3 className="text-sm font-medium uppercase tracking-wide text-white/60">{title}</h3>
                {description && <p className="mt-1 text-sm text-white/45">{description}</p>}
            </div>
            {children}
        </div>
    );
}

const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 transition-colors focus:outline-none focus:border-white/30';

const checkboxClass =
    'h-4 w-4 rounded border-white/20 bg-white/5 text-white focus:ring-white/30 focus:ring-offset-0';

export default function SubmitEventForm({
    initialOrganizerName,
}: {
    initialOrganizerName: string;
}) {
    const router = useRouter();
    const [form, setForm] = useState<FormState>(() => createInitialState(initialOrganizerName));
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showOptional, setShowOptional] = useState(false);

    const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
        setForm((current) => ({ ...current, [field]: value }));

    const resetForm = () => {
        setForm(createInitialState(initialOrganizerName));
        setErrors({});
        setShowOptional(false);
        setSuccess(false);
    };

    const requiresPhysicalLocation = form.event_format !== 'Online';

    const validate = (): boolean => {
        const nextErrors: typeof errors = {};

        if (!form.title.trim()) nextErrors.title = 'Title is required';
        if (!form.start_date) nextErrors.start_date = 'Start date is required';
        if (!form.start_time) nextErrors.start_time = 'Start time is required';
        if (!form.organizer_name.trim()) nextErrors.organizer_name = 'Organizer name is required';
        if (requiresPhysicalLocation && !form.location.trim()) {
            nextErrors.location = 'Location is required for in-person or hybrid events';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const tags = form.tags_input
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);
            const speakerLineup = form.speaker_names_input
                .split('\n')
                .map((name) => name.trim())
                .filter(Boolean)
                .map((name) => ({ name }));
            const accessibilityFeatures =
                form.accessibility_captioning || form.accessibility_sign_language || form.accessibility_translator
                    ? {
                        captioning: form.accessibility_captioning,
                        sign_language: form.accessibility_sign_language,
                        translator: form.accessibility_translator,
                    }
                    : null;

            const response = await fetch('/api/events/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title.trim(),
                    description: form.description.trim() || null,
                    event_type: form.event_type,
                    organizer_name: form.organizer_name.trim(),
                    organizer_details: {
                        description: form.organizer_description.trim() || null,
                        website_url: form.organizer_website_url.trim() || null,
                        logo_url: form.organizer_logo_url.trim() || null,
                    },
                    start_date: combineDateTime(form.start_date, form.start_time),
                    end_date: combineDateTime(form.end_date, form.end_time),
                    timezone: form.timezone.trim() || null,
                    event_format: form.event_format,
                    is_virtual: form.event_format === 'Online',
                    location: form.location.trim() || null,
                    location_city: form.location_city.trim() || null,
                    location_state: form.location_state.trim() || null,
                    location_country: form.location_country.trim() || null,
                    virtual_platform: form.virtual_platform.trim() || null,
                    event_pattern: form.event_pattern || null,
                    is_multi_day: form.is_multi_day,
                    language: form.language.trim() || null,
                    difficulty_level: form.difficulty_level || null,
                    capacity: form.capacity.trim() || null,
                    attendee_count: form.attendee_count.trim() || null,
                    certificate_offered: form.certificate_offered,
                    recording_available: form.recording_available,
                    social_media_hashtag: form.social_media_hashtag.trim() || null,
                    target_audience: form.target_audience.trim() || null,
                    prerequisites: form.prerequisites.trim() || null,
                    accessibility_features: accessibilityFeatures,
                    source_url: form.source_url.trim() || null,
                    registration_url: form.registration_url.trim() || null,
                    livestream_url: form.livestream_url.trim() || null,
                    event_image_url: form.event_image_url.trim() || null,
                    agenda_url: form.agenda_url.trim() || null,
                    pricing_type: form.pricing_type || null,
                    price_min: form.price_min.trim() || null,
                    price_max: form.price_max.trim() || null,
                    currency: form.currency.trim() || null,
                    registration_deadline: form.registration_deadline.trim() || null,
                    speaker_lineup: speakerLineup,
                    tags,
                    series_details: {
                        name: form.series_name.trim() || null,
                        description: form.series_description.trim() || null,
                        website_url: form.series_website_url.trim() || null,
                    },
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Submission failed');
            }

            setSuccess(true);
        } catch (err) {
            setErrors({
                title: err instanceof Error ? err.message : 'Submission failed',
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                    <MaterialIcon name="check" size={24} className="text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white">Submission received</h2>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">
                        We&apos;ll review the event before publishing it. If you left external links blank,
                        attendees will RSVP on Kure-Cal after approval.
                    </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                        variant="ghost"
                        className="border border-white/10 text-white/70 hover:text-white"
                        onClick={resetForm}
                    >
                        Submit another
                    </Button>
                    <Button
                        className="bg-white/10 text-white hover:bg-white/15"
                        onClick={() => router.push('/events')}
                    >
                        Browse events
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm leading-relaxed text-sky-100/80">
                <p className="font-medium text-sky-100">No website needed.</p>
                <p className="mt-1">
                    This form mirrors our extraction template. Start with the basics, then add as much
                    structured detail as you know. More context means a better event page and better
                    matching for attendees.
                </p>
            </div>

            <div className="space-y-5 rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <h2 className="text-sm font-medium uppercase tracking-wide text-white/60">Core event fields</h2>

                <Field label="Event title" required htmlFor="submit-event-title">
                    <input
                        id="submit-event-title"
                        type="text"
                        value={form.title}
                        onChange={(e) => update('title', e.target.value)}
                        placeholder="e.g. AI Builders Night"
                        className={cn(inputClass, errors.title && 'border-rose-500/50')}
                    />
                    {errors.title && <p className="mt-1 text-[11px] text-rose-400">{errors.title}</p>}
                </Field>

                <Field label="Event type" required>
                    <div className="flex flex-wrap gap-2">
                        {EVENT_TYPES.map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => update('event_type', type.value)}
                                className={cn(
                                    'rounded-lg border px-3 py-1.5 text-[13px] transition-colors',
                                    form.event_type === type.value
                                        ? 'border-white/30 bg-white/10 text-white'
                                        : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                                )}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </Field>

                <Field label="Organizer name" required htmlFor="submit-event-organizer-name">
                    <input
                        id="submit-event-organizer-name"
                        type="text"
                        value={form.organizer_name}
                        onChange={(e) => update('organizer_name', e.target.value)}
                        placeholder="Who is organizing this event?"
                        className={cn(inputClass, errors.organizer_name && 'border-rose-500/50')}
                    />
                    {errors.organizer_name && (
                        <p className="mt-1 text-[11px] text-rose-400">{errors.organizer_name}</p>
                    )}
                </Field>

                <Field label="Format" required>
                    <div className="flex flex-wrap gap-2">
                        {EVENT_FORMATS.map((format) => (
                            <button
                                key={format}
                                type="button"
                                onClick={() => update('event_format', format)}
                                className={cn(
                                    'rounded-lg border px-3 py-1.5 text-[13px] transition-colors',
                                    form.event_format === format
                                        ? 'border-white/30 bg-white/10 text-white'
                                        : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                                )}
                            >
                                {format}
                            </button>
                        ))}
                    </div>
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Start date" required htmlFor="submit-event-start-date">
                        <input
                            id="submit-event-start-date"
                            type="date"
                            value={form.start_date}
                            onChange={(e) => update('start_date', e.target.value)}
                            className={cn(inputClass, errors.start_date && 'border-rose-500/50')}
                        />
                        {errors.start_date && (
                            <p className="mt-1 text-[11px] text-rose-400">{errors.start_date}</p>
                        )}
                    </Field>
                    <Field label="Start time" required htmlFor="submit-event-start-time">
                        <input
                            id="submit-event-start-time"
                            type="time"
                            value={form.start_time}
                            onChange={(e) => update('start_time', e.target.value)}
                            className={cn(inputClass, errors.start_time && 'border-rose-500/50')}
                        />
                        {errors.start_time && (
                            <p className="mt-1 text-[11px] text-rose-400">{errors.start_time}</p>
                        )}
                    </Field>
                </div>

                <Field
                    label="Full location"
                    required={requiresPhysicalLocation}
                    htmlFor="submit-event-location"
                    hint={
                        form.event_format === 'Online'
                            ? 'Optional for online events. Use it only if there is a meeting place.'
                            : 'Include venue name, city, or full address.'
                    }
                >
                    <input
                        id="submit-event-location"
                        type="text"
                        value={form.location}
                        onChange={(e) => update('location', e.target.value)}
                        placeholder={
                            form.event_format === 'Online'
                                ? 'Optional meeting link or host space'
                                : 'e.g. Startup Edmonton, 10359 104 St NW, Edmonton'
                        }
                        className={cn(inputClass, errors.location && 'border-rose-500/50')}
                    />
                    {errors.location && <p className="mt-1 text-[11px] text-rose-400">{errors.location}</p>}
                </Field>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <button
                    type="button"
                    onClick={() => setShowOptional((current) => !current)}
                    className="flex w-full items-center justify-between text-left"
                    aria-expanded={showOptional}
                >
                    <div>
                        <h2 className="text-sm font-medium uppercase tracking-wide text-white/60">
                            Template-aligned optional fields
                        </h2>
                        <p className="mt-1 text-sm text-white/45">
                            Fill any fields you know from the event template: schedule, URLs, pricing,
                            audience, organizers, speakers, and series.
                        </p>
                    </div>
                    {showOptional ? (
                        <CaretUp size={20} className="text-white/50" />
                    ) : (
                        <CaretDown size={20} className="text-white/50" />
                    )}
                </button>

                {showOptional && (
                    <div className="mt-5 space-y-5">
                        <Section
                            title="Event"
                            description="Add the extra event fields we can preserve from the extraction template."
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="End date" htmlFor="submit-event-end-date">
                                    <input
                                        id="submit-event-end-date"
                                        type="date"
                                        value={form.end_date}
                                        onChange={(e) => update('end_date', e.target.value)}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="End time" htmlFor="submit-event-end-time">
                                    <input
                                        id="submit-event-end-time"
                                        type="time"
                                        value={form.end_time}
                                        onChange={(e) => update('end_time', e.target.value)}
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field
                                    label="Timezone"
                                    htmlFor="submit-event-timezone"
                                    hint="Use an IANA timezone if you know it, like America/Edmonton."
                                >
                                    <input
                                        id="submit-event-timezone"
                                        type="text"
                                        value={form.timezone}
                                        onChange={(e) => update('timezone', e.target.value)}
                                        placeholder="America/Edmonton"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Language" htmlFor="submit-event-language" hint="ISO 639-1 code if known.">
                                    <input
                                        id="submit-event-language"
                                        type="text"
                                        value={form.language}
                                        onChange={(e) => update('language', e.target.value)}
                                        placeholder="en"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="Description" htmlFor="submit-event-description">
                                <textarea
                                    id="submit-event-description"
                                    value={form.description}
                                    onChange={(e) => update('description', e.target.value)}
                                    placeholder="What should attendees expect?"
                                    rows={4}
                                    className={cn(inputClass, 'resize-none')}
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Event pattern" htmlFor="submit-event-pattern">
                                    <select
                                        id="submit-event-pattern"
                                        value={form.event_pattern}
                                        onChange={(e) => update('event_pattern', e.target.value as FormState['event_pattern'])}
                                        className={inputClass}
                                    >
                                        <option value="">Select a pattern</option>
                                        {EVENT_PATTERNS.map((pattern) => (
                                            <option key={pattern} value={pattern}>
                                                {pattern.replace('_', ' ')}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Difficulty level" htmlFor="submit-event-difficulty-level">
                                    <select
                                        id="submit-event-difficulty-level"
                                        value={form.difficulty_level}
                                        onChange={(e) =>
                                            update('difficulty_level', e.target.value as FormState['difficulty_level'])
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">Select difficulty</option>
                                        {DIFFICULTY_LEVELS.map((difficulty) => (
                                            <option key={difficulty} value={difficulty}>
                                                {difficulty}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Virtual platform" htmlFor="submit-event-virtual-platform">
                                    <input
                                        id="submit-event-virtual-platform"
                                        type="text"
                                        value={form.virtual_platform}
                                        onChange={(e) => update('virtual_platform', e.target.value)}
                                        placeholder="Zoom, Google Meet, Hopin"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Is multi-day?" htmlFor="submit-event-is-multi-day">
                                    <label
                                        htmlFor="submit-event-is-multi-day"
                                        className="flex h-[42px] items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 text-[13px] text-white/75"
                                    >
                                        <input
                                            id="submit-event-is-multi-day"
                                            type="checkbox"
                                            checked={form.is_multi_day}
                                            onChange={(e) => update('is_multi_day', e.target.checked)}
                                            className={checkboxClass}
                                        />
                                        This event runs across multiple days
                                    </label>
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field label="City" htmlFor="submit-event-location-city">
                                    <input
                                        id="submit-event-location-city"
                                        type="text"
                                        value={form.location_city}
                                        onChange={(e) => update('location_city', e.target.value)}
                                        placeholder="Edmonton"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="State / province" htmlFor="submit-event-location-state">
                                    <input
                                        id="submit-event-location-state"
                                        type="text"
                                        value={form.location_state}
                                        onChange={(e) => update('location_state', e.target.value)}
                                        placeholder="Alberta"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Country" htmlFor="submit-event-location-country">
                                    <input
                                        id="submit-event-location-country"
                                        type="text"
                                        value={form.location_country}
                                        onChange={(e) => update('location_country', e.target.value)}
                                        placeholder="Canada"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                        </Section>

                        <Section
                            title="URLs"
                            description="Leave the external links blank if the event should use native Kure-Cal RSVP."
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Source website" htmlFor="submit-event-source-url">
                                    <input
                                        id="submit-event-source-url"
                                        type="url"
                                        value={form.source_url}
                                        onChange={(e) => update('source_url', e.target.value)}
                                        placeholder="https://your-event-site.com"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Registration URL" htmlFor="submit-event-registration-url">
                                    <input
                                        id="submit-event-registration-url"
                                        type="url"
                                        value={form.registration_url}
                                        onChange={(e) => update('registration_url', e.target.value)}
                                        placeholder="https://tickets.example.com"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Livestream URL" htmlFor="submit-event-livestream-url">
                                    <input
                                        id="submit-event-livestream-url"
                                        type="url"
                                        value={form.livestream_url}
                                        onChange={(e) => update('livestream_url', e.target.value)}
                                        placeholder="https://youtube.com/live/..."
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Agenda URL" htmlFor="submit-event-agenda-url">
                                    <input
                                        id="submit-event-agenda-url"
                                        type="url"
                                        value={form.agenda_url}
                                        onChange={(e) => update('agenda_url', e.target.value)}
                                        placeholder="https://example.com/schedule"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="Event image URL" htmlFor="submit-event-image-url">
                                <input
                                    id="submit-event-image-url"
                                    type="url"
                                    value={form.event_image_url}
                                    onChange={(e) => update('event_image_url', e.target.value)}
                                    placeholder="https://example.com/banner.jpg"
                                    className={inputClass}
                                />
                            </Field>
                        </Section>

                        <Section
                            title="Pricing"
                            description="These fields are optional, but they help us present the event clearly."
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Pricing type" htmlFor="submit-event-pricing-type">
                                    <select
                                        id="submit-event-pricing-type"
                                        value={form.pricing_type}
                                        onChange={(e) => update('pricing_type', e.target.value as FormState['pricing_type'])}
                                        className={inputClass}
                                    >
                                        <option value="">Select pricing</option>
                                        {PRICING_TYPES.map((pricingType) => (
                                            <option key={pricingType} value={pricingType}>
                                                {pricingType}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Currency" htmlFor="submit-event-currency">
                                    <input
                                        id="submit-event-currency"
                                        type="text"
                                        value={form.currency}
                                        onChange={(e) => update('currency', e.target.value)}
                                        placeholder="USD or CAD"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Minimum price" htmlFor="submit-event-price-min">
                                    <input
                                        id="submit-event-price-min"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.price_min}
                                        onChange={(e) => update('price_min', e.target.value)}
                                        placeholder="0"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Maximum price" htmlFor="submit-event-price-max">
                                    <input
                                        id="submit-event-price-max"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.price_max}
                                        onChange={(e) => update('price_max', e.target.value)}
                                        placeholder="250"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field
                                label="Registration deadline"
                                htmlFor="submit-event-registration-deadline"
                                hint="Optional. Use the last date and time attendees can register."
                            >
                                <input
                                    id="submit-event-registration-deadline"
                                    type="datetime-local"
                                    value={form.registration_deadline}
                                    onChange={(e) => update('registration_deadline', e.target.value)}
                                    className={inputClass}
                                />
                            </Field>
                        </Section>

                        <Section
                            title="Audience & logistics"
                            description="These fields help attendees understand who the event is for and what to expect."
                        >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Capacity" htmlFor="submit-event-capacity">
                                    <input
                                        id="submit-event-capacity"
                                        type="number"
                                        min="0"
                                        value={form.capacity}
                                        onChange={(e) => update('capacity', e.target.value)}
                                        placeholder="100"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Expected attendee count" htmlFor="submit-event-attendee-count">
                                    <input
                                        id="submit-event-attendee-count"
                                        type="number"
                                        min="0"
                                        value={form.attendee_count}
                                        onChange={(e) => update('attendee_count', e.target.value)}
                                        placeholder="75"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="Target audience" htmlFor="submit-event-target-audience">
                                <textarea
                                    id="submit-event-target-audience"
                                    value={form.target_audience}
                                    onChange={(e) => update('target_audience', e.target.value)}
                                    placeholder="Software engineers, founders, CTOs"
                                    rows={3}
                                    className={cn(inputClass, 'resize-none')}
                                />
                            </Field>

                            <Field label="Prerequisites" htmlFor="submit-event-prerequisites">
                                <textarea
                                    id="submit-event-prerequisites"
                                    value={form.prerequisites}
                                    onChange={(e) => update('prerequisites', e.target.value)}
                                    placeholder="Laptop required, basic React knowledge, bring ID"
                                    rows={3}
                                    className={cn(inputClass, 'resize-none')}
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Social media hashtag" htmlFor="submit-event-social-hashtag">
                                    <input
                                        id="submit-event-social-hashtag"
                                        type="text"
                                        value={form.social_media_hashtag}
                                        onChange={(e) => update('social_media_hashtag', e.target.value)}
                                        placeholder="#AIBuildersNight"
                                        className={inputClass}
                                    />
                                </Field>
                                <div className="space-y-1.5">
                                    <span className="text-[13px] font-medium text-white/70">Attendee extras</span>
                                    <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-[13px] text-white/75">
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={form.certificate_offered}
                                                onChange={(e) => update('certificate_offered', e.target.checked)}
                                                className={checkboxClass}
                                            />
                                            Certificate offered
                                        </label>
                                        <label className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={form.recording_available}
                                                onChange={(e) => update('recording_available', e.target.checked)}
                                                className={checkboxClass}
                                            />
                                            Recording available
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <span className="text-[13px] font-medium text-white/70">Accessibility features</span>
                                <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-[13px] text-white/75">
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={form.accessibility_captioning}
                                            onChange={(e) => update('accessibility_captioning', e.target.checked)}
                                            className={checkboxClass}
                                        />
                                        Captioning
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={form.accessibility_sign_language}
                                            onChange={(e) => update('accessibility_sign_language', e.target.checked)}
                                            className={checkboxClass}
                                        />
                                        Sign language
                                    </label>
                                    <label className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={form.accessibility_translator}
                                            onChange={(e) => update('accessibility_translator', e.target.checked)}
                                            className={checkboxClass}
                                        />
                                        Translator
                                    </label>
                                </div>
                            </div>

                            <Field label="Speakers" htmlFor="submit-event-speakers" hint="One speaker name per line.">
                                <textarea
                                    id="submit-event-speakers"
                                    value={form.speaker_names_input}
                                    onChange={(e) => update('speaker_names_input', e.target.value)}
                                    placeholder={'Jane Doe\nAlex Kim'}
                                    rows={4}
                                    className={cn(inputClass, 'resize-none')}
                                />
                            </Field>

                            <Field
                                label="Tags"
                                htmlFor="submit-event-tags"
                                hint="Comma-separated technical tags like AI, Cloud, DevOps, React."
                            >
                                <input
                                    id="submit-event-tags"
                                    type="text"
                                    value={form.tags_input}
                                    onChange={(e) => update('tags_input', e.target.value)}
                                    placeholder="AI, Cloud, Product"
                                    className={inputClass}
                                />
                            </Field>
                        </Section>

                        <Section
                            title="Organizer & series"
                            description="If the event belongs to a known organizer or recurring series, capture it here."
                        >
                            <Field label="Organizer description" htmlFor="submit-event-organizer-description">
                                <textarea
                                    id="submit-event-organizer-description"
                                    value={form.organizer_description}
                                    onChange={(e) => update('organizer_description', e.target.value)}
                                    placeholder="What does the organizer do?"
                                    rows={3}
                                    className={cn(inputClass, 'resize-none')}
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Organizer website" htmlFor="submit-event-organizer-website">
                                    <input
                                        id="submit-event-organizer-website"
                                        type="url"
                                        value={form.organizer_website_url}
                                        onChange={(e) => update('organizer_website_url', e.target.value)}
                                        placeholder="https://organizer.com"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Organizer logo URL" htmlFor="submit-event-organizer-logo">
                                    <input
                                        id="submit-event-organizer-logo"
                                        type="url"
                                        value={form.organizer_logo_url}
                                        onChange={(e) => update('organizer_logo_url', e.target.value)}
                                        placeholder="https://organizer.com/logo.png"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Series name" htmlFor="submit-event-series-name">
                                    <input
                                        id="submit-event-series-name"
                                        type="text"
                                        value={form.series_name}
                                        onChange={(e) => update('series_name', e.target.value)}
                                        placeholder="AI Builders"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Series website" htmlFor="submit-event-series-website">
                                    <input
                                        id="submit-event-series-website"
                                        type="url"
                                        value={form.series_website_url}
                                        onChange={(e) => update('series_website_url', e.target.value)}
                                        placeholder="https://series.example.com"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="Series description" htmlFor="submit-event-series-description">
                                <textarea
                                    id="submit-event-series-description"
                                    value={form.series_description}
                                    onChange={(e) => update('series_description', e.target.value)}
                                    placeholder="Describe the recurring event series."
                                    rows={3}
                                    className={cn(inputClass, 'resize-none')}
                                />
                            </Field>
                        </Section>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <p className="text-xs leading-relaxed text-white/40">
                    Submissions are reviewed before publication. Please only submit events you organize or
                    events you have permission to share.
                </p>
                <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 w-full bg-white font-medium text-black hover:bg-white/90"
                >
                    {submitting ? 'Submitting…' : 'Submit event for review'}
                </Button>
            </div>
        </form>
    );
}
