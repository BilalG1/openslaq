import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

interface UseScrollAnchorOptions {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  topSentinelRef: RefObject<HTMLDivElement | null>;
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
  const prevScrollHeightRef = useRef<number>(0);
  const prevScrollTopRef = useRef<number>(0);
  const isPrependingRef = useRef(false);
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

  // Track whether user is near the bottom of the scroll container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [scrollContainerRef]);

  // Mark when a prepend starts
  useEffect(() => {
    if (loadingOlder) {
      const container = scrollContainerRef.current;
      if (container) {
        prevScrollHeightRef.current = container.scrollHeight;
        prevScrollTopRef.current = container.scrollTop;
        isPrependingRef.current = true;
      }
    }
  }, [loadingOlder, scrollContainerRef]);

  // Scroll anchoring: prepend preservation, initial scroll-to-bottom, auto-scroll on new items
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const prevCount = prevItemCountRef.current;
    prevItemCountRef.current = items.length;
    if (!container || items.length <= prevCount) return;

    if (isPrependingRef.current) {
      const heightDelta = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop = prevScrollTopRef.current + heightDelta;
      isPrependingRef.current = false;
      return;
    }
    if (!didInitialScrollRef.current) {
      if (enableScrollCache) {
        const cached = scrollPositionCache.current.get(contextId);
        if (cached !== undefined) {
          container.scrollTop = cached;
          isNearBottomRef.current = container.scrollHeight - cached - container.clientHeight < 150;
        } else {
          container.scrollTop = container.scrollHeight;
        }
      } else {
        container.scrollTop = container.scrollHeight;
      }
      didInitialScrollRef.current = true;
      return;
    }
    const newestItem = items[items.length - 1];
    if (isNearBottomRef.current || newestItem?.userId === currentUserId) {
      container.scrollTop = container.scrollHeight;
    }
  }, [items.length, items, currentUserId, enableScrollCache, contextId, scrollContainerRef]);

  // Top IntersectionObserver — load older items
  useEffect(() => {
    const sentinel = topSentinelRef.current;
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
  }, [hasOlder, loadingOlder, loadOlder, topSentinelRef, scrollContainerRef]);

  // Bottom IntersectionObserver — load newer items (optional)
  useEffect(() => {
    const sentinel = bottomSentinelRef?.current;
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
  }, [hasNewer, loadingNewer, loadNewer, bottomSentinelRef, scrollContainerRef]);
}
