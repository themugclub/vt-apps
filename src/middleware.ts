// src/middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// This simplifies the middleware. All logic is now handled inside the
// `authorized` callback in `auth.config.ts`.
export default NextAuth(authConfig).auth;

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api/auth|auth).*)'
    ]
};
