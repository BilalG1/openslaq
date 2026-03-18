import { renderHook, act } from "@testing-library/react-native";
import { editMessage, deleteMessage, toggleReaction } from "@openslaq/client-core";
import { api } from "@/lib/api";
import { useMessageActions } from "../useMessageActions";

const mockAuthProvider = {
  getAccessToken: jest.fn(),
  requireAccessToken: jest.fn(),
  onAuthRequired: jest.fn(),
};

const mockState = { activeChannelId: "channel-1" };
const mockDispatch = jest.fn();

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ authProvider: mockAuthProvider }),
}));

jest.mock("@/contexts/ChatStoreProvider", () => ({
  useChatStore: () => ({ state: mockState, dispatch: mockDispatch }),
}));

jest.mock("@openslaq/client-core", () => ({
  createApiClient: jest.fn(() => ({ __api: "mock-api-client" })),
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  toggleReaction: jest.fn(),
}));

const editMessageMock = editMessage as jest.Mock;
const deleteMessageMock = deleteMessage as jest.Mock;
const toggleReactionMock = toggleReaction as jest.Mock;

describe("useMessageActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls editMessage with expected dependencies", async () => {
    const { result } = renderHook(() => useMessageActions("user-1"));

    await act(async () => {
      await result.current.handleEditMessage("message-1", "updated");
    });

    expect(editMessageMock).toHaveBeenCalledTimes(1);
    const [deps, payload] = editMessageMock.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(deps.api).toBe(api);
    expect(deps.auth).toBe(mockAuthProvider);
    expect(deps.dispatch).toBe(mockDispatch);
    expect((deps.getState as () => unknown)()).toBe(mockState);
    expect(payload).toEqual({ messageId: "message-1", content: "updated" });
  });

  it("calls deleteMessage with expected payload", async () => {
    const { result } = renderHook(() => useMessageActions("user-1"));

    await act(async () => {
      await result.current.handleDeleteMessage("message-2");
    });

    expect(deleteMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        api,
        auth: mockAuthProvider,
        dispatch: mockDispatch,
      }),
      { messageId: "message-2" },
    );
  });

  it("does not call toggleReaction when no userId is available", async () => {
    const { result } = renderHook(() => useMessageActions());

    await act(async () => {
      await result.current.handleToggleReaction("message-3", ":+1:");
    });

    expect(toggleReactionMock).not.toHaveBeenCalled();
  });

  it("calls toggleReaction with current userId", async () => {
    const { result } = renderHook(() => useMessageActions("user-42"));

    await act(async () => {
      await result.current.handleToggleReaction("message-3", ":+1:");
    });

    expect(toggleReactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        api,
        auth: mockAuthProvider,
        dispatch: mockDispatch,
      }),
      { messageId: "message-3", emoji: ":+1:", userId: "user-42" },
    );
  });
});
