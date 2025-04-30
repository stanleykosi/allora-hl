/**
 * @description
 * Custom React hook for periodically fetching data by calling a Server Action.
 * It manages the state related to data fetching, including loading status,
 * fetched data, potential errors, and provides a function to trigger a manual refresh.
 *
 * @dependencies
 * - react: Provides core hooks like `useState`, `useEffect`, `useCallback`, `useRef`.
 * - @/types: Uses the `ActionState` type for consistent handling of Server Action responses.
 *
 * @notes
 * - The hook takes a fetcher function (a Server Action), an interval in milliseconds, and optional initial data.
 * - Setting `intervalMs` to `null` or `0` disables periodic fetching.
 * - It handles the initial fetch immediately on mount (if interval is enabled).
 * - It uses `useRef` to keep track of the interval ID and prevent issues with stale closures in `useEffect`.
 * - The `refresh` function is memoized using `useCallback` to ensure stable identity.
 * - Error messages from the `ActionState` are captured and exposed.
 * - Loading state is managed to provide UI feedback during fetching.
 */
"use client"; // This hook is designed for client-side usage

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActionState } from '@/types';

/**
 * @description Return type for the usePeriodicFetcher hook.
 * @template T The type of data being fetched.
 * @property {T | null} data - The successfully fetched data, or null initially or on error.
 * @property {boolean} isLoading - True if a fetch operation is currently in progress.
 * @property {string | null} error - An error message string if the last fetch failed, otherwise null.
 * @property {() => Promise<void>} refresh - A function to manually trigger a data fetch.
 */
interface UsePeriodicFetcherResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * @description Custom hook to periodically fetch data using a Server Action.
 * @template T The expected type of data returned by the successful fetcher function.
 * @param {() => Promise<ActionState<T>>} fetcherFn - The Server Action function to call for fetching data. It must return a Promise resolving to an ActionState<T>.
 * @param {number | null} intervalMs - The interval in milliseconds for periodic fetching. Set to null or 0 to disable periodic fetching (only initial fetch and manual refresh will work).
 * @param {T} [initialData] - Optional initial data to use before the first fetch completes.
 * @returns {UsePeriodicFetcherResult<T>} An object containing the fetched data, loading state, error state, and a refresh function.
 */
export function usePeriodicFetcher<T>(
  fetcherFn: () => Promise<ActionState<T>>,
  intervalMs: number | null,
  initialData?: T,
): UsePeriodicFetcherResult<T> {
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to track if the component is mounted to prevent state updates after unmount
  const isMountedRef = useRef<boolean>(true);
  // Ref to store the fetcher function to avoid dependency issues in useEffect
  const fetcherFnRef = useRef(fetcherFn);
  fetcherFnRef.current = fetcherFn; // Keep the ref updated with the latest fetcher function

  // Function to perform the fetch
  const performFetch = useCallback(async (isInitialLoad = false) => {
    // Don't fetch if already loading, unless it's the initial load triggered by effect
    if (isLoading && !isInitialLoad) {
      console.log('Fetch skipped: Already loading');
      return;
    }

    console.log(`Performing fetch... Initial: ${isInitialLoad}`);
    setIsLoading(true);
    setError(null); // Clear previous error

    // Set a timeout to prevent the loading state from getting stuck
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && isLoading) {
        console.error('Fetch timeout: Taking too long to complete');
        setIsLoading(false);
        setError('Request timed out. The server took too long to respond.');
      }
    }, 15000); // 15 second timeout

    try {
      const result = await fetcherFnRef.current(); // Use the ref to call the function

      // Clear the timeout since the fetch completed
      clearTimeout(timeoutId);

      // Only update state if the component is still mounted
      if (isMountedRef.current) {
        if (result.isSuccess) {
          setData(result.data);
          setError(null); // Clear error on success
          console.log('Fetch successful.');
        } else {
          setError(result.message);
          console.error('Fetch failed:', result.message, 'Error details:', result.error);
          // Do NOT clear data on normal errors to prevent flashing/disruption
          // Only clear data for specific critical errors
          if (result.message && (
            result.message.includes("timeout") || 
            result.message.includes("unauthorized") ||
            result.message.includes("invalid key") ||
            result.message.includes("authentication")
          )) {
            console.warn("Critical error detected - clearing stale data");
            setData(null);
          }
        }
      }
    } catch (err: unknown) {
      // Clear the timeout since the fetch completed (with an error)
      clearTimeout(timeoutId);

      console.error('Fetch exception:', err);
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during fetch.';
        setError(errorMessage);
        
        // Only clear data for network errors or serious exceptions
        if (err instanceof Error && (
          errorMessage.includes("network") || 
          errorMessage.includes("timeout") || 
          errorMessage.includes("fetch")
        )) {
          console.warn("Network error detected - clearing stale data");
          setData(null);
        }
      }
    } finally {
      // Clear the timeout since the fetch completed
      clearTimeout(timeoutId);

      // Only set loading false if mounted
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading]); // isLoading is included to prevent concurrent fetches from manual refresh

  // Effect for initial fetch and setting up the interval
  useEffect(() => {
    isMountedRef.current = true;
    console.log(`Setting up periodic fetcher. Interval: ${intervalMs}ms`);

    // Perform initial fetch immediately if interval is valid
    if (intervalMs !== null && intervalMs > 0) {
      performFetch(true); // Pass true for initial load

      // Clear any existing interval before setting a new one
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }

      // Set up the interval
      intervalIdRef.current = setInterval(() => {
        console.log('Interval triggered fetch.');
        performFetch();
      }, intervalMs);
    } else {
      // If interval is disabled, still perform an initial fetch
      performFetch(true);
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false; // Mark as unmounted
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        console.log('Cleared fetch interval.');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, performFetch]); // performFetch is memoized and stable if fetcherFn is stable

  // Manual refresh function
  const refresh = useCallback(async () => {
    console.log('Manual refresh triggered.');
    await performFetch();
  }, [performFetch]);

  return { data, isLoading, error, refresh };
}