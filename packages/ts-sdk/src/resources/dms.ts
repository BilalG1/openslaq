import type { RpcClient } from "../rpc";
import { checked } from "../rpc";
import type { DmChannel, OpenDmResponse } from "../types";

export class Dms {
  constructor(
    private readonly rpc: RpcClient,
    private readonly slug: string,
  ) {}

  async open(userId: string): Promise<OpenDmResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].dm.$post({
        param: { slug: this.slug },
        json: { userId },
      }),
    );
    return await res.json();
  }

  async list(): Promise<DmChannel[]> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].dm.$get({
        param: { slug: this.slug },
      }),
    );
    return await res.json();
  }
}
