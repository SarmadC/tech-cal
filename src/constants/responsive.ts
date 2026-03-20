export const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    mobileMaxWidth: 430,
} as const;

export function isMobileViewportWidth(width: number): boolean {
    return width < BREAKPOINTS.mobile;
}

export function isTabletViewportWidth(width: number): boolean {
    return width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
}

export function isDesktopViewportWidth(width: number): boolean {
    return width >= BREAKPOINTS.tablet;
}
