// src/app/notes/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

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

    // This effect ensures the editor's content updates when a new note is selected.
    useEffect(() => {
        if (contentRef.current) {
            const newContent = currentNote?.content || '';
            if (contentRef.current.innerHTML !== newContent) {
                contentRef.current.innerHTML = newContent;
            }
        }
    }, [currentNote]);


    const handleNewNote = () => {
        setCurrentNote({ title: '', content: '' });
        if (contentRef.current) {
            contentRef.current.innerHTML = '';
        }
    };

    const handleSelectNote = (note: Note) => {
        setCurrentNote(note);
    };

    const handleSaveNote = async () => {
        if (!currentNote || !currentNote.title) {
            setError("Title is required.");
            return;
        }

        const contentToSave = contentRef.current?.innerHTML || '';

        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentNote.id,
                    title: currentNote.title,
                    content: contentToSave,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save note');
            }

            const newNote = await response.json();
            setNotes([newNote, ...notes.filter(n => n.id !== newNote.id)]);
            setError(null);
            handleNewNote();

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch('/api/notes/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error("Image upload failed.");

            const { url } = await response.json();
            if (contentRef.current) {
                const imgTag = `<img src="${url}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 8px;" />`;
                contentRef.current.innerHTML += imgTag;
            }

        } catch (uploadError: any) {
            setError(uploadError.message);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><p>Loading your secure notes...</p></div>;
    }

    if (error) {
        return <div className="p-8 text-destructive">Error: {error}</div>;
    }

    return (
        // **FIX:** A responsive grid layout that fills the parent container's height and width.
        <div className="grid h-full w-full md:grid-cols-[minmax(300px,_1fr)_3fr]">
            {/* Sidebar with list of notes */}
            <aside className="flex flex-col border-r bg-background p-4">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold">My Notes</h2>
                    <Button onClick={handleNewNote}>New Note</Button>
                </div>
                <div className="space-y-2 overflow-y-auto">
                    {notes.map((note) => (
                        <Card
                            key={note.id}
                            onClick={() => handleSelectNote(note)}
                            className={`cursor-pointer transition-colors hover:bg-accent ${currentNote?.id === note.id ? 'border-primary bg-accent' : ''}`}
                        >
                            <CardHeader className="p-4">
                                <CardTitle className="text-md truncate">{note.title}</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(note.created_at).toLocaleDateString()}
                                </p>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </aside>

            {/* Main content area for editing a note */}
            {/* **FIX:** 'overflow-hidden' on the parent and 'overflow-y-auto' on the editor prevent layout breaks. */}
            <div className="flex flex-col p-6 overflow-hidden">
                {currentNote ? (
                    <div className="flex flex-col h-full min-h-0">
                        <Input
                            placeholder="Note Title"
                            value={currentNote.title || ''}
                            onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                            className="text-2xl font-bold mb-4 p-2 border-0 focus:ring-0 shadow-none bg-transparent flex-shrink-0"
                        />
                        <div
                            ref={contentRef}
                            contentEditable
                            suppressContentEditableWarning
                            className="flex-grow p-4 border rounded-md bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring overflow-y-auto"
                        />
                        <div className="mt-4 flex justify-between flex-shrink-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                Upload Image
                            </Button>
                            <Button onClick={handleSaveNote}>Save Note</Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Select a note to view or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
}