// src/app/api/notes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { decryptData, encryptData, decryptUserKey } from "@/lib/crypto";
import { createStorage } from "unstorage";
import vercelKVDriver from "unstorage/drivers/vercel-kv";

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
    if (!encryptedKey) return null;
    try {
        return await decryptUserKey(encryptedKey);
    } catch (error) {
        console.error(`Failed to decrypt key for user ${userId}:`, error);
        return null;
    }
}

/**
 * PATCH handler for updating an existing note.
 * The { params } object is correctly destructured from the second argument.
 */
export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { params } = context;
    const noteId = params.id;

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

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from("notes")
        .update({ title: encryptedTitle, content: encryptedContent })
        .eq("id", noteId)
        .eq("user_id", session.user.id)
        .select()
        .single();

    if (error) {
        console.error("Supabase error updating note:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const decryptedNote = {
        ...data,
        title: await decryptData(data.title, userKey),
        content: data.content ? await decryptData(data.content, userKey) : "",
    };

    return NextResponse.json(decryptedNote, { status: 200 });
}

/**
 * DELETE handler for deleting a note.
 */
/**
 * DELETE  /api/notes/[id]
 */

// export async function DELETE(
//     _req: Request,                         // ← add this (or NextRequest)
//     context: { params: { id: string } }    // ← keep this
// ) {
//     const session = await auth();
//     if (!session?.user?.id) {
//         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//
//     const noteId = context.params.id;
//
//     const supabase = createServiceRoleClient();
//     const { error } = await supabase
//         .from("notes")
//         .delete()
//         .eq("id", noteId)
//         .eq("user_id", session.user.id);
//
//     if (error) {
//         console.error("Supabase error deleting note:", error);
//         return NextResponse.json({ error: error.message }, { status: 500 });
//     }
//
//     return NextResponse.json(
//         { message: "Note deleted successfully" },
//         { status: 200 }
//     );
// }