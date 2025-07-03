// src/auth.ts
import NextAuth from 'next-auth';
import Passkey from 'next-auth/providers/passkey';
import { createStorage } from "unstorage";
import vercelKVDriver from "unstorage/drivers/vercel-kv";
import { UnstorageAdapter } from "@auth/unstorage-adapter";
import { createServiceRoleClient } from './lib/supabase-server';
import { encryptUserKey } from './lib/crypto';

// Storage for NextAuth data
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
            if (!user.id) return;

            // Step 1: Directly sync the user to Supabase.
            // This will now succeed because the blocking foreign key constraint has been removed.
            const supabase = createServiceRoleClient();
            const { error: supabaseError } = await supabase.from('users').insert({
                id: user.id,
                email: user.email,
                name: user.name,
            });

            if (supabaseError) {
                console.error("CRITICAL: Failed to sync new user to Supabase.", JSON.stringify(supabaseError, null, 2));
                throw new Error("Could not create user record in application database.");
            }
            console.log(`Successfully synced user ${user.id} to Supabase.`);

            // Step 2: Create the user's encryption key.
            try {
                const userEncryptionKeyBytes = crypto.getRandomValues(new Uint8Array(32));
                const userEncryptionKey = Buffer.from(userEncryptionKeyBytes);
                const encryptedUserKey = await encryptUserKey(userEncryptionKey);
                await userKeyStorage.setItem(user.id, encryptedUserKey);
                console.log(`Successfully created encryption key for user ${user.id}`);
            } catch (keyError) {
                console.error(`CRITICAL: Failed to create and store user encryption key for user ${user.id}:`, keyError);
                throw new Error("Could not generate user encryption key.");
            }
        }
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isProtectedRoute = nextUrl.pathname.startsWith('/notes') || nextUrl.pathname.startsWith('/api/notes');
            const isAuthRoute = nextUrl.pathname.startsWith('/auth');

            if (isProtectedRoute) {
                return isLoggedIn;
            }

            if (isAuthRoute) {
                if (isLoggedIn) {
                    return Response.redirect(new URL('/notes', nextUrl));
                }
                return true;
            }

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