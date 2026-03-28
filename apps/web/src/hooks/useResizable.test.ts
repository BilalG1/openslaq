import { describe, expect, test, beforeEach, afterEach } from "vitest";
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

  // ── Mouse drag tests ─────────────────────────────────────────

  test("full drag: mousedown → mousemove → mouseup updates width (right side)", () => {
    const { result } = renderHook(() => useResizable(defaultOpts));

    // Start drag at clientX=100
    act(() => {
      result.current.handleMouseDown({
        preventDefault: () => {},
        clientX: 100,
      } as React.MouseEvent);
    });

    expect(result.current.isDragging).toBe(true);
    expect(document.body.style.cursor).toBe("col-resize");

    // Move mouse to clientX=200 → delta = +100
    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 200 }));
    });

    // Width should be 300 + 100 = 400
    expect(result.current.width).toBe(400);

    // Release mouse
    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(result.current.isDragging).toBe(false);
    expect(document.body.style.cursor).toBe("");
    expect(document.body.style.userSelect).toBe("");
    // Persisted to localStorage
    expect(localStorage.getItem("test-resize")).toBe("400");
  });

  test("drag on left side subtracts delta", () => {
    const { result } = renderHook(() =>
      useResizable({ ...defaultOpts, side: "left" }),
    );

    act(() => {
      result.current.handleMouseDown({
        preventDefault: () => {},
        clientX: 300,
      } as React.MouseEvent);
    });

    // Move left by 50px (clientX goes from 300 to 250, delta = -50)
    // Left side: newWidth = startWidth - delta = 300 - (-50) = 350
    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 250 }));
    });

    expect(result.current.width).toBe(350);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  test("drag clamps at min boundary", () => {
    const { result } = renderHook(() => useResizable(defaultOpts));

    act(() => {
      result.current.handleMouseDown({
        preventDefault: () => {},
        clientX: 300,
      } as React.MouseEvent);
    });

    // Move left by 200 → 300 + (-200) = 100, clamped to min=200
    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 100 }));
    });

    expect(result.current.width).toBe(200);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  test("drag clamps at max boundary", () => {
    const { result } = renderHook(() => useResizable(defaultOpts));

    act(() => {
      result.current.handleMouseDown({
        preventDefault: () => {},
        clientX: 100,
      } as React.MouseEvent);
    });

    // Move right by 500 → 300 + 500 = 800, clamped to max=600
    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove", { clientX: 600 }));
    });

    expect(result.current.width).toBe(600);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });

    expect(localStorage.getItem("test-resize")).toBe("600");
  });
});
