import { useState, useCallback, useRef, useEffect } from "react";
import type { SearchResultItem } from "@openslaq/shared";
import { searchMessages, getErrorMessage } from "@openslaq/client-core";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";

interface SearchFilters {
  q: string;
  channelId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

interface SearchState {
  results: SearchResultItem[];
  total: number;
  loading: boolean;
  error: string | null;
  offset: number;
}

export function useSearch(workspaceSlug: string | undefined) {
  const { state } = useChatStore();
  const { authProvider } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({ q: "" });
  const [searchState, setSearchState] = useState<SearchState>({
    results: [],
    total: 0,
    loading: false,
    error: null,
    offset: 0,
  });
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeSearch = useCallback(
    async (searchFilters: SearchFilters, offset: number, append: boolean) => {
      if (!searchFilters.q.trim()) {
        setSearchState({
          results: [],
          total: 0,
          loading: false,
          error: null,
          offset: 0,
        });
        return;
      }
      if (!workspaceSlug) {
        setSearchState({
          results: [],
          total: 0,
          loading: false,
          error: null,
          offset: 0,
        });
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setSearchState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await searchMessages(
          { api, auth: authProvider },
          {
            workspaceSlug,
            q: searchFilters.q,
            offset,
            limit: 20,
            channelId: searchFilters.channelId,
            userId: searchFilters.userId,
            fromDate: searchFilters.fromDate,
            toDate: searchFilters.toDate,
          },
        );

        setSearchState((prev) => ({
          results: append ? [...prev.results, ...data.results] : data.results,
          total: data.total,
          loading: false,
          error: null,
          offset,
        }));
      } catch (err) {
        setSearchState((prev) => ({
          ...prev,
          loading: false,
          error: getErrorMessage(err, "Search failed"),
        }));
      }
    },
    [authProvider, workspaceSlug],
  );

  const executeSearchRef = useRef(executeSearch);
  executeSearchRef.current = executeSearch;

  const updateFilters = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...newFilters };
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void executeSearchRef.current(next, 0, false);
        }, 300);
        return next;
      });
    },
    [],
  );

  const loadMore = useCallback(() => {
    const nextOffset = searchState.offset + 20;
    if (nextOffset >= searchState.total) return;
    void executeSearch(filters, nextOffset, true);
  }, [executeSearch, filters, searchState.offset, searchState.total]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFilters({ q: "" });
    setSearchState({
      results: [],
      total: 0,
      loading: false,
      error: null,
      offset: 0,
    });
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    filters,
    updateFilters,
    results: searchState.results,
    total: searchState.total,
    loading: searchState.loading,
    error: searchState.error,
    loadMore,
    hasMore: searchState.offset + 20 < searchState.total,
    reset,
    channels: state.channels,
    dms: state.dms,
  };
}
