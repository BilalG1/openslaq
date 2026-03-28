import type { RpcClient } from "../rpc";
import { checked } from "../rpc";
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
  constructor(
    private readonly rpc: RpcClient,
    private readonly slug: string,
  ) {}

  async query(options: SearchOptions): Promise<SearchResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].search.$get({
        param: { slug: this.slug },
        query: {
          q: options.q,
          channelId: options.channelId,
          userId: options.userId,
          fromDate: options.fromDate,
          toDate: options.toDate,
          offset: options.offset,
          limit: options.limit,
        },
      }),
    );
    return await res.json();
  }
}
