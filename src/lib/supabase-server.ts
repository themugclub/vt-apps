// src/lib/supabase-server.ts

import { createClient } from '@supabase/supabase-js'

// This is the correct way to create a server-side client for admin tasks.
// It uses the standard `createClient` from `@supabase/supabase-js` and is not
// concerned with user session cookies, which resolves all the previous errors.
export function createServiceRoleClient() {
    return createClient(
        // These are your project's URL and the secret SERVICE_ROLE_KEY.
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            // This configures the client to act as a service role,
            // bypassing RLS and not relying on user sessions.
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}