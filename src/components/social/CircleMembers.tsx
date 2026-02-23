import Image from 'next/image';
import Link from 'next/link';

interface CircleMember {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    headline: string | null;
}

interface CircleMembersProps {
    members: CircleMember[];
    totalMembers: number;
}

export default function CircleMembers({ members, totalMembers }: CircleMembersProps) {
    if (members.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Members <span className="text-zinc-500 font-normal">({totalMembers})</span>
                </h2>
                <div className="flex items-center gap-3 text-xs font-medium">
                    <button className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                        Invite
                    </button>
                    {totalMembers > members.length && (
                        <span className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer">
                            View all
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                {members.slice(0, 5).map((member, index) => {
                    const content = (
                        <>
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
                                {member.avatarUrl ? (
                                    <Image
                                        src={member.avatarUrl}
                                        alt={member.fullName || member.username || 'User Avatar'}
                                        width={32}
                                        height={32}
                                        className="w-full h-full object-cover"
                                        priority={index < 2}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-400 font-medium text-xs">
                                        {(member.fullName || member.username || '?').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                                    {member.fullName || member.username || 'Anonymous'}
                                </h3>
                                {member.headline && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                        {member.headline}
                                    </p>
                                )}
                            </div>
                        </>
                    );

                    const className = "group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors";

                    return member.username ? (
                        <Link key={member.id} href={`/u/${member.username}`} className={className}>
                            {content}
                        </Link>
                    ) : (
                        <div key={member.id} className={className}>
                            {content}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
