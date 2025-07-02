// src/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: '/auth/signin',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isProtectedRoute = nextUrl.pathname.startsWith('/notes') || nextUrl.pathname.startsWith('/api/notes');

            if (isProtectedRoute) {
                if (isLoggedIn) return true; // If logged in, allow access to protected routes.
                return false; // If not logged in, redirect to the sign-in page.
            }

            // This block handles non-protected routes.
            else if (isLoggedIn) {
                // If the user is logged in and tries to access an auth page (e.g., sign-in),
                // redirect them to the homepage.
                if (nextUrl.pathname.startsWith('/auth')) {
                    return Response.redirect(new URL('/', nextUrl));
                }
            }

            // For any other case (e.g., unauthenticated user accessing the homepage or sign-in page),
            // always allow access. This is the key to preventing the redirect loop.
            return true;
        },
        jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        },
        session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            return session;
        },
    },
    providers: [], // Providers are defined in the main auth.ts file
} satisfies NextAuthConfig;
