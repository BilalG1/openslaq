import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "../../test-utils";
import { useScrollAnchor } from "./useScrollAnchor";
import { type RefObject } from "react";

// --- IntersectionObserver mock ---
let intersectionCallback: IntersectionObserverCallback;
const observeMock = vi.fn();
const disconnectMock = vi.fn();

globalThis.IntersectionObserver = class {
  constructor(cb: IntersectionObserverCallback) {
    intersectionCallback = cb;
  }
  observe = observeMock;
  disconnect = disconnectMock;
  unobserve() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
} as unknown as typeof IntersectionObserver;

// --- DOM element mock helpers ---
function createMockContainer(overrides: Partial<HTMLDivElement> = {}) {
  const listeners: Record<string, EventListener> = {};
  return {
    scrollHeight: 1000,
    scrollTop: 0,
    clientHeight: 600,
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      listeners[event] = handler;
    }),
    removeEventListener: vi.fn(),
    _listeners: listeners,
    ...overrides,
  } as unknown as HTMLDivElement;
}

function createMockSentinel() {
  return {} as unknown as HTMLDivElement;
}

function makeRef<T>(value: T): RefObject<T> {
  return { current: value };
}

function defaultProps(overrides: Record<string, unknown> = {}) {
  const container = createMockContainer();
  const bottomSentinel = createMockSentinel();
  return {
    scrollContainerRef: makeRef(container),
    bottomSentinelRef: makeRef(bottomSentinel),
    items: [] as { userId?: string }[],
    currentUserId: "user-1",
    contextId: "channel-1",
    loadingOlder: false,
    hasOlder: true,
    loadOlder: vi.fn(),
    enableScrollCache: false,
    ...overrides,
  };
}

