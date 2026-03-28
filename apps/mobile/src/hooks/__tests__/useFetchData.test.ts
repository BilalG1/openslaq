import { renderHook, act, waitFor } from "@testing-library/react-native";
import { AuthError, ApiError } from "@openslaq/client-core";
import { useFetchData, isRetryable, fetchWithRetry } from "../useFetchData";

describe("useFetchData", () => {
  it("fetches data on mount", async () => {
    const fetchFn = jest.fn().mockResolvedValue(["a", "b"]);

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: [] as string[] }),
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(["a", "b"]);
    expect(result.current.error).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("handles non-retryable errors immediately", async () => {
    const fetchFn = jest.fn().mockRejectedValue(new AuthError("auth fail"));

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: [] as string[] }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe("auth fail");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when enabled is false", async () => {
    const fetchFn = jest.fn().mockResolvedValue(["x"]);

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], enabled: false, initialValue: [] as string[] }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it("refetches data when refetch is called", async () => {
    let callCount = 0;
    const fetchFn = jest.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve([`call-${callCount}`]);
    });

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: [] as string[] }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(["call-1"]);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual(["call-2"]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("supports optimistic update via setData", async () => {
    const fetchFn = jest.fn().mockResolvedValue(["fetched"]);

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: [] as string[] }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(["fetched"]);

    act(() => {
      result.current.setData(["optimistic"]);
    });

    expect(result.current.data).toEqual(["optimistic"]);
  });

  it("does not re-fetch when deps values are stable", async () => {
    const fetchFn = jest.fn().mockResolvedValue("data");
    const stableValue = "stable";

    const { result, rerender } = renderHook(
      ({ dep }: { dep: string }) =>
        useFetchData({ fetchFn, deps: [dep], initialValue: "" }),
      { initialProps: { dep: stableValue } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Re-render with the same dep value
    rerender({ dep: stableValue });
    rerender({ dep: stableValue });

    // Should still be 1 — deps values haven't changed
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns initialValue before fetch completes", () => {
    const fetchFn = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: "init" }),
    );

    expect(result.current.data).toBe("init");
    expect(result.current.loading).toBe(true);
  });

  it("retries on network error then succeeds", async () => {
    jest.useFakeTimers();
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(["recovered"]);

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: [] as string[] }),
    );

    // Advance past the retry delay
    await act(async () => { jest.advanceTimersByTime(1000); });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(["recovered"]);
    expect(result.current.error).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("gives up after max retries and surfaces error", async () => {
    jest.useFakeTimers();
    const fetchFn = jest.fn().mockRejectedValue(new TypeError("Network request failed"));

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: [] as string[] }),
    );

    // Each retry: rejected promise flushes, then setTimeout(delay) is scheduled.
    // We need to advance timers step by step to let each retry's promise chain settle.
    for (let i = 0; i < 5; i++) {
      await act(async () => { jest.advanceTimersByTime(1500); });
    }

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network request failed");
    // 1 initial + 2 retries = 3 total
    expect(fetchFn).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  it("retries on 5xx server error", async () => {
    jest.useFakeTimers();
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(503, "Service Unavailable"))
      .mockResolvedValueOnce("ok");

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: "" }),
    );

    await act(async () => { jest.advanceTimersByTime(1000); });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe("ok");
    expect(fetchFn).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("does not retry on 4xx client error", async () => {
    const fetchFn = jest.fn().mockRejectedValue(new ApiError(404, "Not found"));

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: "" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Not found");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("isRetryable", () => {
  it("returns false for AuthError", () => {
    expect(isRetryable(new AuthError())).toBe(false);
  });

  it("returns false for 4xx ApiError", () => {
    expect(isRetryable(new ApiError(400, "Bad request"))).toBe(false);
    expect(isRetryable(new ApiError(404, "Not found"))).toBe(false);
    expect(isRetryable(new ApiError(422, "Unprocessable"))).toBe(false);
  });

  it("returns true for 408 and 429", () => {
    expect(isRetryable(new ApiError(408, "Timeout"))).toBe(true);
    expect(isRetryable(new ApiError(429, "Too many requests"))).toBe(true);
  });

  it("returns true for 5xx ApiError", () => {
    expect(isRetryable(new ApiError(500, "Internal server error"))).toBe(true);
    expect(isRetryable(new ApiError(503, "Service unavailable"))).toBe(true);
  });

  it("returns true for TypeError (network failure)", () => {
    expect(isRetryable(new TypeError("Network request failed"))).toBe(true);
  });

  it("returns false for generic Error", () => {
    expect(isRetryable(new Error("something unexpected"))).toBe(false);
  });
});

describe("fetchWithRetry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns on first success without retry", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await fetchWithRetry(fn, () => false);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stops retrying when cancelled", async () => {
    let attempt = 0;
    const fn = jest.fn().mockImplementation(() => {
      attempt++;
      return Promise.reject(new TypeError("fail"));
    });

    await expect(
      fetchWithRetry(fn, () => attempt >= 1),
    ).rejects.toThrow("fail");

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
