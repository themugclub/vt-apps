// src/app/api/notes/upload/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceRoleClient } from "@/lib/supabase-server";

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

    // Use a unique file path including the user's ID to prevent conflicts
    const filePath = `${session.user.id}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
        .from("note-images") // Your bucket name
        .upload(filePath, file);

    if (error) {
        console.error("Supabase upload error:", error);
        return NextResponse.json({ error: `Failed to upload file: ${error.message}` }, { status: 500 });
    }

    // Get the public URL of the uploaded file
    const { data } = supabase.storage
        .from("note-images")
        .getPublicUrl(filePath);

    if (!data?.publicUrl) {
        return NextResponse.json({ error: "Could not get public URL." }, { status: 500 });
    }

    return NextResponse.json({ url: data.publicUrl });
}