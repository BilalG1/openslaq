import type { HttpClient } from "../http";
import type { Message, MessageListResponse, PinCountResponse, PinnedMessagesResponse, ToggleReactionResponse } from "../types";

export interface SendMessageOptions {
  content: string;
  attachmentIds?: string[];
}

export interface ListMessagesOptions {
  cursor?: string;
  limit?: number;
  direction?: "older" | "newer";
}

export interface EditMessageOptions {
  content: string;
}

export class Messages {
  constructor(private readonly http: HttpClient) {}

  async send(channelId: string, options: SendMessageOptions): Promise<Message> {
    const path = this.http.workspacePath(`/channels/${channelId}/messages`);
    return this.http.post<Message>(path, options);
  }

  async list(channelId: string, options?: ListMessagesOptions): Promise<MessageListResponse> {
    const path = this.http.workspacePath(`/channels/${channelId}/messages`);
    return this.http.get<MessageListResponse>(path, {
      cursor: options?.cursor,
      limit: options?.limit,
      direction: options?.direction,
    });
  }

  async get(messageId: string): Promise<Message> {
    const path = this.http.globalPath(`/messages/${messageId}`);
    return this.http.get<Message>(path);
  }

  async edit(messageId: string, options: EditMessageOptions): Promise<Message> {
    const path = this.http.globalPath(`/messages/${messageId}`);
    return this.http.put<Message>(path, options);
  }

  async delete(messageId: string): Promise<void> {
    const path = this.http.globalPath(`/messages/${messageId}`);
    await this.http.del(path);
  }

  async reply(channelId: string, parentMessageId: string, options: SendMessageOptions): Promise<Message> {
    const path = this.http.workspacePath(`/channels/${channelId}/messages/${parentMessageId}/replies`);
    return this.http.post<Message>(path, options);
  }

  async listReplies(channelId: string, parentMessageId: string, options?: ListMessagesOptions): Promise<MessageListResponse> {
    const path = this.http.workspacePath(`/channels/${channelId}/messages/${parentMessageId}/replies`);
    return this.http.get<MessageListResponse>(path, {
      cursor: options?.cursor,
      limit: options?.limit,
      direction: options?.direction,
    });
  }

  async toggleReaction(messageId: string, emoji: string): Promise<ToggleReactionResponse> {
    const path = this.http.globalPath(`/messages/${messageId}/reactions`);
    return this.http.post<ToggleReactionResponse>(path, { emoji });
  }

  async pin(channelId: string, messageId: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${channelId}/messages/${messageId}/pin`);
    await this.http.postVoid(path);
  }

  async unpin(channelId: string, messageId: string): Promise<void> {
    const path = this.http.workspacePath(`/channels/${channelId}/messages/${messageId}/pin`);
    await this.http.del(path);
  }

  async listPinned(channelId: string): Promise<PinnedMessagesResponse> {
    const path = this.http.workspacePath(`/channels/${channelId}/pins`);
    return this.http.get<PinnedMessagesResponse>(path);
  }

  async getPinCount(channelId: string): Promise<PinCountResponse> {
    const path = this.http.workspacePath(`/channels/${channelId}/pin-count`);
    return this.http.get<PinCountResponse>(path);
  }
}
