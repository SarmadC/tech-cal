'use client';

import { useState } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { CommunityLaunchpadCircle } from '@/types/community';
import { MaterialIcon, type IconName } from '@/components/ui/Icon';

function formatCompact(value: number): string {
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);
}

// Derive a unique accent color from circle name
const CIRCLE_COLORS = [
    { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
    { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
    { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/20' },
    { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/20' },
];

function getCircleColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CIRCLE_COLORS[Math.abs(hash) % CIRCLE_COLORS.length];
}

// Derive a meaningful Phosphor icon from circle name keywords
const CIRCLE_NAME_ICON_MAP: [string[], IconName][] = [
    [['product', 'manager', 'pm'], 'work'],
    [['engineering', 'engineer', 'backend', 'infra'], 'code'],
    [['frontend', 'web', 'ui', 'css', 'html'], 'code'],
    [['ai', 'ml', 'machine learning', 'data', 'llm'], 'sparkle'],
    [['design', 'ux', 'figma', 'creative', 'visual'], 'palette'],
    [['startup', 'founder', 'entrepreneur', 'vc'], 'trophy'],
    [['mobile', 'ios', 'android', 'flutter'], 'users-three'],
    [['security', 'cyber', 'hack', 'devsecops'], 'globe'],
    [['cloud', 'devops', 'platform', 'sre'], 'globe'],
    [['gaming', 'game', 'unity', 'unreal'], 'game-controller'],
    [['audio', 'podcast', 'voice', 'speaker'], 'microphone'],
    [['photo', 'camera', 'video', 'media', 'film'], 'camera'],
    [['science', 'research', 'lab', 'bio', 'chem'], 'flask'],
    [['book', 'learn', 'education', 'course'], 'books'],
    [['health', 'wellness', 'mental', 'fitness'], 'heart'],
    [['web3', 'crypto', 'blockchain', 'nft', 'defi'], 'globe'],
    [['marketing', 'growth', 'seo', 'content'], 'lightning'],
    [['hardware', 'embedded', 'iot', 'robotics'], 'globe'],
];

function getCircleIcon(name: string, dbIcon?: string): IconName {
    if (dbIcon && dbIcon !== 'people') return dbIcon as IconName;
    const lower = name.toLowerCase();
    for (const [keywords, icon] of CIRCLE_NAME_ICON_MAP) {
        if (keywords.some((kw) => lower.includes(kw))) return icon;
    }
    return 'users-three';
}

interface CircleDiscoverCardProps {
    circle: CommunityLaunchpadCircle;
    onToggle: (circleId: string, isJoined: boolean) => Promise<void>;
}

export default function CircleDiscoverCard({ circle, onToggle }: CircleDiscoverCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [optimisticJoined, setOptimisticJoined] = useState(circle.isJoined);
    const color = getCircleColor(circle.name);

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLoading) return;

        const prevJoined = optimisticJoined;
        setIsLoading(true);
        setOptimisticJoined(!prevJoined);

        try {
            await onToggle(circle.id, prevJoined);
        } catch {
            setOptimisticJoined(prevJoined); // revert to original on error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="group relative flex-shrink-0 w-[240px] rounded-2xl border border-[var(--border-default)]/15 bg-[var(--background-secondary)]/10 p-5 flex flex-col gap-4 transition-all duration-300 hover:border-[var(--border-default)]/30 hover:bg-[var(--background-secondary)]/20 hover:-translate-y-1 hover:shadow-xl">
            {/* Header row: colored icon + join button */}
            <div className="flex items-start justify-between">
                <div className={`h-12 w-12 rounded-xl ${color.bg} flex items-center justify-center border ${color.border} transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
                    <MaterialIcon name={getCircleIcon(circle.name, circle.icon)} size={20} className={color.text} />
                </div>

                <Button
                    type="button"
                    size="sm"
                    variant={optimisticJoined ? 'outline' : 'default'}
                    className={`h-7 text-[10px] uppercase tracking-wider px-3 font-bold transition-all duration-200 active:scale-95 ${!optimisticJoined ? 'bg-zinc-900 border-zinc-800 text-white hover:bg-black' : 'border-[var(--border-default)]/20'
                        }`}
                    onClick={handleToggle}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <CircleNotch size={12} className="animate-spin" />
                    ) : optimisticJoined ? (
                        'Joined'
                    ) : (
                        'Join'
                    )}
                </Button>
            </div>

            {/* Name + description */}
            <div className="min-w-0 pr-1 mt-1">
                <h4 className="text-[15px] font-bold text-[var(--foreground-primary)] truncate transition-colors duration-200">
                    {circle.name}
                </h4>
                <p className="text-[12px] text-[var(--foreground-tertiary)] line-clamp-2 mt-1.5 leading-relaxed font-medium min-h-[3em]">
                    {circle.description || 'A community circle'}
                </p>
            </div>

            {/* Member count */}
            <div className="mt-auto pt-2">
                <p className="text-[11px] text-[var(--foreground-tertiary)] font-bold uppercase tracking-tight">
                    {circle.memberCount > 0 ? `${formatCompact(circle.memberCount)} members` : 'Just launched'}
                </p>
            </div>
        </div>
    );
}
