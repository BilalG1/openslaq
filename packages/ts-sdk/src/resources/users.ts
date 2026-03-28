import type { RpcClient } from "../rpc";
import { checked } from "../rpc";
import type { User } from "../types";

export interface UpdateMeOptions {
  displayName?: string;
  avatarUrl?: string;
}

export interface SetStatusOptions {
  emoji?: string;
  text?: string;
  expiresAt?: string;
}

export class Users {
  constructor(private readonly rpc: RpcClient) {}

  async me(): Promise<User> {
    const res = await checked(
      await this.rpc.api.users.me.$get({}),
    );
    return await res.json();
  }

  async updateMe(options: UpdateMeOptions): Promise<User> {
    const res = await checked(
      await this.rpc.api.users.me.$patch({
        json: options,
      }),
    );
    return await res.json();
  }

  async setStatus(options: SetStatusOptions): Promise<void> {
    await checked(
      await this.rpc.api.users.me.status.$put({
        json: options,
      }),
    );
  }

  async clearStatus(): Promise<void> {
    await checked(
      await this.rpc.api.users.me.status.$delete({}),
    );
  }
}
