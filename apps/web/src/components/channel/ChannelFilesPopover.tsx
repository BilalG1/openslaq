import { useEffect, useRef } from "react";
import type { FileBrowserItem } from "@openslaq/shared";
import { FileTypeIcon, formatFileSize } from "../files/file-icons";
import { Button } from "../ui";

interface ChannelFilesPopoverProps {
  open: boolean;
  onClose: () => void;
  files: FileBrowserItem[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onJumpToMessage: (channelId: string, messageId: string) => void;
}

export function ChannelFilesPopover({
  open,
  onClose,
  files,
  loading,
  hasMore,
  onLoadMore,
  onJumpToMessage,
}: ChannelFilesPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      data-testid="channel-files-popover"
      className="absolute right-0 top-full mt-1 w-96 max-h-[400px] overflow-y-auto bg-surface border border-border-default rounded-lg shadow-lg z-50"
    >
      <div className="px-4 py-3 border-b border-border-default">
        <h3 className="font-semibold text-sm text-primary m-0">Files</h3>
      </div>
      {loading && files.length === 0 ? (
        <div className="px-4 py-6 text-center text-faint text-sm">Loading...</div>
      ) : files.length === 0 ? (
        <div className="px-4 py-6 text-center text-faint text-sm" data-testid="channel-files-empty">
          No files shared in this channel
        </div>
      ) : (
        <div className="divide-y divide-border-default">
          {files.map((file) => (
            <div key={file.id} className="px-4 py-3 hover:bg-surface-secondary/50" data-testid={`channel-file-${file.id}`}>
              <div className="flex items-center gap-2 mb-1">
                <FileTypeIcon category={file.category} className="w-4 h-4 text-faint shrink-0" />
                <span className="font-medium text-sm text-primary truncate" title={file.filename}>
                  {file.filename}
                </span>
                <span className="text-[11px] text-faint shrink-0">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <div className="text-[11px] text-secondary mb-2">
                {file.uploaderName} &middot;{" "}
                {new Date(file.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="flex gap-2">
                <a
                  href={file.downloadUrl}
                  download={file.filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`channel-file-download-${file.id}`}
                  className="text-xs text-slaq-blue hover:underline"
                >
                  Download
                </a>
                <button
                  type="button"
                  data-testid={`channel-file-jump-${file.id}`}
                  onClick={() => {
                    onJumpToMessage(file.channelId, file.messageId);
                    onClose();
                  }}
                  className="text-xs text-slaq-blue hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  Jump to message
                </button>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center py-3">
              <Button variant="ghost" size="sm" onClick={onLoadMore} data-testid="channel-files-load-more">
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
