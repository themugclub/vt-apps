// src/app/notes/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {auth} from "@/auth";

// Define the structure of a Note object
interface Note {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [currentNote, setCurrentNote] = useState<Partial<Note> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch notes from our API when the component mounts
    useEffect(() => {
        const fetchNotes = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/notes');
                if (!response.ok) {
                    throw new Error('Failed to fetch notes');
                }
                const data = await response.json();
                setNotes(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotes();
    }, []);

    const handleNewNote = () => {
        setCurrentNote({title: '', content: ''});
    };

    const handleSelectNote = (note: Note) => {
        setCurrentNote(note);
    };

    const handleSaveNote = async () => {
        if (!currentNote || !currentNote.title) {
            setError("Title is required.");
            return;
        }

        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    title: currentNote.title,
                    content: currentNote.content,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save note');
            }

            const newNote = await response.json();
            setNotes([newNote, ...notes]);
            setCurrentNote(newNote);
            setError(null);

        } catch (err: any) {
            setError(err.message);
        }
    };

    // NOTE: Image handling (compression, upload) is a complex feature.
    // I've set up the structure here, but the implementation will be added in a future step.
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        console.log("Pasting content...");
        // Future logic for image handling will go here.
    };

    if (isLoading) {
        return <div className="p-8">Loading your secure notes...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar with list of notes */}
            <aside className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">My Notes</h2>
                    <Button onClick={handleNewNote}>New Note</Button>
                </div>
                <div className="space-y-2">
                    {notes.map((note) => (
                        <Card
                            key={note.id}
                            onClick={() => handleSelectNote(note)}
                            className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${currentNote?.id === note.id ? 'bg-gray-200 dark:bg-gray-800 border-primary' : ''}`}
                        >
                            <CardHeader className="p-4">
                                <CardTitle className="text-md truncate">{note.title}</CardTitle>
                                <p className="text-xs text-gray-500">
                                    {new Date(note.created_at).toLocaleDateString()}
                                </p>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </aside>

            {/* Main content area for editing a note */}
            <main className="w-2/3 p-6">
                {currentNote ? (
                    <div className="flex flex-col h-full">
                        <Input
                            placeholder="Note Title"
                            value={currentNote.title || ''}
                            onChange={(e) => setCurrentNote({...currentNote, title: e.target.value})}
                            className="text-2xl font-bold mb-4 p-2 border-0 focus:ring-0 shadow-none"
                        />
                        <div
                            onPaste={handlePaste}
                            contentEditable
                            suppressContentEditableWarning
                            className="flex-grow p-4 border rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                            style={{minHeight: '400px'}}
                        >
                            {/* The content will be managed via state, but this makes it editable */}
                            {/* For a real rich text editor, a library like Tiptap/Lexical would be better */}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <Button onClick={handleSaveNote}>Save Note</Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Select a note to view or create a new one.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
