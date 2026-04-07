import { useEffect, useState, useRef } from "react";
import { authorizedHeaders } from "../../lib/api-client";
import { env } from "../../env";

const API_URL = env.VITE_API_URL;

interface HuddleTokenResult {
  token: string | null;
  wsUrl: string | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Fetches a LiveKit token for the given channel.
 * Handles abort on unmount or channelId change.
 */
export function useHuddleToken(
  channelId: string | undefined,
  user: Parameters<typeof authorizedHeaders>[0],
): HuddleTokenResult {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!channelId || !user) {
      setToken(null);
      setWsUrl(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const abort = new AbortController();
    abortRef.current = abort;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const headers = await authorizedHeaders(user);
        const res = await fetch(`${API_URL}/api/huddle/join`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }

        const data = (await res.json()) as { token: string; wsUrl: string };
        if (!abort.signal.aborted) {
          setToken(data.token);
          setWsUrl(data.wsUrl);
          setIsLoading(false);
        }
      } catch (err) {
        if (abort.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to join huddle");
        setIsLoading(false);
      }
    })();

    return () => {
      abort.abort();
      abortRef.current = null;
    };
  }, [channelId, user]);

  return { token, wsUrl, error, isLoading };
}
