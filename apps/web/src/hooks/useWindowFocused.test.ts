import { describe, expect, test, afterEach } from "bun:test";
import { renderHook, act, cleanup } from "../test-utils";
import { useWindowFocused } from "./useWindowFocused";

describe("useWindowFocused", () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(document, "hidden", { value: false, writable: true, configurable: true });
  });

  test("returns true when document is not hidden", () => {
    Object.defineProperty(document, "hidden", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useWindowFocused());
    expect(result.current).toBe(true);
  });

  test("returns false when document is hidden", () => {
    Object.defineProperty(document, "hidden", { value: true, writable: true, configurable: true });
    const { result } = renderHook(() => useWindowFocused());
    expect(result.current).toBe(false);
  });

  test("updates to false on blur event", () => {
    Object.defineProperty(document, "hidden", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useWindowFocused());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(result.current).toBe(false);
  });

  test("updates to true on focus event", () => {
    Object.defineProperty(document, "hidden", { value: true, writable: true, configurable: true });
    const { result } = renderHook(() => useWindowFocused());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current).toBe(true);
  });

  test("updates on visibilitychange event", () => {
    Object.defineProperty(document, "hidden", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useWindowFocused());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(document, "hidden", { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(false);
  });
});
