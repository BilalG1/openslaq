import { describe, test, expect, jest } from "bun:test";
import { renderHook, cleanup } from "../../test-utils";
import { useAsyncEffect } from "../useAsyncEffect";

describe("useAsyncEffect", () => {
  test("calls the effect on mount", () => {
    const effect = jest.fn(async () => {});
    renderHook(() => useAsyncEffect(effect, []));
    expect(effect).toHaveBeenCalledTimes(1);
    cleanup();
  });

  test("passes a signal object with cancelled=false", () => {
    let receivedSignal: { cancelled: boolean } | null = null;
    renderHook(() =>
      useAsyncEffect(async (signal) => {
        receivedSignal = signal;
      }, []),
    );
    expect(receivedSignal).not.toBeNull();
    expect(receivedSignal!.cancelled).toBe(false);
    cleanup();
  });

  test("sets signal.cancelled=true on cleanup", () => {
    let receivedSignal: { cancelled: boolean } | null = null;
    const { unmount } = renderHook(() =>
      useAsyncEffect(async (signal) => {
        receivedSignal = signal;
      }, []),
    );
    expect(receivedSignal!.cancelled).toBe(false);
    unmount();
    expect(receivedSignal!.cancelled).toBe(true);
    cleanup();
  });

  test("re-runs effect when deps change and cancels previous", () => {
    const signals: Array<{ cancelled: boolean }> = [];
    const { rerender } = renderHook(
      ({ dep }: { dep: number }) =>
        useAsyncEffect(async (signal) => {
          signals.push(signal);
        }, [dep]),
      { initialProps: { dep: 1 } },
    );

    expect(signals.length).toBe(1);
    expect(signals[0]!.cancelled).toBe(false);

    rerender({ dep: 2 });

    expect(signals.length).toBe(2);
    // First signal should be cancelled
    expect(signals[0]!.cancelled).toBe(true);
    // Second signal should be active
    expect(signals[1]!.cancelled).toBe(false);
    cleanup();
  });
});
