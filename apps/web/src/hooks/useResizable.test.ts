import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { renderHook, act, cleanup } from "../test-utils";
import { useResizable } from "./useResizable";

describe("useResizable", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(cleanup);

  const defaultOpts = {
    side: "right" as const,
    min: 200,
    max: 600,
    defaultWidth: 300,
    storageKey: "test-resize",
  };

  test("initializes with defaultWidth when no stored value", () => {
    const { result } = renderHook(() => useResizable(defaultOpts));
    expect(result.current.width).toBe(300);
    expect(result.current.isDragging).toBe(false);
  });

  test("reads stored width from localStorage", () => {
    localStorage.setItem("test-resize", "400");
    const { result } = renderHook(() => useResizable(defaultOpts));
    expect(result.current.width).toBe(400);
  });

  test("clamps stored width to min", () => {
    localStorage.setItem("test-resize", "50");
    const { result } = renderHook(() => useResizable(defaultOpts));
    expect(result.current.width).toBe(200);
  });

  test("clamps stored width to max", () => {
    localStorage.setItem("test-resize", "9999");
    const { result } = renderHook(() => useResizable(defaultOpts));
    expect(result.current.width).toBe(600);
  });

  test("ignores non-numeric stored value", () => {
    localStorage.setItem("test-resize", "not-a-number");
    const { result } = renderHook(() => useResizable(defaultOpts));
    expect(result.current.width).toBe(300);
  });

  test("returns handleMouseDown function", () => {
    const { result } = renderHook(() => useResizable(defaultOpts));
    expect(typeof result.current.handleMouseDown).toBe("function");
  });

  test("cleans up document listeners on unmount during drag", () => {
    const { result, unmount } = renderHook(() => useResizable(defaultOpts));

    // Start a drag
    act(() => {
      result.current.handleMouseDown({
        preventDefault: () => {},
        clientX: 100,
      } as React.MouseEvent);
    });

    expect(result.current.isDragging).toBe(true);

    // Unmount while dragging — should clean up listeners and body styles
    unmount();

    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
  });
});
