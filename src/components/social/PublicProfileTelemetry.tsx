'use client';

import { useEffect } from 'react';
import { sendTelemetryEvent } from '@/utils/telemetryClient';

interface PublicProfileTelemetryProps {
  profileUserId: string;
  username: string;
}

export default function PublicProfileTelemetry({
  profileUserId,
  username,
}: PublicProfileTelemetryProps) {
  useEffect(() => {
    void sendTelemetryEvent({
      eventType: 'profile_view',
      context: {
        surface: 'public_profile',
      },
      metadata: {
        profileUserId,
        username,
      },
    });
  }, [profileUserId, username]);

  return null;
}
