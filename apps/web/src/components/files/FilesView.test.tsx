import { describe, expect, test, afterEach, jest, beforeEach, mock } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import type { FileBrowserItem, FileCategory, Channel, UserId } from "@openslaq/shared";
import { asChannelId } from "@openslaq/shared";

const mockReturn = {
  files: [] as FileBrowserItem[],
  loading: false,
  error: null as string | null,
  nextCursor: null as string | null,
  category: undefined as FileCategory | undefined,
  channelId: undefined as string | undefined,
  loadMore: jest.fn(),
  changeCategory: jest.fn(),
  changeChannel: jest.fn(),
  refresh: jest.fn(),
};

mock.module("../../hooks/chat/useFilesBrowser", () => ({
  useFilesBrowser: () => mockReturn,
}));

// Need to import after mock
const { FilesView } = await import("./FilesView");

const noop = () => {};

const baseChannel = {
  id: asChannelId("ch-1"),
  workspaceId: "ws-1" as Channel["workspaceId"],
  name: "general",
  description: null,
  displayName: null,
  type: "public" as const,
  isArchived: false,
  createdBy: "u-1" as UserId,
  createdAt: "2024-01-01T00:00:00Z",
  memberCount: 5,
} satisfies Channel;

function makeFile(overrides: Partial<FileBrowserItem> = {}): FileBrowserItem {
  return {
    id: "att-1" as FileBrowserItem["id"],
    filename: "test.png",
    mimeType: "image/png",
    size: 12345,
    category: "images",
    downloadUrl: "https://example.com/test.png",
    uploadedBy: "u-1" as FileBrowserItem["uploadedBy"],
    uploaderName: "Test User",
    channelId: "ch-1" as FileBrowserItem["channelId"],
    channelName: "general",
    messageId: "msg-1" as FileBrowserItem["messageId"],
    createdAt: "2024-06-15T10:00:00Z",
    ...overrides,
  };
}

describe("FilesView", () => {
  beforeEach(() => {
    mockReturn.files = [];
    mockReturn.loading = false;
    mockReturn.error = null;
    mockReturn.nextCursor = null;
    mockReturn.category = undefined;
    mockReturn.channelId = undefined;
    mockReturn.loadMore.mockClear();
    mockReturn.changeCategory.mockClear();
    mockReturn.changeChannel.mockClear();
  });

  afterEach(cleanup);

  test("renders loading state", () => {
    mockReturn.loading = true;
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    expect(screen.getByText("Loading files...")).toBeTruthy();
  });

  test("renders empty state", () => {
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    expect(screen.getByTestId("files-empty-state")).toBeTruthy();
    expect(screen.getByText("No files found")).toBeTruthy();
  });

  test("renders error state", () => {
    mockReturn.error = "Network error";
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    expect(screen.getByText("Network error")).toBeTruthy();
  });

  test("renders file list", () => {
    const file1 = makeFile({ id: "att-1" as FileBrowserItem["id"], filename: "photo.png" });
    const file2 = makeFile({ id: "att-2" as FileBrowserItem["id"], filename: "doc.pdf", category: "documents" });
    mockReturn.files = [file1, file2];
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    expect(screen.getByTestId("files-list")).toBeTruthy();
    expect(screen.getByText("photo.png")).toBeTruthy();
    expect(screen.getByText("doc.pdf")).toBeTruthy();
  });

  test("renders category tabs", () => {
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    expect(screen.getByTestId("files-category-tabs")).toBeTruthy();
    expect(screen.getByTestId("files-tab-all")).toBeTruthy();
    expect(screen.getByTestId("files-tab-images")).toBeTruthy();
    expect(screen.getByTestId("files-tab-documents")).toBeTruthy();
  });

  test("clicking category tab calls changeCategory", () => {
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    screen.getByTestId("files-tab-images").click();
    expect(mockReturn.changeCategory).toHaveBeenCalledWith("images");
  });

  test("renders load more button when nextCursor exists", () => {
    mockReturn.files = [makeFile()];
    mockReturn.nextCursor = "2024-01-01T00:00:00Z";
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    expect(screen.getByTestId("files-load-more")).toBeTruthy();
  });

  test("load more button calls loadMore", () => {
    mockReturn.files = [makeFile()];
    mockReturn.nextCursor = "2024-01-01T00:00:00Z";
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    screen.getByTestId("files-load-more").click();
    expect(mockReturn.loadMore).toHaveBeenCalled();
  });

  test("download link has correct href", () => {
    mockReturn.files = [makeFile({ downloadUrl: "https://example.com/dl" })];
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    const link = screen.getByTestId("file-download-att-1") as HTMLAnchorElement;
    expect(link.href).toBe("https://example.com/dl");
  });

  test("jump to message calls onNavigateToChannel", () => {
    const onNav = jest.fn();
    mockReturn.files = [makeFile({ channelId: "ch-1" as FileBrowserItem["channelId"], messageId: "msg-1" as FileBrowserItem["messageId"] })];
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={onNav} />);
    screen.getByTestId("file-jump-att-1").click();
    expect(onNav).toHaveBeenCalledWith("ch-1", "msg-1");
  });

  test("channel filter dropdown is rendered", () => {
    render(<FilesView workspaceSlug="ws" channels={[baseChannel]} onNavigateToChannel={noop} />);
    expect(screen.getByTestId("files-channel-filter")).toBeTruthy();
  });
});
