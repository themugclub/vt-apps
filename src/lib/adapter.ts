// src/lib/adapter.ts
import { SupabaseAdapter } from "@auth/supabase-adapter"
import { createClient } from "@supabase/supabase-js"
import type { Adapter } from "next-auth/adapters"

export function CustomSupabaseAdapter(
    opts: {
        url: string ;
        secret: string;
        db: { schema: string }
    }
): Adapter {
    const schema = opts.db?.schema ?? "next_auth"
    const supabase = createClient(opts.url, opts.secret!,{ db: { schema }})

    // Get the base adapter
    const adapter = SupabaseAdapter({
        url:    opts.url    ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secret: opts.secret ?? process.env.SUPABASE_SERVICE_ROLE_KEY!,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        options: { db: { schema } },
    }) as Adapter

    // Manually add the missing methods for the Passkey provider
    // This preserves the 'this' context of the original adapter.
    adapter.getAccount = async (providerAccountId, provider) => {
        const { data, error } = await supabase
            .from("accounts")
            .select()
            .eq("providerAccountId", providerAccountId)
            .eq("provider", provider)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        return data ?? null;
    };

    adapter.getAuthenticator = async (credentialID) => {
        const { data, error } = await supabase
            .from("authenticators")
            .select()
            .eq("credentialID", credentialID)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error("Error in getAuthenticator:", error);
            throw error;
        }
        return data ?? null;
    };

    adapter.createAuthenticator = async (authenticator) => {
        const { data, error } = await supabase
            .from("authenticators")
            .insert(authenticator)
            .select()
            .single();

        if (error) {
            console.error("Error in createAuthenticator:", error);
            throw error;
        }
        return data;
    };

    adapter.listAuthenticatorsByUserId = async (userId) => {
        const { data, error } = await supabase
            .from("authenticators")
            .select()
            .eq("userId", userId);

        if (error) {
            console.error("Error in listAuthenticatorsByUserId:", error);
            throw error;
        }
        return data ?? [];
    };

    adapter.updateAuthenticatorCounter = async (credentialID, newCounter) => {
        const { data, error } = await supabase
            .from("authenticators")
            .update({ counter: newCounter })
            .eq("credentialID", credentialID)
            .select()
            .single();

        if (error) {
            console.error("Error in updateAuthenticatorCounter:", error);
            throw error;
        }
        return data;
    };

    adapter.getUserByEmail = async (email) => {
        const { data, error } = await supabase               // ← uses next_auth.users
            .from("users")
            .select()
            .eq("email", email)
            .single()

        if (error && error.code !== "PGRST116") throw error   // unexpected ⇒ re-throw
        return data ?? null                                   // "not found" ⇒ null
    }

    // Return the modified adapter object
    return adapter;
}