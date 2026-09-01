import { useEffect, useState } from 'react';

export function useDelayedLoading(active: boolean, delayMs = 6000) {
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    if (!active) {
      setIsDelayed(false);
      return;
    }

    const timeout = setTimeout(() => setIsDelayed(true), delayMs);
    return () => clearTimeout(timeout);
  }, [active, delayMs]);

  return isDelayed;
}
