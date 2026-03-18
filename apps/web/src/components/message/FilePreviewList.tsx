import { useState, useEffect } from "react";
import type { Attachment } from "@openslaq/shared";

interface PendingFile {
  id: string;
  file: File;
}

interface FilePreviewListProps {
  pendingFiles: PendingFile[];
  uploadedAttachments: Attachment[];
  onRemoveFile: (id: string) => void;
  onRemoveAttachment: (id: string) => void;
}

function PendingFileCard({ pending, onRemove }: { pending: PendingFile; onRemove: () => void }) {
  const isImage = pending.file.type.startsWith("image/");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isImage) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(pending.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [isImage, pending.file]);

  return (
    <div className="relative flex items-center gap-1.5 px-2 py-1 bg-surface-tertiary rounded-md text-xs max-w-[200px]">
      {previewUrl ? (
        <img src={previewUrl} alt={pending.file.name} className="w-8 h-8 object-cover rounded" />
      ) : (
        <div className="w-8 h-8 flex items-center justify-center bg-border-strong rounded text-[10px] font-semibold text-secondary">
          {getFileExtension(pending.file.name)}
        </div>
      )}
      <div className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">{pending.file.name}</div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full border-none bg-gray-500 text-white text-[11px] cursor-pointer flex items-center justify-center p-0 leading-none"
        aria-label="Remove file"
      >
        x
      </button>
    </div>
  );
}

function AttachmentCard({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  const isImage = attachment.mimeType.startsWith("image/");

  return (
    <div className="relative flex items-center gap-1.5 px-2 py-1 bg-surface-tertiary rounded-md text-xs max-w-[200px]">
      {isImage ? (
        <div className="w-8 h-8 flex items-center justify-center bg-border-strong rounded text-[10px] font-semibold text-secondary">
          IMG
        </div>
      ) : (
        <div className="w-8 h-8 flex items-center justify-center bg-border-strong rounded text-[10px] font-semibold text-secondary">
          {getFileExtension(attachment.filename)}
        </div>
      )}
      <div className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px]">{attachment.filename}</div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full border-none bg-gray-500 text-white text-[11px] cursor-pointer flex items-center justify-center p-0 leading-none"
        aria-label="Remove attachment"
      >
        x
      </button>
    </div>
  );
}

export function FilePreviewList({
  pendingFiles,
  uploadedAttachments,
  onRemoveFile,
  onRemoveAttachment,
}: FilePreviewListProps) {
  if (pendingFiles.length === 0 && uploadedAttachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 py-2">
      {uploadedAttachments.map((att) => (
        <AttachmentCard key={att.id} attachment={att} onRemove={() => onRemoveAttachment(att.id)} />
      ))}
      {pendingFiles.map((pf) => (
        <PendingFileCard key={pf.id} pending={pf} onRemove={() => onRemoveFile(pf.id)} />
      ))}
    </div>
  );
}

function getFileExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toUpperCase();
  return ext && ext.length <= 4 ? ext : "FILE";
}
