/**
 * Helper function to create vibrant "pop" colors from pastel backgrounds
 * Used for generating dynamic title colors that contrast well with pastel backgrounds
 * @param color - Hex color string (e.g., "#bfdbfe")
 * @param _factor - Unused parameter for compatibility
 * @returns RGB color string (e.g., "rgb(123, 145, 234)")
 */
export const getPillColor = (color: string, _factor: number = 0.15) => {
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        const num = parseInt(hex, 16);
        const r = (num >> 16) & 0xFF;
        const g = (num >> 8) & 0xFF;
        const b = num & 0xFF;
        
        // Convert to HSL for better color manipulation
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const delta = max - min;
        
        let h = 0;
        if (delta !== 0) {
            if (max === r/255) h = ((g/255 - b/255) / delta) % 6;
            else if (max === g/255) h = (b/255 - r/255) / delta + 2;
            else h = (r/255 - g/255) / delta + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        const l = (max + min) / 2;
        const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        
        // Create vibrant pop color: increase saturation dramatically and adjust lightness
        const newS = Math.min(0.45, s * 2.5); // Much higher saturation
        const newL = Math.max(0.10, Math.min(0.55, l * 0.5)); // Darker but not too dark
        
        // Convert back to RGB
        const c = (1 - Math.abs(2 * newL - 1)) * newS;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = newL - c / 2;
        
        let newR = 0, newG = 0, newB = 0;
        
        if (h >= 0 && h < 60) {
            newR = c; newG = x; newB = 0;
        } else if (h >= 60 && h < 120) {
            newR = x; newG = c; newB = 0;
        } else if (h >= 120 && h < 180) {
            newR = 0; newG = c; newB = x;
        } else if (h >= 180 && h < 240) {
            newR = 0; newG = x; newB = c;
        } else if (h >= 240 && h < 300) {
            newR = x; newG = 0; newB = c;
        } else if (h >= 300 && h < 360) {
            newR = c; newG = 0; newB = x;
        }
        
        return `rgb(${Math.round((newR + m) * 255)}, ${Math.round((newG + m) * 255)}, ${Math.round((newB + m) * 255)})`;
    }
    
    return color; // Return as-is if not hex
};

