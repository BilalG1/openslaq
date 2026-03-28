import type { RpcClient } from "../rpc";
import { checked } from "../rpc";
import type {
  BrowseChannel,
  Channel,
  ChannelMember,
  ChannelNotifyLevel,
  MarkUnreadResponse,
  NotificationPrefsMap,
} from "../types";

export interface CreateChannelOptions {
  name: string;
  description?: string;
  type?: "public" | "private";
}

export interface UpdateChannelOptions {
  description: string | null;
}

export interface BrowseChannelsOptions {
  includeArchived?: boolean;
}

export interface MarkUnreadOptions {
  messageId: string;
}

export interface SetNotificationPrefOptions {
  level: ChannelNotifyLevel;
}

export interface GetNotificationPrefResponse {
  level: ChannelNotifyLevel;
}

export class Channels {
  constructor(
    private readonly rpc: RpcClient,
    private readonly slug: string,
  ) {}

  async list(): Promise<Channel[]> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels.$get({
        param: { slug: this.slug },
      }),
    );
    return await res.json();
  }

  async browse(options?: BrowseChannelsOptions): Promise<BrowseChannel[]> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels.browse.$get({
        param: { slug: this.slug },
        query: options?.includeArchived ? { includeArchived: "true" } : {},
      }),
    );
    return await res.json();
  }

  async create(options: CreateChannelOptions): Promise<Channel> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels.$post({
        param: { slug: this.slug },
        json: options,
      }),
    );
    return await res.json();
  }

  async update(id: string, options: UpdateChannelOptions): Promise<Channel> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].$patch({
        param: { slug: this.slug, id },
        json: options,
      }),
    );
    return await res.json();
  }

  async archive(id: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].archive.$post({
        param: { slug: this.slug, id },
      }),
    );
  }

  async unarchive(id: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].unarchive.$post({
        param: { slug: this.slug, id },
      }),
    );
  }

  async join(id: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].join.$post({
        param: { slug: this.slug, id },
      }),
    );
  }

  async leave(id: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].leave.$post({
        param: { slug: this.slug, id },
      }),
    );
  }

  async listMembers(id: string): Promise<ChannelMember[]> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].members.$get({
        param: { slug: this.slug, id },
      }),
    );
    return await res.json();
  }

  async addMember(id: string, userId: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].members.$post({
        param: { slug: this.slug, id },
        json: { userId },
      }),
    );
  }

  async removeMember(id: string, userId: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
        param: { slug: this.slug, id, userId },
      }),
    );
  }

  async listStarred(): Promise<string[]> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels.starred.$get({
        param: { slug: this.slug },
      }),
    );
    return await res.json();
  }

  async star(id: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].star.$post({
        param: { slug: this.slug, id },
      }),
    );
  }

  async unstar(id: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].star.$delete({
        param: { slug: this.slug, id },
      }),
    );
  }

  async markRead(id: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].read.$post({
        param: { slug: this.slug, id },
      }),
    );
  }

  async markUnread(id: string, options: MarkUnreadOptions): Promise<MarkUnreadResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"]["mark-unread"].$post({
        param: { slug: this.slug, id },
        json: options,
      }),
    );
    return await res.json();
  }

  async listNotificationPrefs(): Promise<NotificationPrefsMap> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels["notification-prefs"].$get({
        param: { slug: this.slug },
      }),
    );
    return await res.json();
  }

  async getNotificationPref(id: string): Promise<GetNotificationPrefResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"]["notification-pref"].$get({
        param: { slug: this.slug, id },
      }),
    );
    return await res.json();
  }

  async setNotificationPref(id: string, options: SetNotificationPrefOptions): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"]["notification-pref"].$put({
        param: { slug: this.slug, id },
        json: options,
      }),
    );
  }
}
