import { describe, expect, test, afterEach, jest } from "bun:test";
import { render, screen, cleanup } from "../../test-utils";
import { ChannelFilesPopover } from "./ChannelFilesPopover";
import type { FileBrowserItem } from "@openslaq/shared";

const noop = () => {};

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

describe("ChannelFilesPopover", () => {
  afterEach(cleanup);

  test("renders nothing when closed", () => {
    const { container } = render(
      <ChannelFilesPopover
        open={false}
        onClose={noop}
        files={[]}
        loading={false}
        hasMore={false}
        onLoadMore={noop}
        onJumpToMessage={noop}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  test("renders loading state", () => {
    render(
      <ChannelFilesPopover
        open={true}
        onClose={noop}
        files={[]}
        loading={true}
        hasMore={false}
        onLoadMore={noop}
        onJumpToMessage={noop}
      />,
    );
    // Skeleton shimmer loading state renders pulse placeholders, not text
    expect(screen.getByTestId("channel-files-popover").querySelector(".animate-pulse")).toBeTruthy();
  });

  test("renders empty state", () => {
    render(
      <ChannelFilesPopover
        open={true}
        onClose={noop}
        files={[]}
        loading={false}
        hasMore={false}
        onLoadMore={noop}
        onJumpToMessage={noop}
      />,
    );
    expect(screen.getByTestId("channel-files-empty")).toBeTruthy();
    expect(screen.getByText("No files shared in this channel")).toBeTruthy();
  });

  test("renders file list", () => {
    const files = [
      makeFile({ id: "att-1" as FileBrowserItem["id"], filename: "photo.png" }),
      makeFile({ id: "att-2" as FileBrowserItem["id"], filename: "doc.pdf" }),
    ];
    render(
      <ChannelFilesPopover
        open={true}
        onClose={noop}
        files={files}
        loading={false}
        hasMore={false}
        onLoadMore={noop}
        onJumpToMessage={noop}
      />,
    );
    expect(screen.getByText("photo.png")).toBeTruthy();
    expect(screen.getByText("doc.pdf")).toBeTruthy();
  });

  test("jump to message calls handler and closes", () => {
    const onJump = jest.fn();
    const onClose = jest.fn();
    const file = makeFile({ channelId: "ch-1" as FileBrowserItem["channelId"], messageId: "msg-1" as FileBrowserItem["messageId"] });
    render(
      <ChannelFilesPopover
        open={true}
        onClose={onClose}
        files={[file]}
        loading={false}
        hasMore={false}
        onLoadMore={noop}
        onJumpToMessage={onJump}
      />,
    );
    screen.getByTestId("channel-file-jump-att-1").click();
    expect(onJump).toHaveBeenCalledWith("ch-1", "msg-1");
    expect(onClose).toHaveBeenCalled();
  });

  test("renders load more button when hasMore", () => {
    render(
      <ChannelFilesPopover
        open={true}
        onClose={noop}
        files={[makeFile()]}
        loading={false}
        hasMore={true}
        onLoadMore={noop}
        onJumpToMessage={noop}
      />,
    );
    expect(screen.getByTestId("channel-files-load-more")).toBeTruthy();
  });

  test("load more button calls onLoadMore", () => {
    const onLoadMore = jest.fn();
    render(
      <ChannelFilesPopover
        open={true}
        onClose={noop}
        files={[makeFile()]}
        loading={false}
        hasMore={true}
        onLoadMore={onLoadMore}
        onJumpToMessage={noop}
      />,
    );
    screen.getByTestId("channel-files-load-more").click();
    expect(onLoadMore).toHaveBeenCalled();
  });

  test("download link has correct href", () => {
    const file = makeFile({ downloadUrl: "https://cdn.example.com/file.png" });
    render(
      <ChannelFilesPopover
        open={true}
        onClose={noop}
        files={[file]}
        loading={false}
        hasMore={false}
        onLoadMore={noop}
        onJumpToMessage={noop}
      />,
    );
    const link = screen.getByTestId("channel-file-download-att-1") as HTMLAnchorElement;
    expect(link.href).toBe("https://cdn.example.com/file.png");
  });
});
