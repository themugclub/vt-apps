// src/app/api/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase";
import { decryptData, encryptData, decryptUserKey } from "@/lib/crypto";
import { createStorage } from "unstorage";
import vercelKVDriver from "unstorage/drivers/vercel-kv";

const supabase = createClient();

// Storage for user encryption keys
const userKeyStorage = createStorage({
    driver: vercelKVDriver({
        url: process.env.AUTH_KV_REST_API_URL,
        token: process.env.AUTH_KV_REST_API_TOKEN,
        env: false,
        base: "userkeys:",
    })
});

/**
 * Fetches the decrypted encryption key for the current user.
 * @param {string} userId - The ID of the current user.
 * @returns {Promise<Buffer|null>} The decrypted user key, or null if not found.
 */
async function getUserKey(userId: string): Promise<Buffer | null> {
    const encryptedKey = await userKeyStorage.getItem(userId) as string | null;
    if (!encryptedKey) {
        console.error(`Encryption key not found for user ${userId}`);
        return null;
    }
    try {
        return decryptUserKey(encryptedKey);
    } catch (error) {
        console.error(`Failed to decrypt key for user ${userId}:`, error);
        return null;
    }
}

/**
 * GET handler to fetch and decrypt all notes for the current user.
 */
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userKey = await getUserKey(session.user.id);
    if (!userKey) {
        return NextResponse.json({ error: "Could not retrieve encryption key." }, { status: 500 });
    }

    const { data: notes, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Supabase error fetching notes:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Decrypt each note before sending it to the client
    const decryptedNotes = notes.map(note => ({
        ...note,
        title: decryptData(note.title, userKey),
        content: note.content ? decryptData(note.content, userKey) : "",
    }));

    return NextResponse.json(decryptedNotes);
}

/**
 * POST handler to encrypt and save a new note.
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userKey = await getUserKey(session.user.id);
    if (!userKey) {
        return NextResponse.json({ error: "Could not retrieve encryption key." }, { status: 500 });
    }

    const { title, content } = await req.json();

    if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Encrypt the data before storing it
    const encryptedTitle = encryptData(title, userKey);
    const encryptedContent = content ? encryptData(content, userKey) : null;

    const { data, error } = await supabase
        .from("notes")
        .insert({
            user_id: session.user.id,
            title: encryptedTitle,
            content: encryptedContent,
        })
        .select()
        .single();

    if (error) {
        console.error("Supabase error creating note:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Decrypt the newly created note to send back to the client
    const decryptedNote = {
        ...data,
        title: decryptData(data.title, userKey),
        content: data.content ? decryptData(data.content, userKey) : "",
    };

    return NextResponse.json(decryptedNote, { status: 201 });
}
