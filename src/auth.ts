// src/auth.ts
import NextAuth from 'next-auth';
import Passkey from 'next-auth/providers/passkey';
import { createStorage } from "unstorage";
import vercelKVDriver from "unstorage/drivers/vercel-kv";
import { UnstorageAdapter } from "@auth/unstorage-adapter";
import { createServiceRoleClient } from './lib/supabase-server';
import crypto from 'crypto';
import { encryptUserKey } from './lib/crypto';

// Storage for NextAuth data (Users, Sessions, Authenticators for Passkeys)
const storage = createStorage({
    driver: vercelKVDriver({
        url: process.env.AUTH_KV_REST_API_URL,
        token: process.env.AUTH_KV_REST_API_TOKEN,
        env: false,
    })
});

// Separate storage for your custom encryption keys
const userKeyStorage = createStorage({
    driver: vercelKVDriver({
        url: process.env.AUTH_KV_REST_API_URL,
        token: process.env.AUTH_KV_REST_API_TOKEN,
        env: false,
        base: "userkeys:",
    })
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.AUTH_SECRET,
    basePath: '/auth',
    adapter: UnstorageAdapter(storage),
    providers: [
        Passkey({
            formFields: {
                email: {
                    label: "Username",
                    required: true,
                    autocomplete: "username webauthn",
                },
            },
        }),
    ],
    events: {
        async createUser(message) {
            const user = message.user;
            if (!user.id || !user.email) return;

            const supabase = createServiceRoleClient();
            const { error: supabaseError } = await supabase.from('users').insert({
                id: user.id,
                email: user.email,
                name: user.name,
            });

            if (supabaseError) {
                console.error("CRITICAL: Failed to sync new user to Supabase:", JSON.stringify(supabaseError, null, 2));
                throw new Error("Could not create user record in application database.");
            }
            try {
                const userEncryptionKey = crypto.randomBytes(32);
                const encryptedUserKey = encryptUserKey(userEncryptionKey);
                await userKeyStorage.setItem(user.id, encryptedUserKey);
            } catch (keyError) {
                console.error("CRITICAL: Failed to create user encryption key:", keyError);
            }
        }
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isProtectedRoute = nextUrl.pathname.startsWith('/notes') || nextUrl.pathname.startsWith('/api/notes');
            const isAuthRoute = nextUrl.pathname.startsWith('/auth');

            if (isProtectedRoute) {
                // If on a protected route, returning false will automatically redirect to the login page.
                return isLoggedIn;
            }

            if (isAuthRoute) {
                if (isLoggedIn) {
                    // If the user is logged in, redirect them from auth pages to the main dashboard.
                    return Response.redirect(new URL('/notes', nextUrl));
                }
                // Allow unauthenticated users to access auth pages (e.g., /auth/signin).
                return true;
            }

            // Allow access to all other pages (like the homepage).
            return true;
        },
        async session({ session, user }) {
            if (session.user) {
                session.user.id = user.id;
            }
            return session;
        },
    },
    experimental: { enableWebAuthn: true },
});