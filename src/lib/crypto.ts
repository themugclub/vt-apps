// src/lib/crypto.ts
// Using Web Crypto API for Edge Runtime compatibility

// This should be a 32-byte (256-bit) key, stored in your environment variables.
const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY!;
// A helper to import the master key once.
const masterKeyPromise = crypto.subtle.importKey(
    "raw",
    Buffer.from(masterKeyHex, 'hex'),
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
);

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // AES-GCM standard IV length is 12 bytes

/**
 * Encrypts a user-specific key with the master key.
 * @param {Buffer} keyToEncrypt - The user's raw encryption key.
 * @returns {Promise<string>} - The encrypted key, encoded as a base64 string.
 */
export async function encryptUserKey(keyToEncrypt: Buffer): Promise<string> {
    const masterKey = await masterKeyPromise;
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encrypted = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv: iv },
        masterKey,
        keyToEncrypt
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return Buffer.from(combined).toString('base64');
}

/**
 * Decrypts a user-specific key with the master key.
 * @param {string} encryptedKeyBase64 - The base64 encoded encrypted key.
 * @returns {Promise<Buffer>} - The decrypted user key.
 */
export async function decryptUserKey(encryptedKeyBase64: string): Promise<Buffer> {
    const masterKey = await masterKeyPromise;
    const data = Buffer.from(encryptedKeyBase64, 'base64');
    const iv = data.slice(0, IV_LENGTH);
    const encrypted = data.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv: iv },
        masterKey,
        encrypted
    );
    return Buffer.from(decrypted);
}

// Helper to import a user's raw key buffer into a CryptoKey
async function getUserCryptoKey(userKeyBuffer: Buffer): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        userKeyBuffer,
        { name: ALGORITHM, length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts text data using a provided user key.
 * @param {string} text - The plaintext data to encrypt.
 * @param {Buffer} userKey - The user's decrypted encryption key.
 * @returns {Promise<string>} - The encrypted data, encoded as a base64 string.
 */
export async function encryptData(text: string, userKey: Buffer): Promise<string> {
    const cryptoKey = await getUserCryptoKey(userKey);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encodedText = new TextEncoder().encode(text);

    const encryptedContent = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        cryptoKey,
        encodedText
    );

    const result = new Uint8Array(iv.length + encryptedContent.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedContent), iv.length);

    return Buffer.from(result).toString('base64');
}

/**
 * Decrypts text data using a provided user key.
 * @param {string} encryptedTextBase64 - The base64 encoded encrypted data.
 * @param {Buffer} userKey - The user's decrypted encryption key.
 * @returns {Promise<string>} - The decrypted plaintext data.
 */
export async function decryptData(encryptedTextBase64: string, userKey: Buffer): Promise<string> {
    const cryptoKey = await getUserCryptoKey(userKey);
    const data = Buffer.from(encryptedTextBase64, 'base64');
    const iv = data.slice(0, IV_LENGTH);
    const encryptedContent = data.slice(IV_LENGTH);

    const decryptedContent = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        cryptoKey,
        encryptedContent
    );

    return new TextDecoder().decode(decryptedContent);
}