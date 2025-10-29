/**
 * Base64 encoding utility that works in both browser and Node.js environments
 * 
 * Uses btoa() in browser, Buffer in Node.js to avoid "btoa is not defined" errors
 */

export function toBase64(str: string): string {
  // Browser environment
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  
  // Node.js environment
  return Buffer.from(str).toString('base64');
}

