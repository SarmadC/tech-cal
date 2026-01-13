'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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

    const setAccent = (newAccent: AccentColor) => {
        setAccentState(newAccent);
        localStorage.setItem('techcal-accent', newAccent);
        document.documentElement.setAttribute('data-accent', newAccent);
    };

    // Avoid hydration mismatch by not rendering until mounted if needed, 
    // but here we just need to provide the context. 
    // The effect handles the attribute.

    return (
        <AccentContext.Provider value={{ accent, setAccent }}>
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
