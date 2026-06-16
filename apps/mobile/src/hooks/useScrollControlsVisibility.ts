import { useCallback, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { useTabBarVisibility } from "../context/TabBarVisibilityContext";

interface UseScrollControlsVisibilityOptions {
  onBeforeVisibilityChange?: (visible: boolean) => void;
  onOffsetChange?: (offsetY: number) => void;
  onVisibilityChange?: (visible: boolean) => void;
}

export function useScrollControlsVisibility({
  onBeforeVisibilityChange,
  onOffsetChange,
  onVisibilityChange,
}: UseScrollControlsVisibilityOptions = {}) {
  const { setVisible: setTabBarVisible } = useTabBarVisibility();
  const controlsVisibleRef = useRef(true);
  const lastOffsetRef = useRef(0);

  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
      const delta = offsetY - lastOffsetRef.current;
      lastOffsetRef.current = offsetY;
      onOffsetChange?.(offsetY);

      let nextVisible: boolean | null = null;
      if (offsetY <= 8 && !controlsVisibleRef.current) {
        nextVisible = true;
      } else if (delta > 12 && offsetY > 40 && controlsVisibleRef.current) {
        nextVisible = false;
      } else if (delta < -8 && !controlsVisibleRef.current) {
        nextVisible = true;
      }

      if (nextVisible === null) {
        return;
      }

      onBeforeVisibilityChange?.(nextVisible);
      controlsVisibleRef.current = nextVisible;
      onVisibilityChange?.(nextVisible);
      setTabBarVisible(nextVisible);
    },
    [
      onBeforeVisibilityChange,
      onOffsetChange,
      onVisibilityChange,
      setTabBarVisible,
    ],
  );
}
