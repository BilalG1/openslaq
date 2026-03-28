import { describe, test, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "../../test-utils";
let capturedPlaceholder: string | undefined;

vi.mock("./FilePreviewList", () => ({ FilePreviewList: () => null }));
vi.mock("./ScheduleMessageDialog", () => ({ ScheduleMessageDialog: () => null }));
vi.mock("@openslaq/editor", () => ({
  RichTextEditor: ({ placeholder }: { placeholder?: string }) => {
    capturedPlaceholder = placeholder;
    return <div data-testid="editor">{placeholder}</div>;
  },
}));
vi.mock("react-router-dom", () => ({ useParams: () => ({ workspaceSlug: "default" }) }));
vi.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "u1", displayName: "Test", getAuthJson: async () => ({ accessToken: "t" }) }),
}));
vi.mock("../../state/chat-store", () => ({
  useChatStore: () => ({ state: { customEmojis: [] }, dispatch: () => {} }),
}));
vi.mock("../../hooks/chat/useMessageMutations", () => ({
  useMessageMutations: () => ({ sendMessage: vi.fn(), toggleReaction: vi.fn(), editMessage: vi.fn(), deleteMessage: vi.fn(), markAsUnread: vi.fn() }),
}));
vi.mock("../../hooks/useFileUpload", () => ({
  useFileUpload: () => ({ pendingFiles: [], uploadedAttachments: [], uploading: false, error: null, hasFiles: false, addFiles: vi.fn(), removeFile: vi.fn(), removeAttachment: vi.fn(), uploadAll: vi.fn(), reset: vi.fn() }),
}));
vi.mock("../../hooks/useDraftMessage", () => ({
  useDraftMessage: () => ({ draft: null, saveDraft: vi.fn(), clearDraft: vi.fn() }),
}));
vi.mock("../../hooks/api/useWorkspaceMembersApi", () => ({
  useWorkspaceMembersApi: () => ({ listMembers: vi.fn(async () => []) }),
}));
vi.mock("../../lib/api-client", () => ({ useAuthProvider: () => ({}) }));
vi.mock("../../api", () => ({ api: {} }));
vi.mock("../../lib/auth", () => ({ redirectToAuth: vi.fn() }));
vi.mock("../../lib/errors", () => ({ AuthError: class extends Error {} }));
vi.mock("@openslaq/client-core", () => ({ createScheduledMessageOp: vi.fn() }));

import { MessageInput } from "./MessageInput";

describe("MessageInput placeholder", () => {
  afterEach(() => {
    cleanup();
    capturedPlaceholder = undefined;
  });
  test("uses # prefix for channel names", () => {
    render(<MessageInput channelId="ch-1" channelName="general" />);
    expect(capturedPlaceholder).toBe("Message #general");
  });

  test("does not use # prefix for DM user names", () => {
    render(<MessageInput channelId="dm-1" channelName="Alice" isDm />);
    expect(capturedPlaceholder).not.toContain("#");
    expect(capturedPlaceholder).toBe("Message Alice");
  });
});
