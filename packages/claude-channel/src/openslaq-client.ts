import type { BotChannel, BotMessage, BotUser } from "./types";

export class OpenSlaqClient {
  constructor(
    private apiUrl: string,
    private botToken: string,
    private workspaceSlug: string,
  ) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.apiUrl}/api/workspaces/${this.workspaceSlug}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.botToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`OpenSlaq API error: ${res.status} ${await res.text()}`);
    }
    return res.json() as Promise<T>;
  }

  async sendMessage(
    channelId: string,
    content: string,
  ): Promise<BotMessage> {
    return this.request<BotMessage>(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  async getUser(userId: string): Promise<BotUser> {
    return this.request<BotUser>(`/members/${userId}`);
  }

  async listChannels(): Promise<BotChannel[]> {
    return this.request<BotChannel[]>("/channels");
  }
}
