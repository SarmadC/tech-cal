'use client';

import type { VenueData, RelationshipsState, LookupData } from '../types';

interface VenueSectionProps {
    venueData: VenueData;
    setVenueData: React.Dispatch<React.SetStateAction<VenueData>>;
    relationships: RelationshipsState;
    setRelationships: React.Dispatch<React.SetStateAction<RelationshipsState>>;
    lookupData: LookupData;
    isCreatingVenue: boolean;
    setIsCreatingVenue: React.Dispatch<React.SetStateAction<boolean>>;
}

export function VenueSection({
    venueData,
    setVenueData,
    relationships,
    setRelationships,
    lookupData,
    isCreatingVenue,
    setIsCreatingVenue,
}: VenueSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-lg font-medium text-foreground-primary">Venue</h3>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="flex items-center space-x-2 mb-4 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isCreatingVenue}
                            onChange={(e) => setIsCreatingVenue(e.target.checked)}
                            className="rounded border-default bg-background-tertiary text-accent-primary focus:ring-0"
                        />
                        <span className="text-sm text-foreground-tertiary">Create New Venue</span>
                    </label>
                    {!isCreatingVenue && (
                        <select
                            value={relationships.venue_id || ''}
                            onChange={(e) => setRelationships(prev => ({ ...prev, venue_id: e.target.value || null }))}
                            className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                        >
                            <option value="" className="bg-background-main">Select Existing Venue</option>
                            {lookupData.venues.map(venue => (
                                <option key={venue.id} value={venue.id} className="bg-background-main">
                                    {venue.name} {venue.city ? `(${venue.city})` : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                {isCreatingVenue && (
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Venue Name</label>
                            <input
                                type="text"
                                placeholder="Venue Name"
                                value={venueData.name}
                                onChange={(e) => setVenueData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Address</label>
                            <textarea
                                placeholder="Full Address"
                                value={venueData.address}
                                onChange={(e) => setVenueData(prev => ({ ...prev, address: e.target.value }))}
                                className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">City</label>
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={venueData.city}
                                    onChange={(e) => setVenueData(prev => ({ ...prev, city: e.target.value }))}
                                    className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">State/Province</label>
                                <input
                                    type="text"
                                    placeholder="State"
                                    value={venueData.state_province}
                                    onChange={(e) => setVenueData(prev => ({ ...prev, state_province: e.target.value }))}
                                    className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Country</label>
                            <input
                                type="text"
                                placeholder="Country"
                                value={venueData.country}
                                onChange={(e) => setVenueData(prev => ({ ...prev, country: e.target.value }))}
                                className="w-full bg-transparent border-b border-default px-0 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
