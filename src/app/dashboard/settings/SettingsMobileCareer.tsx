'use client';

import CareerProfileManager from '@/components/profile/CareerProfileManager';

export default function SettingsMobileCareer() {
    return (
        <div className="space-y-6">
            {/* 
                CareerProfileManager is complex and responsive. 
                We wrap it to ensure it inherits any necessary mobile contexts or spacing overrides.
                Currently it handles its own Bento grid which stacks on mobile.
                We might just need to ensure the container is clean.
             */}
            <div className="mobile-career-wrapper">
                {/* Explicitly override some internal paddings if necessary via global styles scoped to this wrapper */}
                <style jsx global>{`
                    .mobile-career-wrapper .career-profile-manager {
                        background: transparent !important;
                        padding: 0 !important;
                    }
                    /* Ensure card backgrounds match the mobile settings theme if they don't already */
                    .mobile-career-wrapper .bg-zinc-900\\/50 {
                        background-color: #141415 !important;
                        border-color: #222 !important;
                    }
                 `}</style>
                <CareerProfileManager />
            </div>
        </div>
    );
}
