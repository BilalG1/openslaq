import { useState, useCallback, useRef, useEffect } from "react";
import type { ChannelId, SearchResultItem, UserId } from "@openslaq/shared";
import { searchMessages, getErrorMessage } from "@openslaq/client-core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { useServer } from "@/contexts/ServerContext";
import { useChatStore } from "@/contexts/ChatStoreProvider";

const RECENT_SEARCHES_KEY = "openslaq-recent-searches";
const MAX_RECENT_SEARCHES = 5;

export async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function saveRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return await loadRecentSearches();
  const existing = await loadRecentSearches();
  const filtered = existing.filter((q) => q !== trimmed);
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  return updated;
}

interface SearchFilters {
  q: string;
  channelId?: ChannelId;
  userId?: UserId;
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
  const { apiClient: api } = useServer();
  const [filters, setFilters] = useState<SearchFilters>({ q: "" });
  const [searchState, setSearchState] = useState<SearchState>({
    results: [],
    total: 0,
    loading: false,
    error: null,
    offset: 0,
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchGenRef = useRef(0);

  // Load recent searches on mount
  useEffect(() => {
    void loadRecentSearches().then(setRecentSearches);
  }, []);

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
      const gen = ++searchGenRef.current;

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

        // Ignore stale results from superseded searches
        if (gen !== searchGenRef.current) return;

        setSearchState((prev) => ({
          results: append ? [...prev.results, ...data.results] : data.results,
          total: data.total,
          loading: false,
          error: null,
          offset,
        }));

        // Save to recent searches on initial (non-paginated) successful search
        if (!append && data.results.length > 0) {
          void saveRecentSearch(searchFilters.q).then(setRecentSearches);
        }
      } catch (err) {
        if (gen !== searchGenRef.current) return;
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
    recentSearches,
    channels: state.channels,
    dms: state.dms,
  };
}
