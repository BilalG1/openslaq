import { renderHook, act } from "@testing-library/react-native";
import { useNetworkMonitor } from "../useNetworkMonitor";

type NetInfoCallback = (state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}) => void;

let netInfoCallback: NetInfoCallback | null = null;
const mockUnsubscribe = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn((callback: NetInfoCallback) => {
    netInfoCallback = callback;
    return mockUnsubscribe;
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  netInfoCallback = null;
});

describe("useNetworkMonitor", () => {
  it("defaults to connected state", () => {
    const { result } = renderHook(() => useNetworkMonitor());
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBeNull();
  });

  it("updates when network goes offline", () => {
    const { result } = renderHook(() => useNetworkMonitor());

    act(() => {
      netInfoCallback?.({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
  });

  it("updates when network comes back online", () => {
    const { result } = renderHook(() => useNetworkMonitor());

    act(() => {
      netInfoCallback?.({ isConnected: false, isInternetReachable: false });
    });
    expect(result.current.isConnected).toBe(false);

    act(() => {
      netInfoCallback?.({ isConnected: true, isInternetReachable: true });
    });
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
  });

  it("handles null values from NetInfo", () => {
    const { result } = renderHook(() => useNetworkMonitor());

    act(() => {
      netInfoCallback?.({ isConnected: null, isInternetReachable: null });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBeNull();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useNetworkMonitor());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
