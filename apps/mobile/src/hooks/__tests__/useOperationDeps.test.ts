import { renderHook } from "@testing-library/react-native";
import { useOperationDeps, useApiDeps } from "../useOperationDeps";
import { api } from "@/lib/api";

const mockAuthProvider = {
  getAccessToken: jest.fn(),
  requireAccessToken: jest.fn(),
  onAuthRequired: jest.fn(),
};

const mockState = { channels: [] };
const mockDispatch = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ authProvider: mockAuthProvider }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({ state: mockState, dispatch: mockDispatch }),
}));

jest.mock("@openslaq/client-core", () => ({
  createApiClient: jest.fn(() => ({ __api: "mock" })),
}));

describe("useOperationDeps", () => {
  it("returns api, auth, dispatch, and getState", () => {
    const { result } = renderHook(() => useOperationDeps());
    expect(result.current.api).toBe(api);
    expect(result.current.auth).toBe(mockAuthProvider);
    expect(result.current.dispatch).toBe(mockDispatch);
    expect(result.current.getState()).toBe(mockState);
  });

  it("getState returns latest state via ref", () => {
    const { result, rerender } = renderHook(() => useOperationDeps());
    const getState = result.current.getState;
    expect(getState()).toBe(mockState);
    // After rerender, getState still returns current state
    rerender({});
    expect(getState()).toBe(mockState);
  });
});

describe("useApiDeps", () => {
  it("returns api and auth only", () => {
    const { result } = renderHook(() => useApiDeps());
    expect(result.current.api).toBe(api);
    expect(result.current.auth).toBe(mockAuthProvider);
    expect((result.current as unknown as Record<string, unknown>).dispatch).toBeUndefined();
    expect((result.current as unknown as Record<string, unknown>).getState).toBeUndefined();
  });
});
