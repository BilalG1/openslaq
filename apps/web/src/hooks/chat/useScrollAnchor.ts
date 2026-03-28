import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

interface UseScrollAnchorOptions {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  /** Sentinel placed at the DOM start (visually at the bottom in column-reverse) — triggers loadNewer */
  topSentinelRef?: RefObject<HTMLDivElement | null>;
  /** Sentinel placed at the DOM end (visually at the top in column-reverse) — triggers loadOlder */
  bottomSentinelRef?: RefObject<HTMLDivElement | null>;
  items: { userId?: string }[];
  currentUserId: string | undefined;
  contextId: string;
  loadingOlder: boolean;
  hasOlder: boolean;
  loadOlder: () => void;
  loadingNewer?: boolean;
  hasNewer?: boolean;
  loadNewer?: () => void;
  enableScrollCache?: boolean;
}

/**
 * Scroll management for a column-reverse container.
 *
 * In column-reverse the browser naturally anchors to the bottom (scrollTop = 0).
 * Prepending older messages at the DOM end doesn't shift scrollTop, so no
 * manual compensation is needed.
 */
export function useScrollAnchor({
  scrollContainerRef,
  topSentinelRef,
  bottomSentinelRef,
  items,
  currentUserId,
  contextId,
  loadingOlder,
  hasOlder,
  loadOlder,
  loadingNewer,
  hasNewer,
  loadNewer,
  enableScrollCache,
}: UseScrollAnchorOptions): void {
  const prevItemCountRef = useRef<number>(0);
  const isNearBottomRef = useRef(true);
  const didInitialScrollRef = useRef(false);
  const prevContextIdRef = useRef<string>(contextId);
  const scrollPositionCache = useRef<Map<string, number>>(new Map());

  // Reset scroll state on context switch
  useEffect(() => {
    if (contextId !== prevContextIdRef.current) {
      if (enableScrollCache) {
        const container = scrollContainerRef.current;
        if (container && prevContextIdRef.current) {
          scrollPositionCache.current.set(prevContextIdRef.current, container.scrollTop);
        }
      }
      prevContextIdRef.current = contextId;
      didInitialScrollRef.current = false;
      prevItemCountRef.current = 0;
      isNearBottomRef.current = true;
    }
  }, [contextId, enableScrollCache, scrollContainerRef]);

  // Track whether user is near the bottom.
  // In column-reverse, scrollTop=0 is the bottom. Scrolling up makes scrollTop negative.
  // Near bottom = scrollTop is close to 0 (> -150).
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      isNearBottomRef.current = container.scrollTop > -150;
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef]);

  // Initial scroll and auto-scroll on new items
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const prevCount = prevItemCountRef.current;
    prevItemCountRef.current = items.length;
    if (!container || items.length <= prevCount) return;

    if (!didInitialScrollRef.current) {
      if (enableScrollCache) {
        const cached = scrollPositionCache.current.get(contextId);
        if (cached !== undefined) {
          container.scrollTop = cached;
          isNearBottomRef.current = cached > -150;
        }
        // else: column-reverse naturally starts at bottom (scrollTop=0), no action needed
      }
      // column-reverse naturally starts at bottom, no explicit scroll needed
      didInitialScrollRef.current = true;
      return;
    }

    // Auto-scroll when near bottom or when newest message is from current user
    const newestItem = items[items.length - 1];
    if (isNearBottomRef.current || newestItem?.userId === currentUserId) {
      container.scrollTop = 0; // bottom in column-reverse
    }
  }, [items.length, items, currentUserId, enableScrollCache, contextId, scrollContainerRef]);

  // Bottom sentinel IntersectionObserver — load older items (visually at top, DOM end)
  useEffect(() => {
    const sentinel = bottomSentinelRef?.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasOlder && !loadingOlder) {
          void loadOlder();
        }
      },
      { root: container, rootMargin: "200px 0px 0px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasOlder, loadingOlder, loadOlder, bottomSentinelRef, scrollContainerRef]);

  // Top sentinel IntersectionObserver — load newer items (visually at bottom, DOM start)
  useEffect(() => {
    const sentinel = topSentinelRef?.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container || !loadNewer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNewer && !loadingNewer) {
          void loadNewer();
        }
      },
      { root: container, rootMargin: "0px 0px 200px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNewer, loadingNewer, loadNewer, topSentinelRef, scrollContainerRef]);
}
