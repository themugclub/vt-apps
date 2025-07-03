// src/app/api/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { decryptData, encryptData, decryptUserKey } from "@/lib/crypto";
import { createStorage } from "unstorage";
import vercelKVDriver from "unstorage/drivers/vercel-kv";
import { createServiceRoleClient } from "@/lib/supabase-server";

export const runtime = 'nodejs';

const userKeyStorage = createStorage({
    driver: vercelKVDriver({
        url: process.env.AUTH_KV_REST_API_URL,
        token: process.env.AUTH_KV_REST_API_TOKEN,
        env: false,
        base: "userkeys:",
    })
});

async function getUserKey(userId: string): Promise<Buffer | null> {
    const encryptedKey = await userKeyStorage.getItem(userId) as string | null;
    if (!encryptedKey) {
        console.error(`Encryption key not found for user ${userId}`);
        return null;
    }
    try {
        return await decryptUserKey(encryptedKey);
    } catch (error) {
        console.error(`Failed to decrypt key for user ${userId}:`, error);
        return null;
    }
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
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

    // Decrypt each note using the new async decryptData function
    const decryptedNotes = await Promise.all(notes.map(async (note) => ({
        ...note,
        title: await decryptData(note.title, userKey),
        content: note.content ? await decryptData(note.content, userKey) : "",
    })));

    return NextResponse.json(decryptedNotes);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const userKey = await getUserKey(session.user.id);
    if (!userKey) {
        return NextResponse.json({ error: "Could not retrieve encryption key." }, { status: 500 });
    }

    const { title, content } = await req.json();

    if (!title) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const encryptedTitle = await encryptData(title, userKey);
    const encryptedContent = content ? await encryptData(content, userKey) : null;

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

    const decryptedNote = {
        ...data,
        title: await decryptData(data.title, userKey),
        content: data.content ? await decryptData(data.content, userKey) : "",
    };

    return NextResponse.json(decryptedNote, { status: 201 });
}