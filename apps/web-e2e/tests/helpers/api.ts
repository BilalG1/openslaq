import { hc } from "hono/client";
import type { AppType } from "@openslaq/api/app";
import { signTestJwt, type TestUser } from "@openslaq/test-utils";

const API_BASE = "http://localhost:3001";

export interface ApiUser {
  userId: string;
  displayName: string;
  email: string;
}

export const DEFAULT_USER: ApiUser = {
  userId: "e2e-test-user-001",
  displayName: "Test User",
  email: "test@openslaq.dev",
};

export const SECOND_USER: ApiUser = {
  userId: "e2e-test-user-002",
  displayName: "Second User",
  email: "second@openslaq.dev",
};

export const SHOWCASE_ALICE: ApiUser = { userId: "Alice Johnson", displayName: "Alice Johnson", email: "alice@openslaq.dev" };
export const SHOWCASE_BOB: ApiUser = { userId: "Bob Martinez", displayName: "Bob Martinez", email: "bob@openslaq.dev" };
export const SHOWCASE_CAROL: ApiUser = { userId: "Carol Chen", displayName: "Carol Chen", email: "carol@openslaq.dev" };

function toTestUser(user: ApiUser): TestUser {
  return { id: user.userId, displayName: user.displayName, email: user.email, emailVerified: true };
}

async function createRpcClient(user: ApiUser) {
  const token = await signTestJwt(toTestUser(user));
  return { client: hc<AppType>(API_BASE, { headers: { Authorization: `Bearer ${token}` } }), token };
}

export class ApiHelper {
  private rpc: Promise<{ client: ReturnType<typeof hc<AppType>>; token: string }>;
  private workspaceSlug: string;

  constructor(user: ApiUser = DEFAULT_USER, workspaceSlug = "default") {
    this.rpc = createRpcClient(user);
    this.workspaceSlug = workspaceSlug;
  }

  private get slug() {
    return this.workspaceSlug;
  }

  private async c() {
    return (await this.rpc).client;
  }

