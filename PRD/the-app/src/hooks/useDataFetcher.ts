import { useEffect, useState, useCallback } from 'react';

interface FetchState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isDataReady: boolean;
  showSpinner: boolean;
}

interface UseDataFetcherOptions {
  spinnerDelay?: number;
  retryCount?: number;
  retryDelay?: number;
}

export function useDataFetcher<T>(
  url: string,
  options: UseDataFetcherOptions = {}
) {
  const { 
    spinnerDelay = 500, 
    retryCount = 0,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    isLoading: true,
    isDataReady: false,
    showSpinner: false,
  });

  const fetchData = useCallback(async (attempt = 0): Promise<void> => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();
      
      setState({
        data,
        error: null,
        isLoading: false,
        isDataReady: true,
        showSpinner: false,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An error occurred';
      
      // Retry logic
      if (attempt < retryCount) {
        setTimeout(() => {
          fetchData(attempt + 1);
        }, retryDelay);
        return;
      }
      
      setState({
        data: null,
        error,
        isLoading: false,
        isDataReady: true,
        showSpinner: false,
      });
    }
  }, [url, retryCount, retryDelay]);

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();

    // Reset state
    setState({
      data: null,
      error: null,
      isLoading: true,
      isDataReady: false,
      showSpinner: false,
    });

    // Set up spinner timer
    const spinnerTimer = setTimeout(() => {
      if (mounted) {
        setState(prev => ({ ...prev, showSpinner: true }));
      }
    }, spinnerDelay);

    // Fetch data
    const doFetch = async () => {
      try {
        const response = await fetch(url, {
          signal: abortController.signal
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (mounted) {
          clearTimeout(spinnerTimer);
          setState({
            data,
            error: null,
            isLoading: false,
            isDataReady: true,
            showSpinner: false,
          });
        }
      } catch (err) {
        if (mounted) {
          clearTimeout(spinnerTimer);
          // Don't set error for abort
          if (err instanceof Error && err.name !== 'AbortError') {
            setState({
              data: null,
              error: err.message,
              isLoading: false,
              isDataReady: true,
              showSpinner: false,
            });
          }
        }
      }
    };

    doFetch();

    return () => {
      mounted = false;
      abortController.abort();
      clearTimeout(spinnerTimer);
    };
  }, [url, spinnerDelay]);

  const retry = useCallback(() => {
    fetchData(0);
  }, [fetchData]);

  return {
    ...state,
    retry,
  };
}