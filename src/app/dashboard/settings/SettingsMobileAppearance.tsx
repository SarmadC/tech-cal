'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { useAccent } from '@/contexts/AccentContext';

const ACCENT_COLORS = [
    { id: 'blue', label: 'Default Blue', value: '#3b82f6' },
    { id: 'purple', label: 'Purple', value: '#8b5cf6' },
    { id: 'orange', label: 'Orange', value: '#f97316' },
    { id: 'teal', label: 'Teal', value: '#14b8a6' },
    { id: 'emerald', label: 'Emerald', value: '#10b981' },
] as const;

export default function SettingsMobileAppearance() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();
    const { accent, setAccent } = useAccent();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const currentTheme = theme || 'system';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Theme Section */}
            <div>
                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                    Interface Theme
                </h3>

                <div className="grid grid-cols-3 gap-3">
                    {/* Light Theme Card */}
                    <button
                        onClick={() => setTheme('light')}
                        className={`group relative flex flex-col items-center gap-3 transition-all duration-200 ${currentTheme === 'light' ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                            }`}
                    >
                        <div className={`w-full aspect-[3/4] rounded-xl border-2 transition-all overflow-hidden relative shadow-sm ${currentTheme === 'light'
                            ? 'border-[var(--accent-primary)] shadow-[0_0_0_2px_rgba(var(--accent-primary),0.2)]'
                            : 'border-[var(--mono-border-default)] bg-[#E5E5E5]'
                            }`} style={currentTheme === 'light' ? { borderColor: 'var(--accent-primary)' } : {}}>
                            {/* Mini UI Representation (Light) */}
                            <div className="absolute inset-0 bg-white flex flex-col">
                                <div className="h-2 w-full border-b border-zinc-100 mt-2 px-1 flex items-center gap-0.5">
                                    <div className="h-1 w-1 rounded-full bg-zinc-200"></div>
                                    <div className="h-1 w-1 rounded-full bg-zinc-200"></div>
                                </div>
                                <div className="flex-1 p-1.5 flex gap-1">
                                    <div className="w-1/4 h-full bg-zinc-50 rounded-[2px]"></div>
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="h-2 w-3/4 bg-zinc-100 rounded-[2px]"></div>
                                        <div className="h-8 w-full bg-zinc-50 rounded-[2px] border border-zinc-100"></div>
                                        <div className="h-2 w-1/2 bg-zinc-100 rounded-[2px]"></div>
                                    </div>
                                </div>
                            </div>

                            {currentTheme === 'light' && (
                                <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-transform bg-[var(--accent-primary)]">
                                    <MaterialIcon name="check" size={12} className="text-white" />
                                </div>
                            )}
                        </div>
                        <span className={`text-[13px] font-medium transition-colors ${currentTheme === 'light' ? 'text-[var(--mono-text-primary)]' : 'text-[var(--mono-text-secondary)]'
                            }`}>Light</span>
                    </button>

                    {/* Dark Theme Card */}
                    <button
                        onClick={() => setTheme('dark')}
                        className={`group relative flex flex-col items-center gap-3 transition-all duration-200 ${currentTheme === 'dark' ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                            }`}
                    >
                        <div className={`w-full aspect-[3/4] rounded-xl border-2 transition-all overflow-hidden relative shadow-sm ${currentTheme === 'dark'
                            ? 'border-[var(--accent-primary)] shadow-[0_0_0_2px_rgba(var(--accent-primary),0.2)]'
                            : 'border-[var(--mono-border-default)] bg-[#1A1A1C]'
                            }`} style={currentTheme === 'dark' ? { borderColor: 'var(--accent-primary)' } : {}}>
                            {/* Mini UI Representation (Dark) */}
                            <div className="absolute inset-0 bg-[#0F0F10] flex flex-col">
                                <div className="h-2 w-full border-b border-white/5 mt-2 px-1 flex items-center gap-0.5">
                                    <div className="h-1 w-1 rounded-full bg-white/10"></div>
                                    <div className="h-1 w-1 rounded-full bg-white/10"></div>
                                </div>
                                <div className="flex-1 p-1.5 flex gap-1">
                                    <div className="w-1/4 h-full bg-white/5 rounded-[2px]"></div>
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="h-2 w-3/4 bg-white/10 rounded-[2px]"></div>
                                        <div className="h-8 w-full bg-white/5 rounded-[2px] border border-white/5"></div>
                                        <div className="h-2 w-1/2 bg-white/10 rounded-[2px]"></div>
                                    </div>
                                </div>
                            </div>

                            {currentTheme === 'dark' && (
                                <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-transform bg-[var(--accent-primary)]">
                                    <MaterialIcon name="check" size={12} className="text-white" />
                                </div>
                            )}
                        </div>
                        <span className={`text-[13px] font-medium transition-colors ${currentTheme === 'dark' ? 'text-[var(--mono-text-primary)]' : 'text-[var(--mono-text-secondary)]'
                            }`}>Dark</span>
                    </button>

                    {/* System Theme Card */}
                    <button
                        onClick={() => setTheme('system')}
                        className={`group relative flex flex-col items-center gap-3 transition-all duration-200 ${currentTheme === 'system' ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                            }`}
                    >
                        <div className={`w-full aspect-[3/4] rounded-xl border-2 transition-all overflow-hidden relative shadow-sm ${currentTheme === 'system'
                            ? 'border-[var(--accent-primary)] shadow-[0_0_0_2px_rgba(var(--accent-primary),0.2)]'
                            : 'border-[var(--mono-border-default)] bg-[#111]'
                            }`} style={currentTheme === 'system' ? { borderColor: 'var(--accent-primary)' } : {}}>
                            {/* Mini UI Representation (Split) */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-[#0F0F10] to-40%">
                                <div className="absolute inset-0 bg-[#0F0F10]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
                                {/* Center Icon */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-sm">
                                        <MaterialIcon name="settings" size={16} className="text-white drop-shadow-md" />
                                    </div>
                                </div>
                            </div>

                            {currentTheme === 'system' && (
                                <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-transform bg-[var(--accent-primary)]">
                                    <MaterialIcon name="check" size={12} className="text-white" />
                                </div>
                            )}
                        </div>
                        <span className={`text-[13px] font-medium transition-colors ${currentTheme === 'system' ? 'text-[var(--mono-text-primary)]' : 'text-[var(--mono-text-secondary)]'
                            }`}>System</span>
                    </button>
                </div>
            </div>

            {/* Accent Color Section */}
            <div>
                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                    Interface Accent
                </h3>
                {/* REFINEMENT: Centered content with justify-center */}
                <div className="rounded-lg bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)] p-4 flex items-center justify-center gap-5">
                    {ACCENT_COLORS.map((color) => (
                        <button
                            key={color.id}
                            onClick={() => setAccent(color.id)}
                            className="relative group focus:outline-none flex items-center justify-center"
                            aria-label={`Select ${color.label} accent`}
                        >
                            <div
                                className={`w-8 h-8 rounded-full transition-transform duration-200 ${accent === color.id ? 'scale-90' : 'scale-100 hover:scale-105'
                                    }`}
                                style={{ backgroundColor: color.value }}
                            />
                            {accent === color.id && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <MaterialIcon name="check" size={14} className="text-white drop-shadow-sm" />
                                </div>
                            )}
                            {/* REFINEMENT: Centered Ring with Offset */}
                            {accent === color.id && (
                                <div
                                    className="absolute -inset-1 rounded-full border-[2px] pointer-events-none"
                                    style={{
                                        borderColor: color.value,
                                    }}
                                />
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-[12px] text-[var(--mono-text-tertiary)] mt-2 px-1">
                    This color will be used for buttons, links, and active states.
                </p>
            </div>
        </div>
    );
}
