import { isValidUsernameFormat } from '@kurecal/domain';
import { useEffect, useMemo, useState } from 'react';

import { checkMobileUsernameAvailability } from '../lib/mobileApi';

export type UsernameAvailabilityState =
  | { kind: 'idle'; message: null }
  | { kind: 'invalid'; message: string }
  | { kind: 'checking'; message: string }
  | { kind: 'available'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string };

const formatMessage =
  'Use 3–30 characters: start with a letter, then letters, numbers, _ or -.';

export function useUsernameAvailability(username: string | null | undefined) {
  const normalizedUsername = useMemo(() => username?.trim() ?? '', [username]);
  const [state, setState] = useState<UsernameAvailabilityState>({
    kind: 'idle',
    message: null,
  });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!normalizedUsername) {
      setState({ kind: 'idle', message: null });
      return;
    }

    if (!isValidUsernameFormat(normalizedUsername)) {
      setState({ kind: 'invalid', message: formatMessage });
      return;
    }

    let active = true;
    setState({ kind: 'checking', message: 'Checking availability…' });
    const timeout = setTimeout(() => {
      void checkMobileUsernameAvailability(normalizedUsername)
        .then((result) => {
          if (!active) return;
          setState({
            kind: result.available ? 'available' : 'unavailable',
            message: result.message,
          });
        })
        .catch(() => {
          if (!active) return;
          setState({
            kind: 'error',
            message: 'Unable to check availability. Try again.',
          });
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [normalizedUsername, requestVersion]);

  return {
    normalizedUsername,
    refreshAvailability: () => setRequestVersion((version) => version + 1),
    state,
  };
}
