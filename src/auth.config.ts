// src/auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: '/auth/signin',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isAuthRoute = nextUrl.pathname.startsWith('/auth');
            const isProtectedRoute = nextUrl.pathname.startsWith('/notes') || nextUrl.pathname.startsWith('/api/notes');

            // Case 1: User is on an authentication route (e.g., /auth/signin)
            if (isAuthRoute) {
                if (isLoggedIn) {
                    // If a logged-in user tries to access an auth page, redirect them to the homepage.
                    return Response.redirect(new URL('/', nextUrl));
                }
                // If they are not logged in, allow them to see the auth page.
                return true;
            }

            // Case 2: User is on a protected route
            if (isProtectedRoute) {
                if (isLoggedIn) {
                    // If they are logged in, allow access.
                    return true;
                }
                // If not logged in, returning false will trigger a redirect to the sign-in page.
                return false;
            }

            // Case 3: All other routes (like the homepage '/') are public by default.
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
