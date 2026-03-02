import { useCallback } from "react";
import type { FileBrowserItem, FileCategory, Channel } from "@openslaq/shared";
import { useFilesBrowser } from "../../hooks/chat/useFilesBrowser";
import { FileTypeIcon, formatFileSize } from "./file-icons";
import { Button } from "../ui";

const CATEGORY_TABS: { label: string; value: FileCategory | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Images", value: "images" },
  { label: "Videos", value: "videos" },
  { label: "Documents", value: "documents" },
  { label: "Audio", value: "audio" },
  { label: "Other", value: "other" },
];

interface FilesViewProps {
  workspaceSlug: string;
  channels: Channel[];
  onNavigateToChannel: (channelId: string, messageId?: string) => void;
}

export function FilesView({
  workspaceSlug,
  channels,
  onNavigateToChannel,
}: FilesViewProps) {
  const {
    files,
    loading,
    error,
    nextCursor,
    category,
    channelId,
    loadMore,
    changeCategory,
    changeChannel,
  } = useFilesBrowser(workspaceSlug);

  const handleJumpToMessage = useCallback(
    (file: FileBrowserItem) => {
      onNavigateToChannel(file.channelId, file.messageId);
    },
    [onNavigateToChannel],
  );

  return (
    <div className="flex flex-col h-full" data-testid="files-view">
      <div className="px-4 py-3 border-b border-border-default shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-primary">Files</h2>
          <select
            data-testid="files-channel-filter"
            className="text-sm border border-border-default rounded px-2 py-1 bg-surface text-primary"
            value={channelId ?? ""}
            onChange={(e) => changeChannel(e.target.value || undefined)}
          >
            <option value="">All channels</option>
            {channels
              .filter((ch) => !ch.isArchived && ch.type !== "dm" && ch.type !== "group_dm")
              .map((ch) => (
                <option key={ch.id} value={ch.id}>
                  # {ch.name}
                </option>
              ))}
          </select>
        </div>
        <div className="flex gap-1" data-testid="files-category-tabs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              data-testid={`files-tab-${tab.label.toLowerCase()}`}
              className={`px-3 py-1 text-sm rounded-full border-none cursor-pointer transition-colors ${
                category === tab.value
                  ? "bg-slaq-blue text-white"
                  : "bg-surface-raised text-secondary hover:bg-surface-secondary"
              }`}
              onClick={() => changeCategory(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && files.length === 0 && (
          <div className="flex items-center justify-center py-12 text-faint">
            Loading files...
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 text-danger-text">
            {error}
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-faint" data-testid="files-empty-state">
            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m3 0H9.75m0 0v3m0-3v-3m-3.375-6H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-lg font-medium">No files found</span>
            <span className="text-sm mt-1">Files shared in messages will appear here</span>
          </div>
        )}

        {files.length > 0 && (
          <div className="divide-y divide-border-default" data-testid="files-list">
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onJumpToMessage={() => handleJumpToMessage(file)}
              />
            ))}
          </div>
        )}

        {nextCursor && (
          <div className="flex justify-center py-4">
            <Button
              variant="secondary"
              size="sm"
              data-testid="files-load-more"
              onClick={loadMore}
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function FileRow({
  file,
  onJumpToMessage,
}: {
  file: FileBrowserItem;
  onJumpToMessage: () => void;
}) {
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-surface-secondary/50" data-testid={`file-row-${file.id}`}>
      <div className="shrink-0 text-faint">
        <FileTypeIcon category={file.category} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm text-primary truncate" title={file.filename}>
            {file.filename}
          </span>
          <span className="text-[11px] text-faint shrink-0">
            {formatFileSize(file.size)}
          </span>
        </div>
        <div className="text-[12px] text-secondary mt-0.5">
          <span>{file.uploaderName}</span>
          <span className="mx-1 text-faint">in</span>
          <span className="font-medium">#{file.channelName}</span>
          <span className="mx-1 text-faint">&middot;</span>
          <span className="text-faint">
            {new Date(file.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={file.downloadUrl}
          download={file.filename}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`file-download-${file.id}`}
          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-surface-raised text-faint hover:text-primary transition-colors"
          title="Download"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </a>
        <button
          type="button"
          data-testid={`file-jump-${file.id}`}
          onClick={onJumpToMessage}
          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-surface-raised text-faint hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
          title="Jump to message"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </button>
      </div>
    </div>
  );
}
