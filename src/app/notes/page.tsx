// src/app/notes/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {Button} from '@/components/ui/button';
import {Card, CardHeader, CardTitle} from '@/components/ui/card';
import {useIsMobile} from '@/hooks/use-mobile';
import FormattingToolbar from '@/components/ui/FormattingToolbar';
import {ArrowLeft} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import {useRealtimeNotes} from "@/lib/use-realtime-notes";
import {useSession} from "next-auth/react";

interface Note {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([]);

    const { data: session } = useSession();

    useRealtimeNotes(session?.user?.id, {
        onInsert: (n) => setNotes((prev) => [n, ...prev]),
        onUpdate: (n) => setNotes((prev) => prev.map((x) => (x.id === n.id ? n : x))),
        onDelete: (id) => setNotes((prev) => prev.filter((x) => x.id !== id)),
    });

    const [currentNote, setCurrentNote] = useState<Partial<Note> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editorTitle, setEditorTitle] = useState('');
    const [editorContent, setEditorContent] = useState('');

    const isMobile = useIsMobile();
    const contentRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const currentNoteIdRef = useRef<string | undefined>();

    useEffect(() => {
        currentNoteIdRef.current = currentNote?.id;
    }, [currentNote]);

    useEffect(() => {
        const fetchNotes = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/notes');
                if (!response.ok) throw new Error('Failed to fetch notes');
                setNotes(await response.json());
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotes();
    }, []);

    useEffect(() => {
        if (currentNote) {
            setEditorTitle(currentNote.title || '');
            const newContent = currentNote.content || '';
            setEditorContent(newContent);
            if (contentRef.current && contentRef.current.innerHTML !== newContent) {
                contentRef.current.innerHTML = newContent;
            }
        } else {
            setEditorTitle('');
            setEditorContent('');
        }
    }, [currentNote]);

    const triggerSave = useCallback(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            if (!currentNote || currentNote.id !== currentNoteIdRef.current || !editorTitle.trim()) return;
            const isUpdate = !!currentNote.id;
            const url = isUpdate ? `/api/notes/${currentNote.id}` : '/api/notes';
            const method = isUpdate ? 'PATCH' : 'POST';
            try {
                const response = await fetch(url, {
                    method,
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({title: editorTitle, content: editorContent})
                });
                if (!response.ok) throw new Error('Failed to save note');
                const savedNote = await response.json();
                setNotes(prev => isUpdate ? prev.map(n => n.id === savedNote.id ? savedNote : n) : [savedNote, ...prev]);
                if (!isUpdate) setCurrentNote(savedNote);
            } catch (err: any) {
                setError(err.message);
            }
        }, 2000);
    }, [editorTitle, editorContent, currentNote]);

    useEffect(() => {
        if (currentNote) triggerSave();
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [editorTitle, editorContent, triggerSave, currentNote]);

    // --- New, Robust Image Insertion Logic ---
    const insertImage = (url: string, alt: string) => {
        if (!contentRef.current) return;
        const editor = contentRef.current;
        editor.focus();

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        range.deleteContents();

        const img = document.createElement('img');
        img.src = url;
        img.alt = alt;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';

        range.insertNode(img);

        // Move cursor after the inserted image
        const newRange = document.createRange();
        newRange.setStartAfter(img);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        setEditorContent(editor.innerHTML);
    };

    const handleImageFile = async (file: File) => {
        const options = {maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true};
        try {
            const compressedFile = await imageCompression(file, options);
            const formData = new FormData();
            formData.append("file", compressedFile, file.name);
            const response = await fetch('/api/notes/upload', {method: 'POST', body: formData});
            if (!response.ok) throw new Error("Image upload failed.");
            const {url} = await response.json();
            return {url, name: file.name};
        } catch (err) {
            setError((err as Error).message);
            return null;
        }
    };

    const handleImageUploadFromButton = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const result = await handleImageFile(file);
        if (result) {
            insertImage(result.url, result.name);
        }
    };

    const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
        const imageFile = Array.from(e.clipboardData.files).find(file => file.type.startsWith('image/'));
        if (imageFile) {
            e.preventDefault();
            const result = await handleImageFile(imageFile);
            if (result) {
                insertImage(result.url, "Pasted Image");
            }
        } else {
            e.preventDefault();
            let pastedHtml = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
            pastedHtml = pastedHtml.replace(/style="[^"]*"/g, '').replace(/<\/?font[^>]*>/g, '');
            document.execCommand('insertHTML', false, pastedHtml);
        }
    };

    const handleNewNote = () => setCurrentNote({title: '', content: ''});
    const handleDeleteNote = async () => {
        if (!currentNote?.id) return;
        if (!window.confirm("Are you sure?")) return;
        try {
            await fetch(`/api/notes/${currentNote.id}`, {method: 'DELETE'});
            setNotes(prev => prev.filter(n => n.id !== currentNote.id));
            if (isMobile) setCurrentNote(null);
            else handleNewNote();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-full"><p>Loading...</p></div>;

    const editorView = (
        <div className="flex flex-col p-2 md:p-4 h-full">
            {currentNote ? (
                <div className="flex flex-col h-full min-h-0">
                    {isMobile ? (<div className="flex-shrink-0"><Button variant="ghost" size="icon" className="mr-2"
                                                                        onClick={() => setCurrentNote(null)}><ArrowLeft/></Button>
                        <textarea
                        rows={3} placeholder="Note Title" value={editorTitle}
                        onChange={e => setEditorTitle(e.target.value)}
                        className="note-title-textarea w-full text-2xl font-bold p-2 border-0 focus:ring-0 shadow-none bg-transparent resize-none"/>
                    </div>) : (<input placeholder="Note Title" value={editorTitle}
                                      onChange={e => setEditorTitle(e.target.value)}
                                      className="w-full text-2xl font-bold p-2 border-0 focus:ring-0 shadow-none bg-transparent flex-shrink-0"/>)}
                    <div className={isMobile ? "sticky-toolbar-container" : ""}><FormattingToolbar
                        onDelete={handleDeleteNote} onImageUpload={() => fileInputRef.current?.click()}
                        isNewNote={!currentNote.id}/></div>
                    <div ref={contentRef} contentEditable onInput={e => setEditorContent(e.currentTarget.innerHTML)}
                         onPaste={handlePaste} suppressContentEditableWarning
                         className="note-editor flex-grow p-4 border border-t-0 rounded-b-md bg-card text-card-foreground focus:outline-none overflow-y-auto"/>
                    <input type="file" ref={fileInputRef} onChange={handleImageUploadFromButton} accept="image/*"
                           style={{display: 'none'}}/>
                </div>
            ) : (!isMobile &&
                <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Select or
                    create a note.</p></div>)}
        </div>
    );

    const listView = (
        <aside className="flex flex-col border-r bg-background p-3 h-full overflow-y-hidden">
            <div className="flex justify-between items-center mb-4 flex-shrink-0"><h2 className="text-xl font-bold">My
                Notes</h2><Button onClick={handleNewNote}>New Note</Button></div>
            <div className="space-y-2 overflow-y-auto">
                {error && <p className="text-sm text-destructive">{error}</p>}
                {notes.map(note => (<Card key={note.id} onClick={() => setCurrentNote(note)}
                                          className={`cursor-pointer transition-colors hover:bg-accent ${currentNote?.id === note.id ? 'border-primary bg-accent' : ''}`}><CardHeader
                    className="pl-4 pr-4"><CardTitle className="text-md truncate">{note.title}</CardTitle><p
                    className="text-xs text-muted-foreground">{new Date(note.created_at).toLocaleDateString()}</p>
                </CardHeader></Card>))}
            </div>
        </aside>
    );

    return isMobile ? <div className="h-full w-full">{currentNote ? editorView : listView}</div> :
        <div className="grid h-full w-full md:grid-cols-[minmax(300px,_1fr)_3fr]">{listView}{editorView}</div>;
}