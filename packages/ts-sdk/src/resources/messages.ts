import type { RpcClient } from "../rpc";
import { checked } from "../rpc";
import type { Message, MessageListResponse, MessagesAroundResponse, PinCountResponse, PinnedMessagesResponse, SavedMessageIdsResponse, SavedMessagesResponse, ShareMessageOptions, ToggleReactionResponse } from "../types";

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
  constructor(
    private readonly rpc: RpcClient,
    private readonly slug: string,
  ) {}

  async send(channelId: string, options: SendMessageOptions): Promise<Message> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages.$post({
        param: { slug: this.slug, id: channelId },
        json: options,
      }),
    );
    return await res.json();
  }

  async list(channelId: string, options?: ListMessagesOptions): Promise<MessageListResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages.$get({
        param: { slug: this.slug, id: channelId },
        query: {
          cursor: options?.cursor,
          limit: options?.limit,
          direction: options?.direction,
        },
      }),
    );
    return await res.json();
  }

  async get(messageId: string): Promise<Message> {
    const res = await checked(
      await this.rpc.api.messages[":id"].$get({
        param: { id: messageId },
      }),
    );
    return await res.json();
  }

  async edit(messageId: string, options: EditMessageOptions): Promise<Message> {
    const res = await checked(
      await this.rpc.api.messages[":id"].$put({
        param: { id: messageId },
        json: options,
      }),
    );
    return await res.json();
  }

  async delete(messageId: string): Promise<void> {
    await checked(
      await this.rpc.api.messages[":id"].$delete({
        param: { id: messageId },
      }),
    );
  }

  async reply(channelId: string, parentMessageId: string, options: SendMessageOptions): Promise<Message> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
        param: { slug: this.slug, id: channelId, messageId: parentMessageId },
        json: options,
      }),
    );
    return await res.json();
  }

  async listReplies(channelId: string, parentMessageId: string, options?: ListMessagesOptions): Promise<MessageListResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$get({
        param: { slug: this.slug, id: channelId, messageId: parentMessageId },
        query: {
          cursor: options?.cursor,
          limit: options?.limit,
          direction: options?.direction,
        },
      }),
    );
    return await res.json();
  }

  async toggleReaction(messageId: string, emoji: string): Promise<ToggleReactionResponse> {
    const res = await checked(
      await this.rpc.api.messages[":id"].reactions.$post({
        param: { id: messageId },
        json: { emoji },
      }),
    );
    return await res.json();
  }

  async pin(channelId: string, messageId: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
        param: { slug: this.slug, id: channelId, messageId },
      }),
    );
  }

  async unpin(channelId: string, messageId: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$delete({
        param: { slug: this.slug, id: channelId, messageId },
      }),
    );
  }

  async listPinned(channelId: string): Promise<PinnedMessagesResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].pins.$get({
        param: { slug: this.slug, id: channelId },
      }),
    );
    return await res.json();
  }

  async getPinCount(channelId: string): Promise<PinCountResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"]["pin-count"].$get({
        param: { slug: this.slug, id: channelId },
      }),
    );
    return await res.json();
  }

  async save(channelId: string, messageId: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$post({
        param: { slug: this.slug, id: channelId, messageId },
      }),
    );
  }

  async unsave(channelId: string, messageId: string): Promise<void> {
    await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages[":messageId"].save.$delete({
        param: { slug: this.slug, id: channelId, messageId },
      }),
    );
  }

  async listSaved(): Promise<SavedMessagesResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["saved-messages"].$get({
        param: { slug: this.slug },
      }),
    );
    return await res.json();
  }

  async listSavedIds(): Promise<SavedMessageIdsResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"]["saved-messages"].ids.$get({
        param: { slug: this.slug },
      }),
    );
    return await res.json();
  }

  async share(channelId: string, options: ShareMessageOptions): Promise<Message> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages.share.$post({
        param: { slug: this.slug, id: channelId },
        json: options,
      }),
    );
    return await res.json();
  }

  async getAround(channelId: string, messageId: string): Promise<MessagesAroundResponse> {
    const res = await checked(
      await this.rpc.api.workspaces[":slug"].channels[":id"].messages.around[":messageId"].$get({
        param: { slug: this.slug, id: channelId, messageId },
      }),
    );
    return await res.json();
  }
}
