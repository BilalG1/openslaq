import type { HttpClient } from "../http";
import type { RpcClient } from "../rpc";
import { checked } from "../rpc";
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
  constructor(
    private readonly rpc: RpcClient,
    private readonly slug: string,
    private readonly http: HttpClient,
  ) {}

  async upload(options: UploadFilesOptions): Promise<UploadResponse> {
    // FormData uploads aren't supported by Hono RPC — use raw HttpClient
    const path = this.http.workspacePath("/uploads");
    const formData = new FormData();
    const files = Array.isArray(options.files) ? options.files : [options.files];
    for (const file of files) {
      formData.append("files", file);
    }
    return this.http.postFormData<UploadResponse>(path, formData);
  }

  async getDownloadUrl(attachmentId: string): Promise<string> {
    // Redirect handling isn't supported by Hono RPC — use raw HttpClient
    const path = this.http.workspacePath(`/uploads/${attachmentId}/download`);
    return this.http.getRedirectUrl(path);
  }

  async browse(options?: BrowseFilesOptions): Promise<BrowseFilesResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].files.$get({
        param: { slug: this.slug },
        query: {
          channelId: options?.channelId,
          category: options?.category,
          cursor: options?.cursor,
          limit: options?.limit,
        },
      }),
    );
    return await res.json();
  }
}
