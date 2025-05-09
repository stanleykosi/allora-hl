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
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;
  
  // Ref to track if the component is mounted to prevent state updates after unmount
  const isMountedRef = useRef<boolean>(true);
  // Ref to store the fetcher function to avoid dependency issues in useEffect
  const fetcherFnRef = useRef(fetcherFn);
  fetcherFnRef.current = fetcherFn;

  // Helper function to perform fetch with timeout
  const fetchWithTimeout = async (timeoutMs: number): Promise<ActionState<T>> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const result = await fetcherFnRef.current();
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Function to perform the fetch with retries
  const performFetch = useCallback(async (isInitialLoad = false) => {
    // Don't fetch if already loading, unless it's the initial load
    if (isLoading && !isInitialLoad) {
      console.log('Fetch skipped: Already loading');
      return;
    }

    console.log(`Performing fetch... Initial: ${isInitialLoad}`);
    setIsLoading(true);
    setError(null);

    let lastError: Error | null = null;
    
    // Try fetching with exponential backoff
    for (let attempt = 0; attempt <= retryCountRef.current; attempt++) {
      try {
        const timeout = Math.min(10000 * Math.pow(2, attempt), 30000); // Start at 10s, max 30s
        console.log(`Attempt ${attempt + 1} with timeout ${timeout}ms`);
        
        const result = await fetchWithTimeout(timeout);

      if (isMountedRef.current) {
        if (result.isSuccess) {
          setData(result.data);
            setError(null);
            retryCountRef.current = 0; // Reset retry count on success
          console.log('Fetch successful.');
            break;
        } else {
            lastError = new Error(result.message);
          console.error('Fetch failed:', result.message, 'Error details:', result.error);
            
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
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        console.error(`Attempt ${attempt + 1} failed:`, err);
        
        // If we've hit max retries, or this isn't a timeout error, break
        if (attempt === retryCountRef.current || 
            !(lastError.message.includes('timeout') || lastError.message.includes('abort'))) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Handle final error state if all attempts failed
    if (lastError && isMountedRef.current) {
      const errorMessage = lastError.message;
        setError(errorMessage);
        
      if (errorMessage.includes("timeout") || errorMessage.includes("abort")) {
        retryCountRef.current = Math.min(retryCountRef.current + 1, maxRetries);
        console.warn(`Increased retry count to ${retryCountRef.current}`);
      }
      
      if (errorMessage.includes("network") || 
          errorMessage.includes("timeout") || 
          errorMessage.includes("fetch")) {
          console.warn("Network error detected - clearing stale data");
          setData(null);
        }
      }

    // Reset loading state if still mounted
      if (isMountedRef.current) {
        setIsLoading(false);
      }
  }, [isLoading]); // isLoading is included to prevent concurrent fetches

  // Effect for initial fetch and setting up the interval
  useEffect(() => {
    isMountedRef.current = true;
    retryCountRef.current = 0; // Reset retry count on mount
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