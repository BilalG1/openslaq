import type { HttpClient } from "../http";
import type { DmChannel, OpenDmResponse } from "../types";

export class Dms {
  constructor(private readonly http: HttpClient) {}

  async open(userId: string): Promise<OpenDmResponse> {
    const path = this.http.workspacePath("/dm");
    return this.http.post<OpenDmResponse>(path, { userId });
  }

  async list(): Promise<DmChannel[]> {
    const path = this.http.workspacePath("/dm");
    return this.http.get<DmChannel[]>(path);
  }
}
