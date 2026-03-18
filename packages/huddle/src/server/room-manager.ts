import { RoomServiceClient } from "livekit-server-sdk";
import { LIVEKIT_ROOM_PREFIX } from "../shared/constants";
import type { LiveKitConfig } from "./types";

export class RoomManager {
  private client: RoomServiceClient;

  constructor(config: LiveKitConfig) {
    this.client = new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret);
  }

  static roomNameForChannel(channelId: string): string {
    return `${LIVEKIT_ROOM_PREFIX}${channelId}`;
  }

  async ensureRoom(channelId: string): Promise<string> {
    const roomName = RoomManager.roomNameForChannel(channelId);
    try {
      await this.client.createRoom({ name: roomName, emptyTimeout: 300 });
    } catch (err: unknown) {
      // Room may already exist — that's fine
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("already exists")) {
        throw err;
      }
    }
    return roomName;
  }

  async deleteRoom(channelId: string): Promise<void> {
    const roomName = RoomManager.roomNameForChannel(channelId);
    try {
      await this.client.deleteRoom(roomName);
    } catch {
      // Room may not exist — that's fine
    }
  }

  async listParticipants(channelId: string) {
    const roomName = RoomManager.roomNameForChannel(channelId);
    try {
      return await this.client.listParticipants(roomName);
    } catch {
      return [];
    }
  }

  async listRooms() {
    try {
      return await this.client.listRooms();
    } catch {
      return [];
    }
  }

  async getTotalParticipantCount(): Promise<number> {
    const rooms = await this.listRooms();
    return rooms.reduce((sum, room) => sum + room.numParticipants, 0);
  }

  async removeParticipant(channelId: string, userId: string): Promise<void> {
    const roomName = RoomManager.roomNameForChannel(channelId);
    try {
      await this.client.removeParticipant(roomName, userId);
    } catch {
      // Participant may have already left
    }
  }
}
