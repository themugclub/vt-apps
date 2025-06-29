// src/lib/adapter.ts
import { SupabaseAdapter, type SupabaseAdapterOptions } from "@auth/supabase-adapter"
import { createClient } from "@supabase/supabase-js"
import type { Adapter } from "next-auth/adapters"

export function CustomSupabaseAdapter(
    options: SupabaseAdapterOptions
): Adapter {
    const supabase = createClient(options.url, options.secret!);

    // Get the base adapter
    const adapter = SupabaseAdapter(options) as Adapter;

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

    // Return the modified adapter object
    return adapter;
}