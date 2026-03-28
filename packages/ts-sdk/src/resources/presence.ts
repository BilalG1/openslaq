import type { RpcClient } from "../rpc";
import { checked } from "../rpc";
import type { PresenceEntry } from "../types";

export class Presence {
  constructor(
    private readonly rpc: RpcClient,
    private readonly slug: string,
  ) {}

  async list(): Promise<PresenceEntry[]> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].presence.$get({
        param: { slug: this.slug },
      }),
    );
    return await res.json();
  }
}
