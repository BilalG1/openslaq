import type { Attachment } from "@openslaq/shared";
import { AudioPlayer } from "./AudioPlayer";

interface MessageAttachmentsProps {
  attachments: Attachment[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <a href={attachment.downloadUrl} target="_blank" rel="noopener noreferrer">
      <img
        src={attachment.downloadUrl}
        alt={attachment.filename}
        className="max-w-[360px] max-h-[300px] rounded-md block cursor-pointer"
      />
    </a>
  );
}

function VideoAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <video
      controls
      src={attachment.downloadUrl}
      className="max-w-[360px] max-h-[300px] rounded-md block"
    />
  );
}

function FileAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <a
      href={attachment.downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="file-download-link"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-tertiary rounded-md no-underline text-slaq-blue text-[13px]"
    >
      <span>{attachment.filename}</span>
      <span className="text-faint text-[11px]">({formatFileSize(attachment.size)})</span>
    </a>
  );
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {attachments.map((att) => {
        if (att.mimeType.startsWith("image/")) {
          return <ImageAttachment key={att.id} attachment={att} />;
        }
        if (att.mimeType.startsWith("audio/")) {
          return <AudioPlayer key={att.id} src={att.downloadUrl} filename={att.filename} />;
        }
        if (att.mimeType.startsWith("video/")) {
          return <VideoAttachment key={att.id} attachment={att} />;
        }
        return <FileAttachment key={att.id} attachment={att} />;
      })}
    </div>
  );
}
