import type { HttpClient } from "../http";
import type { BrowseFilesResponse, FileCategory, UploadResponse } from "../types";

export interface UploadFilesOptions {
  files: File | File[];
}

export interface BrowseFilesOptions {
  channelId?: string;
  category?: FileCategory;
  cursor?: string;
  limit?: number;
}

export class Files {
  constructor(private readonly http: HttpClient) {}

  async upload(options: UploadFilesOptions): Promise<UploadResponse> {
    const path = this.http.workspacePath("/uploads");
    const formData = new FormData();
    const files = Array.isArray(options.files) ? options.files : [options.files];
    for (const file of files) {
      formData.append("files", file);
    }
    return this.http.postFormData<UploadResponse>(path, formData);
  }

  async getDownloadUrl(attachmentId: string): Promise<string> {
    const path = this.http.workspacePath(`/uploads/${attachmentId}/download`);
    return this.http.getRedirectUrl(path);
  }

  async browse(options?: BrowseFilesOptions): Promise<BrowseFilesResponse> {
    const path = this.http.workspacePath("/files");
    return this.http.get<BrowseFilesResponse>(path, {
      channelId: options?.channelId,
      category: options?.category,
      cursor: options?.cursor,
      limit: options?.limit,
    });
  }
}
