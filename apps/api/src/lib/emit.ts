import type { ChannelId, UserId, WorkspaceId } from "@openslaq/shared";
import type { ServerToClientEvents } from "@openslaq/shared";
import { getIO } from "../socket/io";

export function emitToChannel<E extends keyof ServerToClientEvents>(
  channelId: ChannelId, event: E, ...args: Parameters<ServerToClientEvents[E]>
) {
  getIO().to(`channel:${channelId}`).emit(event, ...args);
}

export function emitToWorkspace<E extends keyof ServerToClientEvents>(
  workspaceId: WorkspaceId, event: E, ...args: Parameters<ServerToClientEvents[E]>
) {
  getIO().to(`workspace:${workspaceId}`).emit(event, ...args);
}

export function emitToUser<E extends keyof ServerToClientEvents>(
  userId: UserId, event: E, ...args: Parameters<ServerToClientEvents[E]>
) {
  getIO().to(`user:${userId}`).emit(event, ...args);
}
