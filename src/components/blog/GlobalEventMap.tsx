"use client";

import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

type EventSummary = {
    title: string;
    date: string;
    location: string;
};

const geoUrl = "/maps/countries-110m.json";

// Approximate coordinates for the event locations in the 2026 guide
// [longitude, latitude]
const locationCoordinates: Record<string, [number, number]> = {
    "London, UK": [-0.1276, 51.5072],
    "San Francisco, USA": [-122.4194, 37.7749],
    "San Jose, USA": [-121.8863, 37.3382],
    "Las Vegas + Online": [-115.1398, 36.1699], // Handled variations
    "Prague, Czech Republic": [14.4378, 50.0755],
    "USA (historically San Francisco)": [-122.4194, 37.7749], // PyTorch
    "Salt Lake City, USA": [-111.8910, 40.7608],
    "Tokyo, Japan": [139.6917, 35.6895],
};

export function GlobalEventMap({ events }: { events: EventSummary[] }) {
    const markers = useMemo(() => {
        return events
            .filter(e => e.location && (locationCoordinates[e.location] || e.location.includes('USA')))
            .map(e => {
                let coords = locationCoordinates[e.location];
                if (!coords) {
                    // Fallback string matching if exact string doesn't match
                    if (e.location.includes('London')) coords = [-0.1276, 51.5072];
                    else if (e.location.includes('San Francisco')) coords = [-122.4194, 37.7749];
                    else if (e.location.includes('San Jose')) coords = [-121.8863, 37.3382];
                    else if (e.location.includes('Las Vegas')) coords = [-115.1398, 36.1699];
                    else if (e.location.includes('Prague')) coords = [14.4378, 50.0755];
                    else if (e.location.includes('Salt Lake City')) coords = [-111.8910, 40.7608];
                    else if (e.location.includes('Tokyo')) coords = [139.6917, 35.6895];
                    else coords = [-100, 40]; // Generic US if nothing else matches
                }

                return {
                    name: e.title.split(':')[0], // Short name
                    coordinates: coords
                };
            });
    }, [events]);

    if (!events || events.length === 0) return null;

    return (
        <div className="my-14 rounded-[12px] border border-white/10 bg-[#121315] shadow-sm overflow-hidden not-prose">
            <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                <h3 className="text-[18px] font-semibold text-zinc-100 !m-0 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    2026 Developer Circuit Global Map
                </h3>
                <p className="text-sm text-zinc-400 mt-2 !mb-0 max-w-xl">
                    A planetary view of where the tech community is gathering this year across the major technology hubs.
                </p>
            </div>
            <div className="w-full bg-[#0B0C0E] aspect-[2/1] relative">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 120, center: [10, 20] }}
                    className="w-full h-full"
                >
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies.map((geo) => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill="#1E2024"
                                    stroke="#2D3036"
                                    strokeWidth={0.5}
                                    style={{
                                        default: { outline: "none" },
                                        hover: { fill: "#2D3036", outline: "none" },
                                        pressed: { outline: "none" },
                                    }}
                                />
                            ))
                        }
                    </Geographies>
                    {markers.map(({ name, coordinates }) => (
                        <Marker key={name} coordinates={coordinates}>
                            <circle r={4} fill="#60A5FA" stroke="#1E3A8A" strokeWidth={1} />
                            <circle r={10} fill="#60A5FA" opacity={0.25} className="animate-pulse" />
                            <text
                                textAnchor="middle"
                                y={-12}
                                style={{
                                    fontFamily: "system-ui",
                                    fill: "#D4D4D8",
                                    fontSize: "10px",
                                    fontWeight: "600",
                                    filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.8))"
                                }}
                            >
                                {name}
                            </text>
                        </Marker>
                    ))}
                </ComposableMap>
            </div>
        </div>
    );
}
