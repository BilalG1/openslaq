import type { HttpClient } from "../http";
import type { SearchResponse } from "../types";

export interface SearchOptions {
  q: string;
  channelId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  offset?: number;
  limit?: number;
}

export class Search {
  constructor(private readonly http: HttpClient) {}

  async query(options: SearchOptions): Promise<SearchResponse> {
    const path = this.http.workspacePath("/search");
    return this.http.get<SearchResponse>(path, {
      q: options.q,
      channelId: options.channelId,
      userId: options.userId,
      fromDate: options.fromDate,
      toDate: options.toDate,
      offset: options.offset,
      limit: options.limit,
    });
  }
}
