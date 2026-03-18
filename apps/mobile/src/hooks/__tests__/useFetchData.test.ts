import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useFetchData } from "../useFetchData";

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

  it("handles errors", async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: [] as string[] }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe("fail");
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

  it("returns initialValue before fetch completes", () => {
    const fetchFn = jest.fn().mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() =>
      useFetchData({ fetchFn, deps: [], initialValue: "init" }),
    );

    expect(result.current.data).toBe("init");
    expect(result.current.loading).toBe(true);
  });
});