describe("useScrollAnchor (column-reverse)", () => {
  beforeEach(() => {
    observeMock.mockClear();
    disconnectMock.mockClear();
  });

  // --- 1. Initial scroll (column-reverse naturally starts at bottom) ---
  describe("initial scroll", () => {
    test("does not change scrollTop on first render (column-reverse starts at bottom naturally)", () => {
      const container = createMockContainer({ scrollHeight: 2000 } as Partial<HTMLDivElement>);
      const props = defaultProps({
        scrollContainerRef: makeRef(container),
        items: [{ userId: "user-2" }],
      });

      renderHook(() => useScrollAnchor(props));

      // column-reverse naturally starts at scrollTop=0 (bottom)
      expect(container.scrollTop).toBe(0);
    });

    test("does nothing when items array is empty", () => {
      const container = createMockContainer({ scrollHeight: 2000 } as Partial<HTMLDivElement>);
      const props = defaultProps({
        scrollContainerRef: makeRef(container),
        items: [],
      });

      renderHook(() => useScrollAnchor(props));

      expect(container.scrollTop).toBe(0);
    });
  });

  // --- 2. Scroll cache ---
  describe("scroll cache", () => {
    test("restores cached scroll position on context switch", () => {
      const container = createMockContainer({
        scrollHeight: 2000,
        clientHeight: 600,
      } as Partial<HTMLDivElement>);
      const items2 = [{ userId: "user-2" }, { userId: "user-2" }];
      const props = defaultProps({
        scrollContainerRef: makeRef(container),
        items: items2,
        contextId: "channel-1",
        enableScrollCache: true,
      });

      const { rerender } = renderHook(
        (p: ReturnType<typeof defaultProps>) => useScrollAnchor(p),
        { initialProps: props },
      );

      // Initial render — column-reverse starts at 0
      expect(container.scrollTop).toBe(0);

      // Simulate user scrolling up (negative in column-reverse)
      container.scrollTop = -500;
      const scrollHandler = (container.addEventListener as import("vitest").Mock).mock.calls.find(
        (c: unknown[]) => c[0] === "scroll",
      )?.[1] as () => void;
      act(() => scrollHandler());

      // Switch context
      const newProps = { ...props, contextId: "channel-2", items: items2 };
      rerender(newProps);

      // Add items for channel-2 to trigger initial scroll
      const ch2Items = [{ userId: "user-2" }, { userId: "user-2" }, { userId: "user-2" }];
      // In a real browser, column-reverse resets scrollTop to 0 when content changes.
      // Simulate that here since our mock doesn't have real layout behavior.
      container.scrollTop = 0;
      rerender({ ...newProps, items: ch2Items });

      // Switch back to channel-1
      rerender({ ...newProps, contextId: "channel-1", items: ch2Items });

      // Add an item so layout effect triggers with cache restore
      const ch1Items = [
        { userId: "user-2" },
        { userId: "user-2" },
        { userId: "user-2" },
        { userId: "user-2" },
      ];
      rerender({ ...newProps, contextId: "channel-1", items: ch1Items });

      // Should restore the cached scroll position of -500
      expect(container.scrollTop).toBe(-500);
    });
  });

  // --- 3. Auto-scroll on new messages when near bottom ---
  describe("auto-scroll on new messages", () => {
    test("scrolls to bottom when near bottom and new items arrive", () => {
      const container = createMockContainer({
        scrollHeight: 1000,
        clientHeight: 600,
      } as Partial<HTMLDivElement>);

      const props = defaultProps({
        scrollContainerRef: makeRef(container),
        items: [{ userId: "user-2" }],
      });

      const { rerender } = renderHook(
        (p: ReturnType<typeof defaultProps>) => useScrollAnchor(p),
        { initialProps: props },
      );

      // Simulate being near bottom: scrollTop > -150 in column-reverse
      container.scrollTop = -50;
      const scrollHandler = (container.addEventListener as import("vitest").Mock).mock.calls.find(
        (c: unknown[]) => c[0] === "scroll",
      )?.[1] as () => void;
      act(() => scrollHandler());

      // New message arrives
      rerender({ ...props, items: [{ userId: "user-2" }, { userId: "user-3" }] });

      // Should scroll to bottom (0 in column-reverse)
      expect(container.scrollTop).toBe(0);
    });
  });

  // --- 4. No auto-scroll when scrolled up ---
  describe("no auto-scroll when scrolled up", () => {
    test("does not scroll when user is scrolled away from bottom", () => {
      const container = createMockContainer({
        scrollHeight: 2000,
        clientHeight: 600,
      } as Partial<HTMLDivElement>);

      const props = defaultProps({
        scrollContainerRef: makeRef(container),
        items: [{ userId: "user-2" }],
      });

      const { rerender } = renderHook(
        (p: ReturnType<typeof defaultProps>) => useScrollAnchor(p),
        { initialProps: props },
      );

      // Simulate scrolling far up (large negative in column-reverse)
      container.scrollTop = -800;
      const scrollHandler = (container.addEventListener as import("vitest").Mock).mock.calls.find(
        (c: unknown[]) => c[0] === "scroll",
      )?.[1] as () => void;
      act(() => scrollHandler());

      // New message from someone else
      rerender({ ...props, items: [{ userId: "user-2" }, { userId: "user-3" }] });

      // Should NOT have scrolled — stays at -800
      expect(container.scrollTop).toBe(-800);
    });
  });

  // --- 5. Auto-scroll for own messages ---
  describe("auto-scroll for own messages", () => {
    test("scrolls to bottom for current user's own message even when scrolled up", () => {
      const container = createMockContainer({
        scrollHeight: 2000,
        clientHeight: 600,
      } as Partial<HTMLDivElement>);

      const props = defaultProps({
        scrollContainerRef: makeRef(container),
        items: [{ userId: "user-2" }],
        currentUserId: "user-1",
      });

      const { rerender } = renderHook(
        (p: ReturnType<typeof defaultProps>) => useScrollAnchor(p),
        { initialProps: props },
      );

      // Simulate scrolling far up
      container.scrollTop = -800;
      const scrollHandler = (container.addEventListener as import("vitest").Mock).mock.calls.find(
        (c: unknown[]) => c[0] === "scroll",
      )?.[1] as () => void;
      act(() => scrollHandler());

      // Own message arrives (last item has current user's id)
      rerender({ ...props, items: [{ userId: "user-2" }, { userId: "user-1" }] });

      // Should scroll to bottom (0) because it's the user's own message
      expect(container.scrollTop).toBe(0);
    });
  });

  // --- 6. IntersectionObserver triggers ---
  describe("IntersectionObserver", () => {
    test("calls loadOlder when bottom sentinel becomes visible (visually at top)", () => {
      const loadOlder = vi.fn();
      const props = defaultProps({
        loadOlder,
        hasOlder: true,
        loadingOlder: false,
      });

      renderHook(() => useScrollAnchor(props));

      expect(observeMock).toHaveBeenCalled();

      act(() => {
        intersectionCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      });

      expect(loadOlder).toHaveBeenCalledTimes(1);
    });

    test("does not call loadOlder when hasOlder is false", () => {
      const loadOlder = vi.fn();
      const props = defaultProps({
        loadOlder,
        hasOlder: false,
        loadingOlder: false,
      });

      renderHook(() => useScrollAnchor(props));

      act(() => {
        intersectionCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      });

      expect(loadOlder).not.toHaveBeenCalled();
    });

    test("does not call loadOlder when already loading", () => {
      const loadOlder = vi.fn();
      const props = defaultProps({
        loadOlder,
        hasOlder: true,
        loadingOlder: true,
      });

      renderHook(() => useScrollAnchor(props));

      act(() => {
        intersectionCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      });

      expect(loadOlder).not.toHaveBeenCalled();
    });

    test("calls loadNewer when top sentinel becomes visible (visually at bottom)", () => {
      const loadNewer = vi.fn();
      const topSentinel = createMockSentinel();
      const props = defaultProps({
        topSentinelRef: makeRef(topSentinel),
        loadNewer,
        hasNewer: true,
        loadingNewer: false,
      });

      renderHook(() => useScrollAnchor(props));

      act(() => {
        intersectionCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      });

      expect(loadNewer).toHaveBeenCalledTimes(1);
    });
  });

  // --- Edge cases ---
  describe("edge cases", () => {
    test("handles null scroll container gracefully", () => {
      const props = defaultProps({
        scrollContainerRef: makeRef(null),
        items: [{ userId: "user-2" }],
      });

      expect(() => renderHook(() => useScrollAnchor(props))).not.toThrow();
    });

    test("handles null sentinel refs gracefully", () => {
      const props = defaultProps({
        bottomSentinelRef: makeRef(null),
        items: [{ userId: "user-2" }],
      });

      expect(() => renderHook(() => useScrollAnchor(props))).not.toThrow();
    });
  });
});
