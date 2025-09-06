'use client';

import { FC, useRef, useEffect, useCallback, useState } from 'react';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

export interface MobileAdvancedGesturesProps {
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onPinchIn?: () => void;
    onPinchOut?: () => void;
    onDoubleTap?: () => void;
    onLongPress?: () => void;
    onPullToRefresh?: () => void;
    children: React.ReactNode;
    className?: string;
    enablePullToRefresh?: boolean;
    enablePinch?: boolean;
    enableDoubleTap?: boolean;
    enableLongPress?: boolean;
    pullToRefreshThreshold?: number;
    longPressDelay?: number;
}

const MobileAdvancedGestures: FC<MobileAdvancedGesturesProps> = ({
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
    onPinchIn,
    onPinchOut,
    onDoubleTap,
    onLongPress,
    onPullToRefresh,
    children,
    className = '',
    enablePullToRefresh = true,
    enablePinch = false,
    enableDoubleTap = true,
    enableLongPress = true,
    pullToRefreshThreshold = 80,
    longPressDelay = 500
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
    const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);

    // Basic swipe gestures
    const swipeConfig = {
        onSwipeUp,
        onSwipeDown,
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
        preventScroll: false,
        enableMomentum: true,
    };

    const { swipeHandlers } = useSwipeGestures(swipeConfig);

    // Pull to refresh handler
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!enablePullToRefresh) return;
        
        const touch = e.touches[0];
        setTouchStart({
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        });

        // Long press detection
        if (enableLongPress && onLongPress) {
            const timer = setTimeout(() => {
                onLongPress();
            }, longPressDelay);
            setLongPressTimer(timer);
        }
    }, [enablePullToRefresh, enableLongPress, onLongPress, longPressDelay]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!enablePullToRefresh || !touchStart || isRefreshing) return;

        const touch = e.touches[0];
        const deltaY = touch.clientY - touchStart.y;
        const deltaX = touch.clientX - touchStart.x;

        // Only handle vertical pull from top
        if (deltaY > 0 && Math.abs(deltaX) < Math.abs(deltaY)) {
            const scrollTop = containerRef.current?.scrollTop || 0;
            
            if (scrollTop === 0) {
                e.preventDefault();
                const distance = Math.min(deltaY * 0.5, pullToRefreshThreshold * 1.5);
                setPullDistance(distance);
                setIsPulling(distance > 20);
            }
        }

        // Pinch gesture detection
        if (enablePinch && e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );

            if (lastPinchDistance !== null) {
                const delta = distance - lastPinchDistance;
                if (Math.abs(delta) > 10) {
                    if (delta > 0) {
                        onPinchOut?.();
                    } else {
                        onPinchIn?.();
                    }
                }
            }
            setLastPinchDistance(distance);
        }
    }, [enablePullToRefresh, enablePinch, touchStart, isRefreshing, pullToRefreshThreshold, lastPinchDistance, onPinchIn, onPinchOut]);

    const handleTouchEnd = useCallback(() => {
        if (!enablePullToRefresh) return;

        // Clear long press timer
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }

        // Handle pull to refresh
        if (isPulling && pullDistance > pullToRefreshThreshold) {
            setIsRefreshing(true);
            onPullToRefresh?.();
            
            // Simulate refresh completion
            setTimeout(() => {
                setIsRefreshing(false);
                setIsPulling(false);
                setPullDistance(0);
            }, 1000);
        } else {
            setIsPulling(false);
            setPullDistance(0);
        }

        setTouchStart(null);
        setLastPinchDistance(null);
    }, [enablePullToRefresh, isPulling, pullDistance, pullToRefreshThreshold, onPullToRefresh, longPressTimer]);

    // Double tap detection
    const handleTouchEndDoubleTap = useCallback((_e: React.TouchEvent) => {
        if (!enableDoubleTap || !onDoubleTap) return;

        const now = Date.now();
        const timeDiff = now - lastTap;
        
        if (timeDiff < 300) {
            onDoubleTap();
        }
        
        setLastTap(now);
    }, [enableDoubleTap, onDoubleTap, lastTap]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
            }
        };
    }, [longPressTimer]);

    // Combine touch handlers
    const combinedTouchHandlers = {
        ...swipeHandlers,
        onTouchStart: (e: React.TouchEvent) => {
            handleTouchStart(e);
            swipeHandlers.onTouchStart?.(e);
        },
        onTouchMove: (e: React.TouchEvent) => {
            handleTouchMove(e);
            swipeHandlers.onTouchMove?.(e);
        },
        onTouchEnd: (e: React.TouchEvent) => {
            handleTouchEnd();
            handleTouchEndDoubleTap(e);
            swipeHandlers.onTouchEnd?.();
        }
    };

    return (
        <div
            ref={containerRef}
            className={`mobile-advanced-gestures ${className}`}
            {...combinedTouchHandlers}
            style={{
                transform: isPulling ? `translateY(${Math.min(pullDistance, pullToRefreshThreshold)}px)` : 'none',
                transition: isPulling ? 'none' : 'transform 0.3s ease'
            }}
        >
            {/* Pull to refresh indicator */}
            {enablePullToRefresh && (
                <div 
                    className={`mobile-pull-refresh-indicator ${isPulling ? 'active' : ''} ${isRefreshing ? 'refreshing' : ''}`}
                    style={{
                        opacity: isPulling ? Math.min(pullDistance / pullToRefreshThreshold, 1) : 0,
                        transform: `translateY(${Math.min(pullDistance - pullToRefreshThreshold, 0)}px)`
                    }}
                >
                    <div className="mobile-pull-refresh-content">
                        {isRefreshing ? (
                            <>
                                <div className="mobile-refresh-spinner"></div>
                                <span>Refreshing...</span>
                            </>
                        ) : (
                            <>
                                <div className="mobile-pull-arrow">
                                    {pullDistance > pullToRefreshThreshold ? '↓' : '↑'}
                                </div>
                                <span>
                                    {pullDistance > pullToRefreshThreshold ? 'Release to refresh' : 'Pull to refresh'}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {children}
        </div>
    );
};

export default MobileAdvancedGestures;
