import type { RpcClient } from "../rpc";
import { checked } from "../rpc";
import type { Channel, GroupDmAddMemberResponse, GroupDmChannel } from "../types";

export interface CreateGroupDmOptions {
  memberIds: string[];
}

export class GroupDms {
  constructor(
    private readonly rpc: RpcClient,
    private readonly slug: string,
  ) {}

  async create(options: CreateGroupDmOptions): Promise<GroupDmChannel> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["group-dm"].$post({
        param: { slug: this.slug },
        json: { memberIds: options.memberIds },
      }),
    );
    return await res.json();
  }

  async list(): Promise<GroupDmChannel[]> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["group-dm"].$get({
        param: { slug: this.slug },
      }),
    );
    return await res.json();
  }

  async addMember(channelId: string, userId: string): Promise<GroupDmAddMemberResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["group-dm"][":channelId"].members.$post({
        param: { slug: this.slug, channelId },
        json: { userId },
      }),
    );
    return await res.json();
  }

  async leave(channelId: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"]["group-dm"][":channelId"].members.me.$delete({
        param: { slug: this.slug, channelId },
      }),
    );
  }

  async rename(channelId: string, displayName: string): Promise<{ channel: Channel }> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["group-dm"][":channelId"].$patch({
        param: { slug: this.slug, channelId },
        json: { displayName },
      }),
    );
    return await res.json();
  }
}
