'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FollowButton from '@/components/social/FollowButton';
import type { CommunityLaunchpadMember } from '@/types/community';

interface MemberSuggestionRowProps {
    member: CommunityLaunchpadMember;
}

export default function MemberSuggestionRow({ member }: MemberSuggestionRowProps) {
    const initials = (member.fullName || member.username || 'U').slice(0, 2).toUpperCase();
    const profileHref = member.username ? `/u/${member.username}` : null;

    return (
        <div className="flex items-center justify-between gap-3 py-3 px-4 hover:bg-[var(--background-secondary)]/60 transition-colors border-b border-[var(--border-default)]/20">
            {/* Left: avatar + info */}
            <div className="flex items-center gap-3 min-w-0">
                {profileHref ? (
                    <Link href={profileHref} className="shrink-0">
                        <Avatar className="h-9 w-9 border border-[var(--border-default)]/40">
                            <AvatarImage src={member.avatarUrl || ''} alt={member.fullName || 'User'} />
                            <AvatarFallback className="text-[10px] bg-[var(--background-tertiary)] text-[var(--foreground-secondary)]">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                ) : (
                    <Avatar className="h-9 w-9 border border-[var(--border-default)]/40 shrink-0">
                        <AvatarImage src={member.avatarUrl || ''} alt={member.fullName || 'User'} />
                        <AvatarFallback className="text-[10px] bg-[var(--background-tertiary)] text-[var(--foreground-secondary)]">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                )}
                <div className="min-w-0">
                    {profileHref ? (
                        <Link
                            href={profileHref}
                            className="text-sm font-medium text-[var(--foreground-primary)] hover:underline truncate block"
                        >
                            {member.fullName || `@${member.username}`}
                        </Link>
                    ) : (
                        <span className="text-sm font-medium text-[var(--foreground-primary)] truncate block">
                            {member.fullName || 'Anonymous'}
                        </span>
                    )}
                    {member.headline && (
                        <p className="text-xs text-[var(--foreground-secondary)] truncate max-w-[280px] mt-0.5">
                            {member.headline}
                        </p>
                    )}
                </div>
            </div>

            {/* Right: follow */}
            <FollowButton
                userId={member.id}
                compact
                telemetrySurface="community_hub_suggested_member"
            />
        </div>
    );
}
