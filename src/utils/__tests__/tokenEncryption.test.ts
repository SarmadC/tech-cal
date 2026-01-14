/**
 * Unit tests for token encryption utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encryptToken, decryptToken, isEncrypted } from '../tokenEncryption';

describe('tokenEncryption', () => {
    const TEST_KEY = 'a'.repeat(64); // 32 bytes in hex

    beforeEach(() => {
        vi.stubEnv('TOKEN_ENCRYPTION_KEY', TEST_KEY);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('encryptToken', () => {
        it('should encrypt a token and return format iv:ciphertext:authTag', () => {
            const token = 'test_token_example_12345';
            const encrypted = encryptToken(token);

            const parts = encrypted.split(':');
            expect(parts).toHaveLength(3);
            expect(parts[0]).toHaveLength(24); // IV: 12 bytes = 24 hex chars
            expect(parts[2]).toHaveLength(32); // AuthTag: 16 bytes = 32 hex chars
        });

        it('should produce different ciphertexts for the same input (unique IVs)', () => {
            const token = 'test_token_example';
            const encrypted1 = encryptToken(token);
            const encrypted2 = encryptToken(token);

            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should throw if encryption key is not set', () => {
            vi.stubEnv('TOKEN_ENCRYPTION_KEY', '');

            expect(() => encryptToken('test')).toThrow('Failed to encrypt token');
        });

        it('should throw if encryption key is wrong length', () => {
            vi.stubEnv('TOKEN_ENCRYPTION_KEY', 'tooshort');

            expect(() => encryptToken('test')).toThrow('Failed to encrypt token');
        });
    });

    describe('decryptToken', () => {
        it('should decrypt an encrypted token correctly', () => {
            const original = 'test_token_example_12345';
            const encrypted = encryptToken(original);
            const decrypted = decryptToken(encrypted);

            expect(decrypted).toBe(original);
        });

        it('should handle special characters in tokens', () => {
            const original = 'token/with+special=chars&more!@#$%';
            const encrypted = encryptToken(original);
            const decrypted = decryptToken(encrypted);

            expect(decrypted).toBe(original);
        });

        it('should throw on invalid format', () => {
            expect(() => decryptToken('invalid')).toThrow('Failed to decrypt token');
        });

        it('should throw on tampered ciphertext', () => {
            const encrypted = encryptToken('test');
            const parts = encrypted.split(':');
            // Tamper with the ciphertext
            parts[1] = 'ff' + parts[1].slice(2);
            const tampered = parts.join(':');

            expect(() => decryptToken(tampered)).toThrow('Failed to decrypt token');
        });

        it('should throw on tampered auth tag', () => {
            const encrypted = encryptToken('test');
            const parts = encrypted.split(':');
            // Tamper with the auth tag
            parts[2] = 'ff' + parts[2].slice(2);
            const tampered = parts.join(':');

            expect(() => decryptToken(tampered)).toThrow('Failed to decrypt token');
        });
    });

    describe('isEncrypted', () => {
        it('should return true for encrypted format', () => {
            const encrypted = encryptToken('test');
            expect(isEncrypted(encrypted)).toBe(true);
        });

        it('should return false for null or undefined', () => {
            expect(isEncrypted(null)).toBe(false);
            expect(isEncrypted(undefined)).toBe(false);
        });

        it('should return false for plain JWT-like tokens', () => {
            const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
            expect(isEncrypted(jwt)).toBe(false);
        });

        it('should return false for strings with wrong part count', () => {
            expect(isEncrypted('only:two')).toBe(false);
            expect(isEncrypted('one:two:three:four')).toBe(false);
        });

        it('should return false for strings with wrong IV length', () => {
            const wrongIv = 'tooshort:ciphertext:a'.repeat(32);
            expect(isEncrypted(wrongIv)).toBe(false);
        });
    });

    describe('round-trip encryption', () => {
        it('should handle empty string', () => {
            const original = '';
            const encrypted = encryptToken(original);
            const decrypted = decryptToken(encrypted);
            expect(decrypted).toBe(original);
        });

        it('should handle very long tokens', () => {
            const original = 'a'.repeat(10000);
            const encrypted = encryptToken(original);
            const decrypted = decryptToken(encrypted);
            expect(decrypted).toBe(original);
        });

        it('should handle unicode characters', () => {
            const original = 'token-with-émojis-🔐-and-中文';
            const encrypted = encryptToken(original);
            const decrypted = decryptToken(encrypted);
            expect(decrypted).toBe(original);
        });
    });
});
