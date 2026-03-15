'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, SignOut } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { formatCompactCount } from '@/utils/numberFormatting';

interface CircleContextCardProps {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isJoined: boolean;
  href: string;
  onJoinToggle: (circleId: string, join: boolean) => Promise<boolean>;
}

export default function CircleContextCard({
  id,
  name,
  description,
  memberCount,
  isJoined: initialIsJoined,
  href,
  onJoinToggle,
}: CircleContextCardProps) {
  const [isJoined, setIsJoined] = useState(initialIsJoined);
  const [isLoading, setIsLoading] = useState(false);
  const inFlightRef = useRef(false);
  const router = useRouter();

  const handleToggle = async () => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setIsLoading(true);

    try {
      const success = await onJoinToggle(id, !isJoined);

      if (success) {
        setIsJoined(!isJoined);
        router.refresh();
      }
    } finally {
      setIsLoading(false);
      inFlightRef.current = false;
    }
  };

  return (
    <section className="space-y-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          Circle
        </p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {name}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {description || 'Join the discussion happening in this circle.'}
        </p>
      </div>

      <div className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300">
        {formatCompactCount(memberCount)} members
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={href}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
        >
          <ArrowLeft size={14} />
          Back to discussions
        </Link>

        <Button
          onClick={handleToggle}
          disabled={isLoading}
          variant={isJoined ? "outline" : "default"}
          size="sm"
          className={`group h-9 rounded-full px-4 text-sm ${isJoined
            ? 'border-zinc-200 text-zinc-600 hover:border-red-400 hover:text-red-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:text-red-400'
            : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
            }`}
        >
          {isLoading ? '...' : isJoined ? (
            <>
              <span className="flex items-center gap-1.5 group-hover:hidden">
                <Check size={14} /> Joined
              </span>
              <span className="hidden items-center gap-1.5 group-hover:flex">
                <SignOut size={14} /> Leave
              </span>
            </>
          ) : 'Join circle'}
        </Button>
      </div>
    </section>
  );
}
