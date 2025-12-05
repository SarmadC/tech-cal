export const env = (key: string, fallback?: string): string => {
    const value = process.env[key];
    if (value === undefined || value === null || value === '') {
        if (fallback !== undefined) return fallback;
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
};

