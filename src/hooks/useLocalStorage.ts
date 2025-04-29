/**
 * @description
 * Custom React hook for managing state that is persisted in the browser's localStorage.
 * It synchronizes state changes with localStorage and retrieves the initial value
 * from localStorage on component mount if available.
 *
 * @dependencies
 * - react: Provides core hooks like `useState`, `useEffect`, `Dispatch`, `SetStateAction`.
 *
 * @notes
 * - Includes an SSR check (`typeof window !== 'undefined'`) to prevent errors during server-side rendering.
 * - Takes a storage key and an initial value (used if the key is not found in localStorage).
 * - Returns a state variable and a setter function, similar to `useState`.
 * - Handles potential errors during localStorage access (e.g., storage disabled, quota exceeded).
 * - Uses JSON serialization/deserialization to store complex values.
 */
"use client"; // This hook interacts with browser localStorage, so it must be client-side

import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * @description Custom hook to manage state synchronized with localStorage.
 * @template T The type of the state value to be stored.
 * @param {string} key The key under which the value will be stored in localStorage.
 * @param {T} initialValue The initial value to use if no value is found in localStorage for the given key.
 * @returns {[T, Dispatch<SetStateAction<T>>]} A tuple containing the current state value and a function to update it, similar to `useState`.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  // Function to safely get value from localStorage
  const readValueFromLocalStorage = (): T => {
    // Prevent build errors and issues during server-side rendering
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      // Parse stored json or return initialValue if item is null/undefined or parsing fails
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  };

  // State to store our value
  // Initialize state with value from localStorage or initialValue
  const [storedValue, setStoredValue] = useState<T>(readValueFromLocalStorage);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    // Prevent build errors and issues during server-side rendering
    if (typeof window === 'undefined') {
      console.warn(
        `Tried setting localStorage key “${key}” even though environment is not a client`,
      );
      return;
    }

    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      console.log(`Saved value for key "${key}" to localStorage.`);
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };

  // Effect to update state if localStorage changes elsewhere (e.g., in another tab)
  useEffect(() => {
    // This effect should only run on the client
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.storageArea === window.localStorage) {
        try {
          const newValue = event.newValue ? (JSON.parse(event.newValue) as T) : initialValue;
          setStoredValue(newValue);
          console.log(`localStorage key "${key}" updated from storage event.`);
        } catch (error) {
          console.warn(`Error parsing storage event for key “${key}”:`, error);
          setStoredValue(initialValue); // Fallback to initial value on parse error
        }
      }
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, initialValue]); // Dependencies ensure the listener updates if key/initialValue change

  // Re-read value from localStorage when the key changes
  useEffect(() => {
    setStoredValue(readValueFromLocalStorage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [storedValue, setValue];
}