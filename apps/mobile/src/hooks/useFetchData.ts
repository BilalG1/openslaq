import { useCallback, useEffect, useRef, useState } from "react";

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

  const execute = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void fetchFnRef.current().then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    }).catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : "An error occurred");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [enabled, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, setData, loading, error, refetch: execute };
}
