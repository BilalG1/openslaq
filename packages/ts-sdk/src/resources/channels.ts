import type { HttpClient } from "../http";
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
  description?: string;
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
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<Channel[]> {
    const path = this.http.workspacePath("/channels");
    return this.http.get<Channel[]>(path);
  }

  async browse(options?: BrowseChannelsOptions): Promise<BrowseChannel[]> {
    const path = this.http.workspacePath("/channels/browse");
    return this.http.get<BrowseChannel[]>(path, {
      includeArchived: options?.includeArchived,
    });
  }

  async create(options: CreateChannelOptions): Promise<Channel> {
    const path = this.http.workspacePath("/channels");
    return this.http.post<Channel>(path, options);
  }

  async update(id: string, options: UpdateChannelOptions): Promise<Channel> {
    const path = this.http.workspacePath(`/channels/${id}`);
    return this.http.patch<Channel>(path, options);
  }

  async archive(id: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/archive`);
    await this.http.postVoid(path);
  }

  async unarchive(id: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/unarchive`);
    await this.http.postVoid(path);
  }

  async join(id: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/join`);
    await this.http.postVoid(path);
  }

  async leave(id: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/leave`);
    await this.http.postVoid(path);
  }

  async listMembers(id: string): Promise<ChannelMember[]> {
    const path = this.http.workspacePath(`/channels/${id}/members`);
    return this.http.get<ChannelMember[]>(path);
  }

  async addMember(id: string, userId: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/members`);
    await this.http.postVoid(path, { userId });
  }

  async removeMember(id: string, userId: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/members/${userId}`);
    await this.http.del(path);
  }

  async listStarred(): Promise<Channel[]> {
    const path = this.http.workspacePath("/channels/starred");
    return this.http.get<Channel[]>(path);
  }

  async star(id: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/star`);
    await this.http.postVoid(path);
  }

  async unstar(id: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/star`);
    await this.http.del(path);
  }

  async markRead(id: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/read`);
    await this.http.postVoid(path);
  }

  async markUnread(id: string, options: MarkUnreadOptions): Promise<MarkUnreadResponse> {
    const path = this.http.workspacePath(`/channels/${id}/mark-unread`);
    return this.http.post<MarkUnreadResponse>(path, options);
  }

  async listNotificationPrefs(): Promise<NotificationPrefsMap> {
    const path = this.http.workspacePath("/channels/notification-prefs");
    return this.http.get<NotificationPrefsMap>(path);
  }

  async getNotificationPref(id: string): Promise<GetNotificationPrefResponse> {
    const path = this.http.workspacePath(`/channels/${id}/notification-pref`);
    return this.http.get<GetNotificationPrefResponse>(path);
  }

  async setNotificationPref(id: string, options: SetNotificationPrefOptions): Promise<void> {
    const path = this.http.workspacePath(`/channels/${id}/notification-pref`);
    await this.http.putVoid(path, options);
  }
}
