import type { HttpClient } from "../http";
import type { Channel, GroupDmAddMemberResponse, GroupDmChannel } from "../types";

export interface CreateGroupDmOptions {
  memberIds: string[];
}

export class GroupDms {
  constructor(private readonly http: HttpClient) {}

  async create(options: CreateGroupDmOptions): Promise<GroupDmChannel> {
    const path = this.http.workspacePath("/group-dm");
    return this.http.post<GroupDmChannel>(path, { memberIds: options.memberIds });
  }

  async list(): Promise<GroupDmChannel[]> {
    const path = this.http.workspacePath("/group-dm");
    return this.http.get<GroupDmChannel[]>(path);
  }

  async addMember(channelId: string, userId: string): Promise<GroupDmAddMemberResponse> {
    const path = this.http.workspacePath(`/group-dm/${channelId}/members`);
    return this.http.post<GroupDmAddMemberResponse>(path, { userId });
  }

  async leave(channelId: string): Promise<void> {
    const path = this.http.workspacePath(`/group-dm/${channelId}/members/me`);
    await this.http.del(path);
  }

  async rename(channelId: string, displayName: string): Promise<{ channel: Channel }> {
    const path = this.http.workspacePath(`/group-dm/${channelId}`);
    return this.http.patch<{ channel: Channel }>(path, { displayName });
  }
}
