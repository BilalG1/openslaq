import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "../../test-utils";

// --- Mocks ---

const mockDispatch = vi.fn();
vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({
    state: {
      workspaces: [{ slug: "ws" }],
      messagesById: {},
    },
    dispatch: mockDispatch,
  }),
}));

vi.mock("../../lib/api-client", () => ({
  useAuthProvider: () => ({
    getAccessToken: async () => "tok",
    requireAccessToken: async () => "tok",
    onAuthRequired: () => {},
  }),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ workspaceSlug: "test-workspace" }),
}));

vi.mock("../../gallery/gallery-context", () => ({
  useGalleryMode: () => false,
}));

vi.mock("../useCurrentUserProfile", () => ({
  useCurrentUserProfile: () => ({ profile: { avatarUrl: "https://example.com/alice.jpg" }, refresh: async () => {} }),
}));

vi.mock("../../api", () => ({
  api: {},
}));

// Mock coreSendMessage to capture what it receives
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { mockCoreSendMessage } = vi.hoisted(() => ({
  mockCoreSendMessage: vi.fn<(deps: unknown, params: Record<string, unknown>) => Promise<boolean>>(async () => true),
}));
vi.mock("@openslaq/client-core", async () => {
  const actual = await vi.importActual<typeof import("@openslaq/client-core")>("@openslaq/client-core");
  return {
    ...actual,
    sendMessage: mockCoreSendMessage,
  };
});

import { useMessageMutations } from "./useMessageMutations";

// --- Tests ---

describe("useMessageMutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  describe("optimistic message sender identity", () => {
    test("optimistic message uses user's real display name, not a placeholder", async () => {
      const user = {
        id: "user-42",
        displayName: "Alice Johnson",
        profileImageUrl: "https://example.com/alice.jpg",
        getAuthJson: async () => ({ accessToken: "tok" }),
      };

      const { result } = renderHook(() => useMessageMutations(user));

      await act(async () => {
        await result.current.sendMessage({
          channelId: "ch-1",
          workspaceSlug: "test-workspace",
          content: "Hello world",
        });
      });

      expect(mockCoreSendMessage).toHaveBeenCalledTimes(1);
      const params = mockCoreSendMessage.mock.calls[0]![1];

      // Must use the real display name — not "You" or any other placeholder
      expect(params.senderDisplayName).toBe("Alice Johnson");
    });

    test("optimistic message uses user's real avatar URL", async () => {
      const user = {
        id: "user-42",
        displayName: "Alice Johnson",
        profileImageUrl: "https://example.com/alice.jpg",
        getAuthJson: async () => ({ accessToken: "tok" }),
      };

      const { result } = renderHook(() => useMessageMutations(user));

      await act(async () => {
        await result.current.sendMessage({
          channelId: "ch-1",
          workspaceSlug: "test-workspace",
          content: "Hello world",
        });
      });

      const params = mockCoreSendMessage.mock.calls[0]![1];

      // Must pass the avatar URL so it renders immediately, not pop in later
      expect(params.senderAvatarUrl).toBe("https://example.com/alice.jpg");
    });

    test("optimistic message uses user ID as fallback when displayName is missing", async () => {
      const user = {
        id: "user-42",
        getAuthJson: async () => ({ accessToken: "tok" }),
      };

      const { result } = renderHook(() => useMessageMutations(user));

      await act(async () => {
        await result.current.sendMessage({
          channelId: "ch-1",
          workspaceSlug: "test-workspace",
          content: "Hello world",
        });
      });

      const params = mockCoreSendMessage.mock.calls[0]![1];

      // Should fall back to user ID, not "You"
      expect(params.senderDisplayName).not.toBe("You");
    });
  });
});
