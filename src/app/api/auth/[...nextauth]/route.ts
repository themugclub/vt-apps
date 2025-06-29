// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import { CustomSupabaseAdapter } from "@/lib/adapter"
import Passkey from "@auth/core/providers/passkey";

/** -----------------------------------------------------------------
 *  1) Build the Auth.js handler
 *  – Same config object you already had, now all in-line
 *  – NOTE the Supabase URL + `next_auth` schema we fixed earlier
 *  ---------------------------------------------------------------- */
const { handlers, auth } = NextAuth({
    adapter: CustomSupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,                  // REST endpoint, *not* Postgres URL
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        db: { schema: "next_auth" },                     // makes every query hit next_auth.*
    }),

    providers: [Passkey],

    session: { strategy: "jwt" },                     // or "database" if you prefer
    experimental: { enableWebAuthn: true },           // keeps the console warning away
})

/** -----------------------------------------------------------------
 *  2) Re-export ONLY the real route handlers
 *  – `handlers` is an object whose .GET and .POST
 *    are plain functions (what Next.js expects)
 *  ---------------------------------------------------------------- */
export const { GET, POST } = handlers   // real route functions
export { auth }