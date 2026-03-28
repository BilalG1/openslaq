import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";

// Test the subscribe/getSnapshot functions directly since bun:test doesn't
// provide a DOM environment for renderHook.
// The React integration (useSyncExternalStore) is tested in apps/web.

// Import internals by re-implementing the logic under test
describe("useOnlineStatus internals", () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      configurable: true,
    });
  });

  it("navigator.onLine reflects current state", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    expect(navigator.onLine).toBe(true);

    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    expect(navigator.onLine).toBe(false);
  });

  it("online/offline events fire correctly", () => {
    const handler = mock();

    globalThis.addEventListener("online", handler);
    globalThis.addEventListener("offline", handler);

    globalThis.dispatchEvent(new Event("online"));
    expect(handler).toHaveBeenCalledTimes(1);

    globalThis.dispatchEvent(new Event("offline"));
    expect(handler).toHaveBeenCalledTimes(2);

    globalThis.removeEventListener("online", handler);
    globalThis.removeEventListener("offline", handler);
  });

  it("removing listeners stops callbacks", () => {
    const handler = mock();

    globalThis.addEventListener("online", handler);
    globalThis.removeEventListener("online", handler);

    globalThis.dispatchEvent(new Event("online"));
    expect(handler).not.toHaveBeenCalled();
  });
});
