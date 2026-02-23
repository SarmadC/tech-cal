'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Globe } from '@/components/ui/globe';
import { cn } from '@/lib/utils';

interface CityData {
    city: string;
    slug: string;
    count: number;
    lat: number | null;
    lng: number | null;
    events: { title: string; slug: string; date: string }[];
}

interface InteractiveGlobeSectionProps {
    topCities: CityData[];
    className?: string;
}

type MappedCityData = CityData & { lat: number; lng: number };

export function InteractiveGlobeSection({ topCities, className }: InteractiveGlobeSectionProps) {
    const [focusedCity, setFocusedCity] = useState<CityData | null>(null);
    const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const dialogTitleId = useId();
    const dialogDescriptionId = useId();

    const leaderboardCities = useMemo(() => topCities.slice(0, 10), [topCities]);
    const mappedCities = useMemo(
        () =>
            topCities.filter(
                (city): city is MappedCityData => city.lat != null && city.lng != null
            ),
        [topCities]
    );

    useEffect(() => {
        if (!selectedCity) return;

        closeButtonRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelectedCity(null);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [selectedCity]);

    const openCityPanel = (city: CityData) => {
        setFocusedCity(city);
        setSelectedCity(city);
    };
    const closeCityPanel = () => setSelectedCity(null);

    return (
        <section className={cn("col-span-1 xl:col-span-7 bg-background-secondary/50 border border-border-default rounded-2xl p-0 shadow-sm flex flex-col overflow-hidden relative min-h-[500px]", className)}>
            <div
                className={cn(
                    'absolute top-6 left-6 z-20 flex flex-col gap-4 max-w-xs w-full transition-opacity duration-300',
                    selectedCity
                        ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto'
                        : 'opacity-100'
                )}
            >
                <div className="p-0 bg-transparent pointer-events-auto">
                    <h2 className="text-sm font-semibold text-foreground-primary mb-1 px-2">
                        Global Tech Hubs
                    </h2>
                    <p className="text-sm text-foreground-secondary mb-6 px-2">
                        Select a city to view events.
                    </p>

                    <ul className="flex flex-col max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {leaderboardCities.map((city, idx) => {
                            const isActive =
                                focusedCity?.city === city.city ||
                                selectedCity?.city === city.city;

                            return (
                                <li key={city.slug}>
                                    <button
                                        type="button"
                                        aria-pressed={selectedCity?.city === city.city}
                                        aria-label={`${city.city}, ${city.count} confirmed events`}
                                        onClick={() => openCityPanel(city)}
                                        onMouseEnter={() => {
                                            if (!selectedCity) setFocusedCity(city);
                                        }}
                                        onMouseLeave={() => {
                                            if (!selectedCity) setFocusedCity(null);
                                        }}
                                        onFocus={() => {
                                            if (!selectedCity) setFocusedCity(city);
                                        }}
                                        onBlur={() => {
                                            if (!selectedCity) setFocusedCity(null);
                                        }}
                                        className={cn(
                                            'w-full flex items-center justify-between py-3 px-2 transition-all duration-200 border-b border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                                            isActive
                                                ? 'bg-foreground-primary/10'
                                                : 'hover:bg-background-tertiary/40'
                                        )}
                                    >
                                        <span className="flex items-center gap-4 min-w-0">
                                            <span
                                                className={cn(
                                                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0',
                                                    idx < 3
                                                        ? 'bg-foreground-primary text-background-main'
                                                        : 'bg-background-tertiary text-foreground-tertiary'
                                                )}
                                            >
                                                {idx + 1}
                                            </span>
                                            <span
                                                className={cn(
                                                    'text-sm font-medium transition-colors truncate',
                                                    isActive || idx < 3
                                                        ? 'text-foreground-primary'
                                                        : 'text-foreground-secondary'
                                                )}
                                            >
                                                {city.city}
                                            </span>
                                        </span>
                                        <span className="flex items-center gap-1.5 shrink-0">
                                            <span
                                                className={cn(
                                                    'text-xs font-semibold',
                                                    idx < 3
                                                        ? 'text-foreground-primary'
                                                        : 'text-foreground-secondary'
                                                )}
                                            >
                                                {city.count}
                                            </span>
                                            <span className="text-[10px] text-foreground-secondary uppercase">
                                                events
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            <AnimatePresence>
                {selectedCity && (
                    <motion.button
                        type="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute inset-0 z-20 bg-background-main/45 md:hidden"
                        aria-label="Close city events panel"
                        onClick={closeCityPanel}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedCity && (
                    <motion.div
                        key="city-events-panel"
                        role="dialog"
                        aria-modal={true}
                        aria-labelledby={dialogTitleId}
                        aria-describedby={dialogDescriptionId}
                        initial={{ opacity: 0, y: 24, x: 16, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, x: 16, scale: 0.99 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
                        className="absolute z-30 left-3 right-3 bottom-3 md:top-4 md:bottom-4 md:left-auto md:right-4 md:w-[22rem] md:max-w-[calc(100%-2rem)] xl:w-full xl:max-w-sm bg-background-secondary/95 backdrop-blur-md border border-border-default rounded-xl shadow-2xl flex flex-col max-h-[78%] md:max-h-none"
                    >
                        <div className="p-5 border-b border-border-subtle flex items-start justify-between bg-background-tertiary/80 rounded-t-xl">
                            <div>
                                <h3
                                    id={dialogTitleId}
                                    className="text-xl font-bold text-foreground-primary flex items-center gap-2"
                                >

                                    {selectedCity.city}
                                </h3>
                                <p
                                    id={dialogDescriptionId}
                                    className="text-sm text-foreground-tertiary mt-1"
                                >
                                    {selectedCity.count} events upcoming in 2026
                                </p>
                            </div>
                            <button
                                ref={closeButtonRef}
                                onClick={closeCityPanel}
                                className="p-2 hover:bg-background-main/60 rounded-full text-foreground-tertiary hover:text-foreground-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                aria-label={`Close ${selectedCity.city} events panel`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 custom-scrollbar">
                            {selectedCity.events.length > 0 ? (
                                <div className="flex flex-col">
                                    {selectedCity.events.map((event) => (
                                        <Link
                                            key={event.slug}
                                            href={`/events/${event.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group relative flex flex-col gap-1 border-b border-border-subtle last:border-0 py-3 px-2 transition-all hover:bg-white/[0.02]"
                                        >
                                            <h4 className="text-sm font-medium text-foreground-primary group-hover:text-primary transition-colors pr-4">
                                                {event.title}
                                            </h4>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs text-foreground-tertiary">

                                                    <span>
                                                        {new Date(event.date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </span>
                                                </div>
                                                <ArrowRight className="w-3.5 h-3.5 text-foreground-tertiary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-foreground-tertiary text-sm">
                                    <p>No confirmed events listed yet.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-border-subtle bg-background-tertiary/70 rounded-b-xl">
                            <Link
                                href={`/events/cities/${selectedCity.slug}`}
                                className="flex items-center justify-center w-full px-4 py-2 bg-foreground-primary hover:opacity-90 text-background-main text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                            >
                                View full calendar
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-grow flex items-center justify-center bg-background-tertiary/40 relative cursor-grab active:cursor-grabbing">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background-main/30 pointer-events-none" />
                <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-gradient-to-r from-background-secondary/40 to-transparent z-10 pointer-events-none" />

                <motion.div
                    className="w-full h-full min-h-[500px] flex items-center justify-center will-change-transform"
                    animate={
                        selectedCity
                            ? { x: '-20%', scale: 0.92, opacity: 0.48 }
                            : { x: '16%', scale: 1, opacity: 1 }
                    }
                    transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 1 }}
                >
                    <Globe
                        locations={mappedCities.map((city) => ({
                            lat: city.lat,
                            lng: city.lng,
                            size: 0.1 + (city.count / 50) * 0.1,
                        }))}
                        focusOn={
                            selectedCity && selectedCity.lat != null && selectedCity.lng != null
                                ? { lat: selectedCity.lat, lng: selectedCity.lng }
                                : focusedCity && focusedCity.lat != null && focusedCity.lng != null
                                    ? { lat: focusedCity.lat, lng: focusedCity.lng }
                                    : null
                        }
                    />
                </motion.div>
            </div>
        </section>
    );
}
