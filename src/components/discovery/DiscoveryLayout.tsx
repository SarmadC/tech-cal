'use client';

import React from 'react';

interface DiscoveryLayoutProps {
    sidebar: React.ReactNode;
    header: React.ReactNode;
    children: React.ReactNode;
    resultCount?: number;
    sortOption?: React.ReactNode;
}

const DiscoveryLayout: React.FC<DiscoveryLayoutProps> = ({
    sidebar,
    header,
    children,
    resultCount,
    sortOption
}) => {
    return (
        <div className="min-h-screen bg-background/60 dark:bg-background/40 p-6 lg:p-8 backdrop-blur transition-colors">
            <div className="max-w-[1600px] mx-auto">

                {/* Header Section */}
                <div className="mb-8">
                    {/* Top Bar - Simplified/Removed "Jobseeker" header to fit app context better, 
              or we can keep a minimal version if desired. 
              For now, just the search/filter header. */}
                    {header}
                </div>

                <div className="flex flex-col gap-8 lg:flex-row">
                    {/* Sidebar */}
                    {sidebar}

                    {/* Main Content */}
                    <div className="flex-1 rounded-3xl border border-border/60 bg-card/80 dark:bg-card/20 p-6 shadow-lg backdrop-blur transition-colors">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                            <h2 className="text-xl font-semibold text-foreground">
                                Events Found <span className="text-muted-foreground font-normal">({resultCount || 0})</span>
                            </h2>

                            {sortOption && (
                                <div className="flex items-center gap-2">
                                    {sortOption}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscoveryLayout;
