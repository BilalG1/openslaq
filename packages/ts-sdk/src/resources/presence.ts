import type { HttpClient } from "../http";
import type { PresenceEntry } from "../types";

export class Presence {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<PresenceEntry[]> {
    const path = this.http.workspacePath("/presence");
    return this.http.get<PresenceEntry[]>(path);
  }
}
