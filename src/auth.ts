// src/auth.ts
import NextAuth, { DefaultSession, User } from "next-auth"
import Passkey from "next-auth/providers/passkey"
import { createStorage } from "unstorage"
import vercelKVDriver from "unstorage/drivers/vercel-kv"
import { UnstorageAdapter } from "@auth/unstorage-adapter"
import "next-auth/jwt"
// FIX: Explicitly import the Node.js crypto module to get access to 'randomBytes'.
import crypto from 'crypto';
import { encryptUserKey } from "@/lib/crypto";
import {authConfig} from "@/auth.config";

// This storage is used by Auth.js for its own data (users, accounts, etc.)
const authStorage = createStorage({
    driver: vercelKVDriver({
        url: process.env.AUTH_KV_REST_API_URL,
        token: process.env.AUTH_KV_REST_API_TOKEN,
        env: false,
    })
});

// We create a separate storage instance for our custom user encryption keys
// to keep them separate from the main auth data.
const userKeyStorage = createStorage({
    driver: vercelKVDriver({
        url: process.env.AUTH_KV_REST_API_URL,
        token: process.env.AUTH_KV_REST_API_TOKEN,
        env: false,
        // We can use a base prefix to namespace our keys
        base: "userkeys:",
    })
});


export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig, // Spread the Edge-safe config
    debug: !!process.env.AUTH_DEBUG,
    theme: { logo: "https://authjs.dev/img/logo-sm.png" },
    adapter: UnstorageAdapter(authStorage),
    providers: [
        Passkey({
            formFields: {
                email: {
                    label: "Username",
                    required: true,
                    autocomplete: "username webauthn",
                },
            },
            relayingParty: { id: process.env.NODE_ENV === 'production' ? 'toolkit.vishalthakur.me' : 'localhost',
                name: 'VT Apps' }
        }),
    ],
    basePath: "/auth",
    session: { strategy: "jwt" },
    events: {
        async createUser({ user }) {
            if (!user.id) return;
            const userEncryptionKey = crypto.randomBytes(32);
            const encryptedUserKey = encryptUserKey(userEncryptionKey);
            await userKeyStorage.setItem(user.id, encryptedUserKey);
        }
    },
    experimental: { enableWebAuthn: true },
})

// Extend the default Session and User types to include the 'id' field.
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
        } & DefaultSession["user"];
    }
    // The default User type does not include 'id', so we add it.
    interface User {
        id: string;
    }
}
