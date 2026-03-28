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

  async addChannelMember(channelId: string, userId: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].members.$post({
      param: { slug: this.slug, id: channelId },
      json: { userId },
    });
    if (!res.ok) throw new Error(`Failed to add channel member: ${res.status}`);
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

  async createThreadReply(channelId: string, parentMessageId: string, content: string) {
    const client = await this.c();
    const res = await client.api.workspaces[":slug"].channels[":id"].messages[":messageId"].replies.$post({
      param: { slug: this.slug, id: channelId, messageId: parentMessageId },
      json: { content },
    });
    return (await res.json()) as { id: string; channelId: string; userId: string; content: string; createdAt: string; updatedAt: string };
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
}

export function createApi(user?: ApiUser, workspaceSlug?: string): ApiHelper {
  return new ApiHelper(user, workspaceSlug);
}
