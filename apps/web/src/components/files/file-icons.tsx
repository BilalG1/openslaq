import { Image, Video, Music, FileText, Paperclip } from "lucide-react";
import type { FileCategory } from "@openslaq/shared";

export function FileTypeIcon({ category, className = "w-5 h-5" }: { category: FileCategory; className?: string }) {
  switch (category) {
    case "images":
      return <Image className={className} />;
    case "videos":
      return <Video className={className} />;
    case "audio":
      return <Music className={className} />;
    case "documents":
      return <FileText className={className} />;
    default:
      return <Paperclip className={className} />;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
