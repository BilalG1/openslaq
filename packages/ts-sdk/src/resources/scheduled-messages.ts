import type { RpcClient } from "../rpc";
import { checked } from "../rpc";
import type { ScheduledMessage, ScheduledMessageWithChannel } from "../types";

export interface CreateScheduledMessageOptions {
  channelId: string;
  content: string;
  attachmentIds?: string[];
  scheduledFor: string;
}

export interface UpdateScheduledMessageOptions {
  content?: string;
  attachmentIds?: string[];
  scheduledFor?: string;
}

export class ScheduledMessages {
  constructor(
    private readonly rpc: RpcClient,
    private readonly slug: string,
  ) {}

  async create(options: CreateScheduledMessageOptions): Promise<ScheduledMessage> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["scheduled-messages"].$post({
        param: { slug: this.slug },
        json: options,
      }),
    );
    return await res.json();
  }

  async list(): Promise<ScheduledMessageWithChannel[]> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["scheduled-messages"].$get({
        param: { slug: this.slug },
      }),
    );
    const data = await res.json();
    return data.scheduledMessages;
  }

  async get(id: string): Promise<ScheduledMessage> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["scheduled-messages"][":id"].$get({
        param: { slug: this.slug, id },
      }),
    );
    return await res.json();
  }

  async update(id: string, options: UpdateScheduledMessageOptions): Promise<ScheduledMessage> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["scheduled-messages"][":id"].$put({
        param: { slug: this.slug, id },
        json: options,
      }),
    );
    return await res.json();
  }

  async delete(id: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"]["scheduled-messages"][":id"].$delete({
        param: { slug: this.slug, id },
      }),
    );
  }

  async countByChannel(channelId: string): Promise<{ count: number }> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["scheduled-messages"].channel[":channelId"].$get({
        param: { slug: this.slug, channelId },
      }),
    );
    return await res.json();
  }
}
