// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import { CustomSupabaseAdapter } from "@/lib/adapter"
import Passkey from "next-auth/providers/passkey"
import Resend from "next-auth/providers/resend"

const { handlers, auth, signIn, signOut } = NextAuth({
    experimental: { enableWebAuthn: true },
    // Use our custom adapter.
    // Note: SUPABASE_SERVICE_ROLE_KEY is required for the adapter to perform admin actions.
    adapter: CustomSupabaseAdapter({
        url: process.env.DATABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    }),
    providers: [
        Passkey,
        Resend({
            apiKey: process.env.AUTH_RESEND_KEY,
            from: "noreply@verification.vishalthakur.me",
        }),
    ],
    pages: {
        signIn: '/login',
        verifyRequest: '/verify-request',
    },
    callbacks: {
        session({ session, user }) {
            session.user.id = user.id
            return session
        },
    },
})

export { handlers as GET, handlers as POST }
export { auth, signIn, signOut }