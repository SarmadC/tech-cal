'use client';

import React from 'react';

interface DiscoveryLayoutProps {
    sidebar: React.ReactNode;
    header: React.ReactNode;
    children: React.ReactNode;
    resultCount?: number;
    sortOption?: React.ReactNode;
    isSidebarOpen?: boolean;
    onSidebarClose?: () => void;
    className?: string; // Add className prop
    minHeightClassName?: string;
}

const DiscoveryLayout: React.FC<DiscoveryLayoutProps> = ({
    sidebar,
    header,
    children,
    resultCount,
    sortOption,
    isSidebarOpen,
    onSidebarClose,
    className = '', // swift-default
    minHeightClassName = 'min-h-screen'
}) => {
    return (
        <div className={`${minHeightClassName} bg-transparent p-4 lg:p-6 transition-colors ${className}`}>
            <div className="max-w-[1600px] mx-auto">

                {/* Header Section */}
                <div className="mb-6 lg:mb-8">
                    {/* Top Bar - Simplified/Removed "Jobseeker" header to fit app context better, 
              or we can keep a minimal version if desired. 
              For now, just the search/filter header. */}
                    {header}
                </div>

                <div className="flex flex-col gap-6 lg:flex-row">
                    {/* Sidebar - Desktop */}
                    <div className="hidden lg:block">
                        {sidebar}
                    </div>

                    {/* Sidebar - Mobile Overlay */}
                    {isSidebarOpen && (
                        <div className="fixed inset-0 z-50 lg:hidden">
                            {/* Backdrop */}
                            <div
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                                onClick={onSidebarClose}
                            />
                            {/* Drawer */}
                            <div className="absolute inset-y-0 left-0 w-[85vw] max-w-[320px] bg-background shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-semibold">Filters</h2>
                                        <button
                                            onClick={onSidebarClose}
                                            className="p-2 rounded-full hover:bg-muted transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                    {sidebar}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="flex-1 px-1 md:px-0 pb-6 lg:pb-7 pt-2 lg:pt-0 transition-colors">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Events <span className="text-muted-foreground/60">({resultCount || 0})</span>
                            </h2>

                            {sortOption && (
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {sortOption}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscoveryLayout;
