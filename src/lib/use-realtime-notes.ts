"use client";
import { useEffect } from "react";
import {supabaseBrowser} from "@/lib/supabase-client";

interface Note {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

type Cbs = {
    onInsert: (n: Note) => void;
    onUpdate: (n: Note) => void;
    onDelete: (id: string) => void;
};

export function useRealtimeNotes(userId: string | undefined, cbs: Cbs) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    useEffect(() => {
        if (!userId) return;

        const channel = supabaseBrowser
            .channel(`notes-${userId}`)
            .on(
                "postgres_changes",
                {
                    schema: "public",
                    table: "notes",
                    event: "*",
                    filter: `user_id=eq.${userId}`,
                },
                (p) => {
                    switch (p.eventType) {
                        case "INSERT":
                            cbs.onInsert(p.new as Note);
                            break;
                        case "UPDATE":
                            cbs.onUpdate(p.new as Note);
                            break;
                        case "DELETE":
                            cbs.onDelete((p.old as Note).id);
                            break;
                    }
                },
            )
            .subscribe();

        return () => supabaseBrowser.removeChannel(channel);
    }, [userId, cbs]);
}