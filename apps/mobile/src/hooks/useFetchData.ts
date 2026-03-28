import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@openslaq/client-core";
import type { ApiError } from "@openslaq/client-core";

const MAX_RETRIES = 2;
const INITIAL_DELAY_MS = 500;

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // Retry network failures (fetch throws TypeError on network error)
  if (error instanceof TypeError) return true;
  // Retry server errors (5xx) and specific retryable status codes
  if (error.name === "ApiError" && "status" in error) {
    const status = (error as ApiError).status;
    return status >= 500 || status === 408 || status === 429;
  }
  // Don't retry anything else (AuthError, 4xx, generic errors)
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  cancelled: () => boolean,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (cancelled() || attempt === MAX_RETRIES || !isRetryable(e)) {
        throw e;
      }
      await delay(INITIAL_DELAY_MS * 2 ** attempt);
    }
  }

  throw lastError;
}

interface UseFetchDataOptions<T> {
  fetchFn: () => Promise<T>;
  deps: unknown[];
  enabled?: boolean;
  initialValue: T;
}

interface UseFetchDataResult<T> {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetchData<T>({
  fetchFn,
  deps,
  enabled = true,
  initialValue,
}: UseFetchDataOptions<T>): UseFetchDataResult<T> {
  const [data, setData] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  // Serialize deps to a stable string so we avoid spreading into dependency arrays
  // (spreading creates issues with ESLint exhaustive-deps and can cause infinite loops
  // when callers pass new object references with the same semantic value).
  const depsKey = JSON.stringify(deps);

  const execute = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWithRetry(
        () => fetchFnRef.current(),
        () => false,
      );
      setData(result);
    } catch (e) {
      setError(getErrorMessage(e, "An error occurred"));
    } finally {
      setLoading(false);
    }
  }, [enabled, depsKey]);
  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void fetchWithRetry(
      () => fetchFnRef.current(),
      () => cancelled,
    ).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    }).catch((e) => {
      if (cancelled) return;
      setError(getErrorMessage(e, "An error occurred"));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [enabled, depsKey]);
  return { data, setData, loading, error, refetch: execute };
}

// Exported for testing
export { isRetryable, fetchWithRetry };
