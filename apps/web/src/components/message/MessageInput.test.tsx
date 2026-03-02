import { describe, test, expect, afterEach, jest, mock } from "bun:test";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";

// Mock sub-components
mock.module("./FilePreviewList", () => ({
  FilePreviewList: () => null,
}));
mock.module("./ScheduleMessageDialog", () => ({
  ScheduleMessageDialog: () => null,
}));

// Mock editor as a simple button that triggers onSubmit
mock.module("@openslaq/editor", () => ({
  RichTextEditor: ({ onSubmit }: { onSubmit?: (md: string) => void }) => (
    <button data-testid="mock-send" onClick={() => onSubmit?.("hello")}>
      Send
    </button>
  ),
}));

// Mock hooks
mock.module("react-router-dom", () => ({
  useParams: () => ({ workspaceSlug: "default" }),
}));

mock.module("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    id: "user-1",
    displayName: "Test User",
    getAuthJson: async () => ({ accessToken: "tok" }),
  }),
}));

mock.module("../../state/chat-store", () => ({
  useChatStore: () => ({
    state: { customEmojis: [] },
    dispatch: jest.fn(),
  }),
}));

const mockSendMessage = jest.fn(async () => true);
mock.module("../../hooks/chat/useMessageMutations", () => ({
  useMessageMutations: () => ({
    sendMessage: mockSendMessage,
    toggleReaction: jest.fn(),
    editMessage: jest.fn(),
    deleteMessage: jest.fn(),
    markAsUnread: jest.fn(),
  }),
}));

mock.module("../../hooks/useFileUpload", () => ({
  useFileUpload: () => ({
    pendingFiles: [],
    uploadedAttachments: [],
    uploading: false,
    error: null,
    hasFiles: false,
    addFiles: jest.fn(),
    removeFile: jest.fn(),
    removeAttachment: jest.fn(),
    uploadAll: jest.fn(async () => []),
    reset: jest.fn(),
  }),
}));

mock.module("../../hooks/useDraftMessage", () => ({
  useDraftMessage: () => ({
    draft: null,
    saveDraft: jest.fn(),
    clearDraft: jest.fn(),
  }),
}));

const mockListMembers = jest.fn(async () => []);
mock.module("../../hooks/api/useWorkspaceMembersApi", () => ({
  useWorkspaceMembersApi: () => ({
    listMembers: mockListMembers,
  }),
}));

mock.module("../../lib/api-client", () => ({
  useAuthProvider: () => ({}),
}));

mock.module("../../api", () => ({
  api: {},
}));

mock.module("../../lib/auth", () => ({
  redirectToAuth: jest.fn(),
}));

mock.module("../../lib/errors", () => ({
  AuthError: class AuthError extends Error {},
}));

mock.module("@openslaq/client-core", () => ({
  createScheduledMessageOp: jest.fn(),
}));

const { MessageInput } = await import("./MessageInput");

describe("MessageInput", () => {
  afterEach(() => {
    cleanup();
    mockSendMessage.mockClear();
  });

  test("prevents double submit while first submit is in-flight", async () => {
    let resolveSend!: (value: boolean) => void;
    mockSendMessage.mockImplementation(
      () => new Promise<boolean>((resolve) => { resolveSend = resolve; }),
    );

    render(<MessageInput channelId="ch-1" />);

    const sendButton = screen.getByTestId("mock-send");

    // First click — starts submit
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    // Second click while first is still in-flight — should be blocked
    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    // Resolve the first send to clean up
    await act(async () => {
      resolveSend(true);
    });
  });
});
