import { useState, useCallback } from 'react';

export function useScrollCollapse(
  _scrollContainerRef: React.RefObject<HTMLElement | null>,
  _calendarRef: React.RefObject<HTMLElement | null>
) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);
  
  return { isCollapsed, toggleCollapse };
}