  async createWorkspace(name: string) {
    const client = await this.c();
    const res = await client.api.workspaces.$post({ json: { name } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Failed to create workspace "${name}": ${res.status} ${body.slice(0, 160)}`);
    }
    return (await res.json()) as { id: string; name: string; slug: string };
  }

  async getChannels() {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels.$get({ param: { slug: this.slug } });
    return (await res.json()) as { id: string; name: string; description: string | null }[];
  }

  async getChannelByName(name: string) {
    const channels = await this.getChannels();
    const channel = channels.find((c) => c.name === name);
    if (!channel) throw new Error(`Channel "${name}" not found`);
    return channel;
  }

  async joinChannel(channelId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].join.$post({
      param: { slug: this.slug, id: channelId },
    });
    if (!res.ok) throw new Error(`Failed to join channel: ${res.status}`);
  }

  async createChannel(name: string, description?: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: this.slug },
      json: { name, description },
    });
    return (await res.json()) as { id: string; name: string; description: string | null };
  }

  async createPrivateChannel(name: string, description?: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels.$post({
      param: { slug: this.slug },
      json: { name, description, type: "private" as const },
    });
    return (await res.json()) as { id: string; name: string; description: string | null };
  }

  async addChannelMember(channelId: string, userId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug: this.slug, id: channelId },
      json: { userId },
    });
    if (!res.ok) throw new Error(`Failed to add channel member: ${res.status}`);
  }

  async removeChannelMember(channelId: string, userId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].members[":userId"].$delete({
      param: { slug: this.slug, id: channelId, userId },
    });
    if (!res.ok) throw new Error(`Failed to remove channel member: ${res.status}`);
  }

  async createMessage(channelId: string, content: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$post({
      param: { slug: this.slug, id: channelId },
      json: { content },
    });
    if (!res.ok) throw new Error(`Failed to create message: ${res.status}`);
    return (await res.json()) as { id: string; channelId: string; userId: string; content: string; createdAt: string; updatedAt: string };
  }

  async getMessages(channelId: string, limit = 50) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.$get({
      param: { slug: this.slug, id: channelId },
      query: { limit },
    });
    return (await res.json()) as { messages: { id: string; channelId: string; userId: string; content: string; createdAt: string; updatedAt: string }[]; nextCursor: string | null };
  }

  async createThreadReply(channelId: string, parentMessageId: string, content: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug: this.slug, id: channelId, messageId: parentMessageId },
      json: { content },
    });
    return (await res.json()) as { id: string; channelId: string; userId: string; content: string; createdAt: string; updatedAt: string };
  }

  async toggleReaction(messageId: string, emoji: string) {
    const client = await this.c();
    const res = await client.api.messages[":id"].reactions.$post({
      param: { id: messageId },
      json: { emoji },
    });
    return (await res.json()) as { reactions: { emoji: string; count: number; userIds: string[] }[] };
  }

  async editMessage(messageId: string, content: string) {
    const client = await this.c();
    const res = await client.api.messages[":id"].$put({
      param: { id: messageId },
      json: { content },
    });
    return (await res.json()) as { id: string; channelId: string; userId: string; content: string; createdAt: string; updatedAt: string };
  }

  async deleteMessage(messageId: string) {
    const client = await this.c();
    const res = await client.api.messages[":id"].$delete({
      param: { id: messageId },
    });
    return (await res.json()) as { ok: boolean };
  }

  async getChannelMembers(channelId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].members.$get({
      param: { slug: this.slug, id: channelId },
    });
    return (await res.json()) as { id: string; displayName: string; email: string; avatarUrl: string | null; joinedAt: string }[];
  }

  async getMembers() {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].members.$get({
      param: { slug: this.slug },
      query: {},
    });
    return (await res.json()) as { id: string; displayName: string; email: string; avatarUrl: string | null }[];
  }

  async createDm(userId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].dm.$post({
      param: { slug: this.slug },
      json: { userId },
    });
    return (await res.json()) as { channel: { id: string; name: string; description: string | null; type: string }; otherUser: { id: string; displayName: string } };
  }

  async getDms() {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].dm.$get({
      param: { slug: this.slug },
    });
    return (await res.json()) as { channel: { id: string; name: string; description: string | null; type: string }; otherUser: { id: string; displayName: string } }[];
  }

  async createGroupDm(memberIds: string[]) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"]["group-dm"].$post({
      param: { slug: this.slug },
      json: { memberIds },
    });
    if (!res.ok) throw new Error(`Failed to create group DM: ${res.status}`);
    return (await res.json()) as { channel: { id: string; type: string; displayName: string | null }; members: { id: string; displayName: string }[] };
  }

  async createInvite() {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].invites.$post({
      param: { slug: this.slug },
      json: {},
    });
    if (!res.ok) throw new Error(`Failed to create invite: ${res.status}`);
    return (await res.json()) as { id: string; code: string };
  }

  async acceptInvite(code: string) {
    const client = await this.c();
    const res = await client.api.invites[":code"].accept.$post({
      param: { code },
    });
    if (!res.ok) throw new Error(`Failed to accept invite: ${res.status}`);
    return (await res.json()) as { slug: string };
  }

  async deleteWorkspace() {
    const client = await this.c();
    await client.api.workspaces[":slug"].$delete({ param: { slug: this.slug } });
  }

  async searchMessages(q: string, options?: { channelId?: string; userId?: string; limit?: number; offset?: number }) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].search.$get({
      param: { slug: this.slug },
      query: {
        q,
        channelId: options?.channelId,
        userId: options?.userId,
        limit: options?.limit,
        offset: options?.offset,
      },
    });
    return (await res.json()) as { results: { messageId: string; headline: string; channelId: string }[]; total: number };
  }

  async archiveChannel(channelId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].archive.$post({
      param: { slug: this.slug, id: channelId },
    });
    if (!res.ok) throw new Error(`Failed to archive channel: ${res.status}`);
    return (await res.json()) as { id: string; name: string; description: string | null };
  }

  async unarchiveChannel(channelId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].unarchive.$post({
      param: { slug: this.slug, id: channelId },
    });
    if (!res.ok) throw new Error(`Failed to unarchive channel: ${res.status}`);
    return (await res.json()) as { id: string; name: string; description: string | null };
  }

  async updateChannelDescription(channelId: string, description: string | null) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].$patch({
      param: { slug: this.slug, id: channelId },
      json: { description },
    });
    return (await res.json()) as { id: string; name: string; description: string | null };
  }

  async getUnreadCounts() {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"]["unread-counts"].$get({
      param: { slug: this.slug },
    });
    return (await res.json()) as Record<string, number>;
  }

  async markChannelAsRead(channelId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].read.$post({
      param: { slug: this.slug, id: channelId },
    });
    return (await res.json()) as { ok: boolean };
  }

  async pinMessage(channelId: string, messageId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$post({
      param: { slug: this.slug, id: channelId, messageId },
    });
    return (await res.json()) as { ok: boolean };
  }

  async unpinMessage(channelId: string, messageId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].pin.$delete({
      param: { slug: this.slug, id: channelId, messageId },
    });
    return (await res.json()) as { ok: boolean };
  }

  async getPinnedCount(channelId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"]["pin-count"].$get({
      param: { slug: this.slug, id: channelId },
    });
    return (await res.json()) as { count: number };
  }

  async shareMessage(destinationChannelId: string, sharedMessageId: string, comment = "") {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].messages.share.$post({
      param: { slug: this.slug, id: destinationChannelId },
      json: { sharedMessageId, comment },
    });
    if (!res.ok) throw new Error(`Failed to share message: ${res.status}`);
    return (await res.json()) as { id: string; channelId: string; content: string };
  }

  async uploadFile(name: string, content: string | Buffer, mimeType: string) {
    const { token } = await this.rpc;
    const blobContent = typeof content === "string" ? content : new Uint8Array(content);
    const blob = new Blob([blobContent], { type: mimeType });
    const file = new File([blob], name, { type: mimeType });
    const form = new FormData();
    form.append("files", file);

    const res = await fetch(`${API_BASE}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const body = (await res.json()) as { attachments: { id: string; filename: string; mimeType: string; size: number }[] };
    return body.attachments[0]!;
  }
}

export function createApi(user?: ApiUser, workspaceSlug?: string): ApiHelper {
  return new ApiHelper(user, workspaceSlug);
}
