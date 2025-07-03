// src/hooks/use-debounce.ts
import { useState, useEffect } from 'react';

/**
 * A custom hook to debounce a value. It's used to delay the autosave
 * function until the user has stopped typing.
 * @param value The value to debounce (e.g., the note's title or content).
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the specified delay.
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up the timer if the value changes before the delay has passed.
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}