/**
 * Token Encryption Utility
 * 
 * Provides AES-256-GCM encryption for OAuth tokens before database storage.
 * This ensures tokens are protected at rest even if the database is compromised.
 * 
 * @module tokenEncryption
 * @server-only This module must only be used server-side
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import * as Sentry from '@sentry/nextjs';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment variables.
 * The key must be a 32-byte (64 hex character) string.
 */
function getEncryptionKey(): Buffer {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
    
    if (!keyHex) {
        const error = new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
        Sentry.captureException(error, {
            tags: { service: 'token_encryption', operation: 'get_key' }
        });
        throw error;
    }
    
    if (keyHex.length !== 64) {
        const error = new Error('TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
        Sentry.captureException(error, {
            tags: { service: 'token_encryption', operation: 'validate_key' }
        });
        throw error;
    }
    
    return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext token using AES-256-GCM.
 * 
 * Returns format: `${iv_hex}:${ciphertext_hex}:${authTag_hex}`
 * 
 * @param plaintext - The token to encrypt
 * @returns Encrypted token in the format `iv:ciphertext:authTag`
 * @throws Error if encryption fails or key is not configured
 */
export function encryptToken(plaintext: string): string {
    try {
        const key = getEncryptionKey();
        const iv = randomBytes(IV_LENGTH);
        
        const cipher = createCipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        
        let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
        ciphertext += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return `${iv.toString('hex')}:${ciphertext}:${authTag.toString('hex')}`;
    } catch (error) {
        // Don't log the plaintext token for security
        console.error('Token encryption failed');
        Sentry.captureException(error, {
            tags: { service: 'token_encryption', operation: 'encrypt' }
        });
        throw new Error('Failed to encrypt token');
    }
}

/**
 * Decrypt an encrypted token.
 * 
 * @param encrypted - The encrypted token in format `iv:ciphertext:authTag`
 * @returns The decrypted plaintext token
 * @throws Error if decryption fails, format is invalid, or key is not configured
 */
export function decryptToken(encrypted: string): string {
    try {
        const parts = encrypted.split(':');
        
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted token format');
        }
        
        const [ivHex, ciphertext, authTagHex] = parts;
        
        const key = getEncryptionKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        
        decipher.setAuthTag(authTag);
        
        let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
        plaintext += decipher.final('utf8');
        
        return plaintext;
    } catch (error) {
        // Don't log the encrypted value for security
        console.error('Token decryption failed');
        Sentry.captureException(error, {
            tags: { service: 'token_encryption', operation: 'decrypt' }
        });
        throw new Error('Failed to decrypt token');
    }
}

/**
 * Check if a value appears to be an encrypted token.
 * Used for backward compatibility during migration periods.
 * 
 * @param value - The value to check
 * @returns True if the value appears to be in encrypted format
 */
export function isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    
    // Encrypted format: iv(24 hex):ciphertext(variable):authTag(32 hex)
    const parts = value.split(':');
    if (parts.length !== 3) return false;
    
    const [iv, , authTag] = parts;
    
    // IV should be 24 hex chars (12 bytes)
    // AuthTag should be 32 hex chars (16 bytes)
    return iv.length === 24 && authTag.length === 32;
}
