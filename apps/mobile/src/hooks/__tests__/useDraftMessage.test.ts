import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDraftMessage } from "../useDraftMessage";

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useDraftMessage", () => {
  it("loads draft from AsyncStorage on mount", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("saved text");

    const { result } = renderHook(() => useDraftMessage("channel-1"));

    // Wait for async load
    await act(async () => {});

    expect(AsyncStorage.getItem).toHaveBeenCalledWith("openslaq-draft-channel-1");
    expect(result.current.draft).toBe("saved text");
    expect(result.current.isLoaded).toBe(true);
  });

  it("returns null draft when no saved value", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useDraftMessage("channel-2"));

    await act(async () => {});

    expect(result.current.draft).toBeNull();
    expect(result.current.isLoaded).toBe(true);
  });

  it("does nothing when draftKey is undefined", async () => {
    const { result } = renderHook(() => useDraftMessage(undefined));

    await act(async () => {});

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(result.current.draft).toBeNull();
    expect(result.current.isLoaded).toBe(true);
  });

  it("debounces saveDraft writes", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useDraftMessage("ch-1"));

    await act(async () => {});

    act(() => {
      result.current.saveDraft("he");
    });
    act(() => {
      result.current.saveDraft("hel");
    });
    act(() => {
      result.current.saveDraft("hello");
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("openslaq-draft-ch-1", "hello");
  });

  it("removes draft when saving empty/whitespace text", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("old");

    const { result } = renderHook(() => useDraftMessage("ch-1"));

    await act(async () => {});

    act(() => {
      result.current.saveDraft("   ");
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("openslaq-draft-ch-1");
  });

  it("clearDraft cancels pending timer and removes key", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useDraftMessage("ch-1"));

    await act(async () => {});

    act(() => {
      result.current.saveDraft("hello");
    });

    act(() => {
      result.current.clearDraft();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Only removeItem from clearDraft, not setItem from saveDraft
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("openslaq-draft-ch-1");
  });

  it("flushes pending save on unmount", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const { result, unmount } = renderHook(() => useDraftMessage("ch-1"));

    await act(async () => {});

    act(() => {
      result.current.saveDraft("unsaved work");
    });

    // Unmount before debounce fires
    unmount();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith("openslaq-draft-ch-1", "unsaved work");
  });
});
