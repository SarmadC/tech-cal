import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Animated } from 'react-native';

type TabBarVisibilityContextValue = {
  animatedValue: Animated.Value;
  handleScroll: (offsetY: number) => void;
  isVisible: boolean;
  showTabBar: () => void;
  resetScrollTracking: () => void;
};

const HIDE_THRESHOLD = 16;
const SHOW_THRESHOLD = 8;

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(null);
const fallbackAnimatedValue = new Animated.Value(1);
const fallbackContext: TabBarVisibilityContextValue = {
  animatedValue: fallbackAnimatedValue,
  handleScroll: () => {},
  isVisible: true,
  showTabBar: () => {},
  resetScrollTracking: () => {},
};

export function TabBarVisibilityProvider({ children }: PropsWithChildren) {
  const animatedValue = useRef(new Animated.Value(1)).current;
  const visibleRef = useRef(true);
  const lastOffsetRef = useRef(0);
  const [isVisible, setIsVisible] = useState(true);

  const animateTo = useCallback(
    (nextVisible: boolean) => {
      if (visibleRef.current === nextVisible) {
        return;
      }

      visibleRef.current = nextVisible;
      setIsVisible(nextVisible);
      Animated.spring(animatedValue, {
        toValue: nextVisible ? 1 : 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
      }).start();
    },
    [animatedValue]
  );

  const handleScroll = useCallback(
    (offsetY: number) => {
      const clampedOffset = Math.max(0, offsetY);
      const delta = clampedOffset - lastOffsetRef.current;
      lastOffsetRef.current = clampedOffset;

      if (clampedOffset <= 8) {
        animateTo(true);
        return;
      }

      if (delta > HIDE_THRESHOLD) {
        animateTo(false);
        return;
      }

      if (delta < -SHOW_THRESHOLD) {
        animateTo(true);
      }
    },
    [animateTo]
  );

  const showTabBar = useCallback(() => {
    animateTo(true);
  }, [animateTo]);

  const resetScrollTracking = useCallback(() => {
    lastOffsetRef.current = 0;
  }, []);

  const value = useMemo(
    () => ({
      animatedValue,
      handleScroll,
      isVisible,
      showTabBar,
      resetScrollTracking,
    }),
    [animatedValue, handleScroll, isVisible, resetScrollTracking, showTabBar]
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const context = useContext(TabBarVisibilityContext);
  return context ?? fallbackContext;
}
