import type { HttpClient } from "../http";
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
  constructor(private readonly http: HttpClient) {}

  async create(options: CreateScheduledMessageOptions): Promise<ScheduledMessage> {
    const path = this.http.workspacePath("/scheduled-messages");
    return this.http.post<ScheduledMessage>(path, options);
  }

  async list(): Promise<ScheduledMessageWithChannel[]> {
    const path = this.http.workspacePath("/scheduled-messages");
    return this.http.get<ScheduledMessageWithChannel[]>(path);
  }

  async get(id: string): Promise<ScheduledMessage> {
    const path = this.http.workspacePath(`/scheduled-messages/${id}`);
    return this.http.get<ScheduledMessage>(path);
  }

  async update(id: string, options: UpdateScheduledMessageOptions): Promise<ScheduledMessage> {
    const path = this.http.workspacePath(`/scheduled-messages/${id}`);
    return this.http.put<ScheduledMessage>(path, options);
  }

  async delete(id: string): Promise<void> {
    const path = this.http.workspacePath(`/scheduled-messages/${id}`);
    await this.http.del(path);
  }

  async countByChannel(channelId: string): Promise<{ count: number }> {
    const path = this.http.workspacePath(`/scheduled-messages/channel/${channelId}`);
    return this.http.get<{ count: number }>(path);
  }
}
