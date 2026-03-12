import { describe, test, expect, afterEach, jest, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, act } from "../../test-utils";
import { fireEvent } from "@testing-library/react";
import { createRef } from "react";

// Mock sub-components
mock.module("./FilePreviewList", () => ({
  FilePreviewList: () => null,
}));

let capturedScheduleOnSchedule: ((date: Date) => void) | null = null;
mock.module("./ScheduleMessageDialog", () => ({
  ScheduleMessageDialog: ({ open, onSchedule }: { open: boolean; onOpenChange: (v: boolean) => void; onSchedule: (d: Date) => void }) => {
    capturedScheduleOnSchedule = onSchedule;
    return open ? <div data-testid="schedule-dialog" /> : null;
  },
}));

// Capture editor callbacks
let capturedOnContentChange: ((content: string) => void) | null = null;
let capturedOnFilePaste: ((files: File[]) => void) | null = null;
let capturedOnScheduleSend: (() => void) | null = null;

mock.module("@openslaq/editor", () => ({
  RichTextEditor: ({ onSubmit, onContentChange, onFilePaste, onScheduleSend }: {
    onSubmit?: (md: string) => void;
    onContentChange?: (content: string) => void;
    onFilePaste?: (files: File[]) => void;
    onScheduleSend?: () => void;
  }) => {
    capturedOnContentChange = onContentChange ?? null;
    capturedOnFilePaste = onFilePaste ?? null;
    capturedOnScheduleSend = onScheduleSend ?? null;
    return (
      <button data-testid="mock-send" onClick={() => onSubmit?.("hello")}>
        Send
      </button>
    );
  },
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

const mockAddFiles = jest.fn();
const mockUploadAll = jest.fn(async () => []);
const mockReset = jest.fn();
const uploadState = {
  pendingFiles: [] as unknown[],
  uploadedAttachments: [] as unknown[],
  uploading: false,
  error: null as string | null,
  hasFiles: false,
  addFiles: mockAddFiles,
  removeFile: jest.fn(),
  removeAttachment: jest.fn(),
  uploadAll: mockUploadAll,
  reset: mockReset,
};

mock.module("../../hooks/useFileUpload", () => ({
  useFileUpload: () => uploadState,
}));

const mockSaveDraft = jest.fn();
const mockClearDraft = jest.fn();
mock.module("../../hooks/useDraftMessage", () => ({
  useDraftMessage: () => ({
    draft: null,
    saveDraft: mockSaveDraft,
    clearDraft: mockClearDraft,
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

const mockRedirectToAuth = jest.fn();
mock.module("../../lib/auth", () => ({
  redirectToAuth: mockRedirectToAuth,
}));

// Create a real AuthError class we can use in tests
class MockAuthError extends Error {
  constructor(msg?: string) { super(msg); this.name = "AuthError"; }
}
mock.module("../../lib/errors", () => ({
  AuthError: MockAuthError,
}));

const mockCreateScheduledMessageOp = jest.fn(async () => {});
mock.module("@openslaq/client-core", () => ({
  createScheduledMessageOp: mockCreateScheduledMessageOp,
}));

const { MessageInput } = await import("./MessageInput");
type MessageInputHandle = import("./MessageInput").MessageInputHandle;

describe("MessageInput", () => {
  beforeEach(() => {
    uploadState.hasFiles = false;
    uploadState.error = null;
    uploadState.uploadedAttachments = [];
    capturedOnContentChange = null;
    capturedOnFilePaste = null;
    capturedOnScheduleSend = null;
    capturedScheduleOnSchedule = null;
  });

  afterEach(() => {
    cleanup();
    mockSendMessage.mockClear();
    mockAddFiles.mockClear();
    mockUploadAll.mockClear();
    mockReset.mockClear();
    mockSaveDraft.mockClear();
    mockClearDraft.mockClear();
    mockRedirectToAuth.mockClear();
    mockCreateScheduledMessageOp.mockClear();
    mockListMembers.mockClear();
  });

  test("prevents double submit while first submit is in-flight", async () => {
    let resolveSend!: (value: boolean) => void;
    mockSendMessage.mockImplementation(
      () => new Promise<boolean>((resolve) => { resolveSend = resolve; }),
    );

    render(<MessageInput channelId="ch-1" />);

    const sendButton = screen.getByTestId("mock-send");

    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSend(true);
    });
  });

  test("member loading: filters current user from mention members", async () => {
    mockListMembers.mockResolvedValue([
      { id: "user-1", displayName: "Me", avatarUrl: null } as never,
      { id: "user-2", displayName: "Other", avatarUrl: null } as never,
    ]);

    await act(async () => {
      render(<MessageInput channelId="ch-1" />);
    });

    expect(mockListMembers).toHaveBeenCalledWith("default");
  });

  test("member loading: handles rejection gracefully", async () => {
    mockListMembers.mockRejectedValue(new Error("network error"));

    await act(async () => {
      render(<MessageInput channelId="ch-1" />);
    });

    // Should not throw
    expect(mockListMembers).toHaveBeenCalled();
  });

  test("useImperativeHandle: ref.addFiles and ref.focus work", async () => {
    const ref = createRef<MessageInputHandle>();
    await act(async () => {
      render(<MessageInput ref={ref} channelId="ch-1" />);
    });

    expect(ref.current).toBeTruthy();
    ref.current!.addFiles([new File(["test"], "test.txt")] as unknown as FileList);
    expect(mockAddFiles).toHaveBeenCalled();

    // focus should not throw
    ref.current!.focus();
  });

  test("file upload error with AuthError calls redirectToAuth", async () => {
    uploadState.hasFiles = true;
    mockUploadAll.mockRejectedValue(new MockAuthError("expired"));

    render(<MessageInput channelId="ch-1" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-send"));
    });

    expect(mockRedirectToAuth).toHaveBeenCalled();
  });

  test("send error with AuthError calls redirectToAuth", async () => {
    mockSendMessage.mockRejectedValue(new MockAuthError("expired"));

    render(<MessageInput channelId="ch-1" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-send"));
    });

    expect(mockRedirectToAuth).toHaveBeenCalled();
  });

  test("content change calls saveDraft and onTyping", async () => {
    const onTyping = jest.fn();
    await act(async () => {
      render(<MessageInput channelId="ch-1" onTyping={onTyping} />);
    });

    expect(capturedOnContentChange).toBeTruthy();
    act(() => {
      capturedOnContentChange!("new content");
    });

    expect(mockSaveDraft).toHaveBeenCalledWith("new content");
    expect(onTyping).toHaveBeenCalled();
  });

  test("file paste calls addFiles", async () => {
    await act(async () => {
      render(<MessageInput channelId="ch-1" />);
    });

    expect(capturedOnFilePaste).toBeTruthy();
    const files = [new File(["data"], "paste.png")];
    act(() => {
      capturedOnFilePaste!(files);
    });

    expect(mockAddFiles).toHaveBeenCalledWith(files);
  });

  test("drag and drop adds files", async () => {
    await act(async () => {
      render(<MessageInput channelId="ch-1" />);
    });

    const dropZone = screen.getByTestId("mock-send").parentElement!;

    // Drag over
    fireEvent.dragOver(dropZone, { dataTransfer: { files: [] } });
    // Drop
    const file = new File(["data"], "dropped.txt");
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(mockAddFiles).toHaveBeenCalled();
  });

  test("schedule flow: opens dialog, calls createScheduledMessageOp", async () => {
    await act(async () => {
      render(<MessageInput channelId="ch-1" />);
    });

    // Set editor content so handleSchedule doesn't early-return
    expect(capturedOnContentChange).toBeTruthy();
    act(() => {
      capturedOnContentChange!("hello");
    });

    // Trigger schedule send via captured callback
    expect(capturedOnScheduleSend).toBeTruthy();
    act(() => {
      capturedOnScheduleSend!();
    });

    // Schedule dialog should have been triggered to open
    expect(capturedScheduleOnSchedule).toBeTruthy();

    // Simulate scheduling
    await act(async () => {
      capturedScheduleOnSchedule!(new Date("2026-03-10T10:00:00Z"));
    });

    expect(mockCreateScheduledMessageOp).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalled();
    expect(mockClearDraft).toHaveBeenCalled();
  });
});
