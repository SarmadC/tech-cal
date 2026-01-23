'use client';

import { useTheme } from 'next-themes';

/**
 * Centralized theme utilities for timeline components
 * Provides consistent theme-aware classes and utilities
 */
export function useTimelineTheme() {
    const { resolvedTheme } = useTheme();
    // Use resolvedTheme to correctly handle 'system' preference
    const isDark = resolvedTheme === 'dark';
    
    return {
        isDark,
        
        // Text colors
        textPrimary: isDark ? 'text-white' : 'text-gray-900',
        textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
        textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
        textLight: isDark ? 'text-gray-500' : 'text-gray-400',
        
        // Background colors
        bgCard: isDark ? 'bg-gray-800/40' : 'bg-gray-50/80',
        bgCardHover: isDark ? 'bg-gray-800/60' : 'bg-gray-100/80',
        bgElevated: isDark ? 'bg-gray-800/60' : 'bg-white/80',
        bgMuted: isDark ? 'bg-gray-900/20' : 'bg-gray-100/50',
        
        // Border colors
        borderCard: isDark ? 'border-gray-700/60' : 'border-gray-200/60',
        borderLight: isDark ? 'border-gray-600/40' : 'border-gray-300/40',
        borderDashed: isDark ? 'border-dashed border-gray-600/40' : 'border-dashed border-gray-300/40',
        
        // Interactive states
        hoverCard: isDark ? 'hover:bg-gray-800/60' : 'hover:bg-gray-100/80',
        hoverText: isDark ? 'hover:text-gray-200' : 'hover:text-gray-700',
        hoverBorder: isDark ? 'hover:border-gray-600' : 'hover:border-gray-300',
        
        // Special elements
        timelineConnector: isDark ? 'bg-gray-600' : 'bg-gray-400',
        timelineLine: isDark ? 'bg-gray-700' : 'bg-gray-300',
        emptyStateIcon: isDark ? 'text-gray-500' : 'text-gray-400',
        
        // Modal/Dialog
        modalBg: isDark ? 'bg-[#030303]' : 'bg-white',
        modalBorder: isDark ? 'border-gray-700' : 'border-gray-200',
        modalText: isDark ? 'text-white' : 'text-gray-900',
        modalTextSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
        
        // Action Buttons
        btnPrimary: isDark ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
        btnSecondary: isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-400',
        btnDanger: isDark ? 'bg-red-900/20 hover:bg-red-900/30 text-red-400 border-red-800/50' : 'bg-red-100 hover:bg-red-200 text-red-800 border-red-200',
        btnSuccess: isDark ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : 'bg-green-600 hover:bg-green-700 text-white border-green-600',
        btnWarning: isDark ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600' : 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600',
        
        // Status Colors
        statusSuccess: isDark ? 'text-green-400' : 'text-green-600',
        statusWarning: isDark ? 'text-yellow-400' : 'text-yellow-600',
        statusError: isDark ? 'text-red-400' : 'text-red-600',
        statusInfo: isDark ? 'text-blue-400' : 'text-blue-600',
        
        // Error States
        errorBg: isDark ? 'bg-red-500/10' : 'bg-red-50',
        errorText: isDark ? 'text-red-300' : 'text-red-700',
        errorBorder: isDark ? 'border-red-800/50' : 'border-red-200',
    };
}
