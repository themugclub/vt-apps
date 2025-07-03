// src/components/ui/FormattingToolbar.tsx
"use client";

import { Bold, Italic, Underline, List, ListOrdered, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface FormattingToolbarProps {
    onDelete: () => void;
    onImageUpload: () => void;
    isNewNote: boolean;
}

const FormattingToolbar = ({ onDelete, onImageUpload, isNewNote }: FormattingToolbarProps) => {
    const applyFormat = (command: string) => document.execCommand(command, false);

    return (
        <div className="flex items-center gap-1 p-1 border rounded-t-md bg-background flex-wrap">
            <Button variant="ghost" size="icon" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat('bold')} aria-label="Bold">
                <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat('italic')} aria-label="Italic">
                <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat('underline')} aria-label="Underline">
                <Underline className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="icon" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat('insertUnorderedList')} aria-label="Unordered List">
                <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onMouseDown={e => e.preventDefault()} onClick={() => applyFormat('insertOrderedList')} aria-label="Ordered List">
                <ListOrdered className="h-4 w-4" />
            </Button>
            {/* FIX: Image upload button added */}
            <Button variant="ghost" size="icon" onMouseDown={e => e.preventDefault()} onClick={onImageUpload} aria-label="Upload Image">
                <ImageIcon className="h-4 w-4" />
            </Button>
            <div className="flex-grow" />
            <Button variant="ghost" size="icon" onMouseDown={e => e.preventDefault()} onClick={onDelete} disabled={isNewNote} aria-label="Delete Note">
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    );
}

export default FormattingToolbar;