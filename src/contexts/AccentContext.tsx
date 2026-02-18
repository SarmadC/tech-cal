'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';

type AccentColor = 'blue' | 'purple' | 'orange' | 'teal' | 'emerald';

interface AccentContextType {
    accent: AccentColor;
    setAccent: (accent: AccentColor) => void;
}

const AccentContext = createContext<AccentContextType | undefined>(undefined);

export function AccentProvider({ children }: { children: React.ReactNode }) {
    const [accent, setAccentState] = useState<AccentColor>('blue');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load saved accent
        const saved = localStorage.getItem('techcal-accent') as AccentColor;
        if (saved && ['blue', 'purple', 'orange', 'teal', 'emerald'].includes(saved)) {
            setAccentState(saved);
            document.documentElement.setAttribute('data-accent', saved);
        } else {
            // Default logic
            document.documentElement.setAttribute('data-accent', 'blue');
        }
    }, []);

    const setAccent = useCallback((newAccent: AccentColor) => {
        setAccentState(newAccent);
        localStorage.setItem('techcal-accent', newAccent);
        document.documentElement.setAttribute('data-accent', newAccent);
    }, []);

    const contextValue = useMemo(() => ({ accent, setAccent }), [accent, setAccent]);

    return (
        <AccentContext.Provider value={contextValue}>
            {children}
        </AccentContext.Provider>
    );
}

export function useAccent() {
    const context = useContext(AccentContext);
    if (context === undefined) {
        throw new Error('useAccent must be used within an AccentProvider');
    }
    return context;
}
