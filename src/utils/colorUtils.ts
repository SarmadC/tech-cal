/**
 * Converts RGB to HSL
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns HSL values as [h, s, l]
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Converts HSL to RGB
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns RGB values as [r, g, b]
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    s /= 100;
    l /= 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
        r = c; g = 0; b = x;
    }
    
    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

/**
 * Converts a color to a soft pastel version for dark mode
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns RGB values as [r, g, b]
 */
function toSoftPastel(r: number, g: number, b: number): [number, number, number] {
    const [h, s, l] = rgbToHsl(r, g, b);
    
    // For dark mode, make colors:
    // - Lighter (increase lightness to 70-75%)
    // - Softer (reduce saturation to 50-60%)
    const newS = Math.min(60, s * 0.85); // Reduce saturation for softness
    const newL = Math.max(70, Math.min(75, l * 1.3)); // Increase lightness for pastels
    
    return hslToRgb(h, newS, newL);
}

/**
 * Adds alpha/opacity to a color string (supports hex, rgb/rgba, and hsl/hsla formats)
 * @param color - Color string in hex (#RRGGBB), rgb/rgba, or hsl/hsla format
 * @param opacity - Opacity value between 0 and 1 (default: 0.2 for backgrounds)
 * @param isDark - Whether dark mode is active (converts to soft pastels if true)
 * @returns Color string with opacity applied
 */
export function addColorOpacity(color: string | undefined, opacity: number = 0.2, isDark: boolean = false): string {
    if (!color) {
        // Fallback color if no color provided
        return `rgba(59, 130, 246, ${opacity})`; // blue-500
    }

    let r = 0, g = 0, b = 0;

    // Handle hex colors (e.g., #D74442 or #D74)
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        
        // Expand shorthand hex (e.g., #D74 -> #DD7744)
        const fullHex = hex.length === 3 
            ? hex.split('').map(char => char + char).join('')
            : hex;
        
        r = parseInt(fullHex.substring(0, 2), 16);
        g = parseInt(fullHex.substring(2, 4), 16);
        b = parseInt(fullHex.substring(4, 6), 16);
    }
    // Handle hsl/hsla colors (e.g., hsl(1, 65%, 55%) or hsla(1, 65%, 55%, 1))
    else if (color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)/)) {
        const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)/);
        if (hslMatch) {
            const [, h, s, l] = hslMatch;
            [r, g, b] = hslToRgb(parseInt(h), parseInt(s), parseInt(l));
        }
    }
    // Handle rgb/rgba colors (e.g., rgb(215, 68, 66) or rgba(215, 68, 66, 1))
    else if (color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/)) {
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (rgbMatch) {
            [, r, g, b] = rgbMatch.map(v => parseInt(v || '0'));
        }
    } else {
        // If format is unrecognized, return a fallback
        console.warn(`Unrecognized color format: ${color}`);
        return `rgba(59, 130, 246, ${opacity})`; // blue-500 fallback
    }

    // Convert to soft pastel for dark mode
    if (isDark) {
        [r, g, b] = toSoftPastel(r, g, b);
    }
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Gets the foreground color with full opacity
 * @param color - Color string in any format
 * @param isDark - Whether dark mode is active (converts to soft pastels if true)
 * @returns Color string with full opacity
 */
export function getColorWithFullOpacity(color: string | undefined, isDark: boolean = false): string {
    if (!color) {
        return 'rgb(59, 130, 246)'; // blue-500
    }

    let r = 0, g = 0, b = 0;

    // Handle hex colors
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        const fullHex = hex.length === 3 
            ? hex.split('').map(char => char + char).join('')
            : hex;
        
        r = parseInt(fullHex.substring(0, 2), 16);
        g = parseInt(fullHex.substring(2, 4), 16);
        b = parseInt(fullHex.substring(4, 6), 16);
    }
    // Handle hsl/hsla - convert to rgb
    else if (color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)/)) {
        const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)/);
        if (hslMatch) {
            const [, h, s, l] = hslMatch;
            [r, g, b] = hslToRgb(parseInt(h), parseInt(s), parseInt(l));
        }
    }
    // Handle rgba - extract rgb part
    else if (color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)) {
        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbaMatch) {
            [, r, g, b] = rgbaMatch.map(v => parseInt(v || '0'));
        }
    } else {
        // Return as-is if format is unrecognized
        return color;
    }

    // Convert to soft pastel for dark mode
    if (isDark) {
        [r, g, b] = toSoftPastel(r, g, b);
    }
    
    return `rgb(${r}, ${g}, ${b})`;
}

