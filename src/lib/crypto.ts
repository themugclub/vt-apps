// src/lib/crypto.ts
import crypto from 'crypto';

// This should be a 32-byte (256-bit) key, which is 64 hex characters.
const masterKey = Buffer.from(process.env.MASTER_ENCRYPTION_KEY!, 'hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES-GCM, the IV is typically 12 or 16 bytes.
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a user-specific key with the master key.
 * This is used to securely store user keys in Vercel KV.
 * @param {Buffer} keyToEncrypt - The user's raw encryption key.
 * @returns {string} - The encrypted key, encoded as a base64 string.
 */
export function encryptUserKey(keyToEncrypt: Buffer): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(keyToEncrypt), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypts a user-specific key with the master key.
 * This is used when retrieving the user key from Vercel KV to use it.
 * @param {string} encryptedKeyBase64 - The base64 encoded encrypted key.
 * @returns {Buffer} - The decrypted user key.
 */
export function decryptUserKey(encryptedKeyBase64: string): Buffer {
    const data = Buffer.from(encryptedKeyBase64, 'base64');
    const iv = data.slice(0, IV_LENGTH);
    const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Encrypts text data using a provided user key.
 * @param {string} text - The plaintext data to encrypt.
 * @param {Buffer} userKey - The user's decrypted encryption key.
 * @returns {string} - The encrypted data, encoded as a base64 string.
 */
export function encryptData(text: string, userKey: Buffer): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, userKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypts text data using a provided user key.
 * @param {string} encryptedTextBase64 - The base64 encoded encrypted data.
 * @param {Buffer} userKey - The user's decrypted encryption key.
 * @returns {string} - The decrypted plaintext data.
 */
export function decryptData(encryptedTextBase64: string, userKey: Buffer): string {
    const data = Buffer.from(encryptedTextBase64, 'base64');
    const iv = data.slice(0, IV_LENGTH);
    const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, userKey, iv);
    decipher.setAuthTag(authTag);
    // FIX: The 'binary' input encoding is not needed when the input is a Buffer.
    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}
