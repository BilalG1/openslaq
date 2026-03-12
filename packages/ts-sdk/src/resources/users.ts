import type { HttpClient } from "../http";
import type { User } from "../types";

export interface UpdateMeOptions {
  displayName?: string;
  avatarUrl?: string;
}

export interface SetStatusOptions {
  emoji?: string;
  text?: string;
  expiresAt?: string;
}

export class Users {
  constructor(private readonly http: HttpClient) {}

  async me(): Promise<User> {
    const path = this.http.globalPath("/users/me");
    return this.http.get<User>(path);
  }

  async updateMe(options: UpdateMeOptions): Promise<User> {
    const path = this.http.globalPath("/users/me");
    return this.http.patch<User>(path, options);
  }

  async setStatus(options: SetStatusOptions): Promise<void> {
    const path = this.http.globalPath("/users/me/status");
    await this.http.putVoid(path, options);
  }

  async clearStatus(): Promise<void> {
    const path = this.http.globalPath("/users/me/status");
    await this.http.del(path);
  }
}
