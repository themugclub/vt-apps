// src/app/api/notes/upload/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { extname } from 'path'; // Import the 'path' module to get file extensions

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // --- START: The Final Fix ---

    // 1. Get the original file extension (e.g., ".png", ".jpg").
    const fileExtension = extname(file.name);

    // 2. Generate a new, completely safe filename using a timestamp.
    const newFileName = `${Date.now()}${fileExtension}`;

    // 3. Create the final, safe file path.
    const filePath = `${session.user.id}/${newFileName}`;

    // --- END: The Final Fix ---

    const { error } = await supabase.storage
        .from("notes-images")
        .upload(filePath, file, {
            // It's also good practice to explicitly set the content type
            contentType: file.type,
        });

    if (error) {
        console.error("Supabase upload error:", error);
        return NextResponse.json({ error: `Failed to upload file: ${error.message}` }, { status: 500 });
    }

    const { data } = supabase.storage
        .from("note-images")
        .getPublicUrl(filePath);

    if (!data?.publicUrl) {
        return NextResponse.json({ error: "Could not get public URL." }, { status: 500 });
    }

    return NextResponse.json({ url: data.publicUrl });
}