import type { Server } from "socket.io";
import * as jose from "jose";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@openslaq/shared";
import { asUserId, asChannelId } from "@openslaq/shared";
import { jwks, jwtVerifyOptions, e2eTestSecret } from "../auth/jwt";
import { db } from "../db";
import { channelMembers } from "../channels/schema";
import { isChannelMember } from "../channels/service";
import { workspaceMembers } from "../workspaces/schema";
import { users } from "../users/schema";
import {
  addSocket,
  removeSocket,
  getOnlineUserIds,
  persistLastSeen,
  getUserWorkspaceIds,
} from "../presence/service";
import { isStatusExpired } from "../users/service";
import {
  getActiveHuddlesForChannels,
  removeUserFromAllHuddles,
} from "../huddle/service";
import { updateHuddleMessage } from "../messages/service";
import type { HuddleMessageMetadata } from "@openslaq/shared";
import { webhookDispatcher } from "../bots/webhook-dispatcher";

const socketJwtSchema = z.object({ sub: z.string() });

const typingTimestamps = new Map<string, number>();

// Periodically clean up stale typing entries to prevent unbounded growth
setInterval(() => {
  const cutoff = Date.now() - 3000;
  for (const [key, ts] of typingTimestamps) {
    if (ts < cutoff) typingTimestamps.delete(key);
  }
}, 30_000);

export async function getPresenceSnapshotForWorkspaces(workspaceIds: string[]) {
  if (workspaceIds.length === 0) return [];

  const rows = await db
    .select({
      userId: workspaceMembers.userId,
      lastSeenAt: users.lastSeenAt,
      statusEmoji: users.statusEmoji,
      statusText: users.statusText,
      statusExpiresAt: users.statusExpiresAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(inArray(workspaceMembers.workspaceId, workspaceIds));

  // A user can appear in multiple workspaces; presence sync payload should include each user once.
  const byUserId = new Map<string, {
    userId: string;
    lastSeenAt: Date | null;
    statusEmoji: string | null;
    statusText: string | null;
    statusExpiresAt: Date | null;
  }>();
  for (const row of rows) {
    byUserId.set(row.userId, row);
  }
  return [...byUserId.values()];
}

export function setupSocketHandlers(
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >,
) {
  // Authenticate on connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      // Try HMAC first when e2e secret is configured (avoids network call)
      if (e2eTestSecret) {
        try {
          const { payload } = await jose.jwtVerify(token, e2eTestSecret);
          const parsed = socketJwtSchema.parse(payload);
          socket.data.userId = asUserId(parsed.sub);
          return next();
        } catch {
          // Not an HMAC token — fall through to JWKS
        }
      }
      const { payload } = await jose.jwtVerify(token, jwks, jwtVerifyOptions);
      const parsed = socketJwtSchema.parse(payload);
      socket.data.userId = asUserId(parsed.sub);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    console.log(`Socket connected: ${userId}`);

    let workspaceIds: string[] = [];

    try {
      // Auto-join all channels the user is a member of
      const memberships = await db
        .select({ channelId: channelMembers.channelId })
        .from(channelMembers)
        .where(eq(channelMembers.userId, userId));
      for (const { channelId } of memberships) {
        socket.join(`channel:${channelId}`);
      }

      // Join workspace rooms for presence broadcasts
      workspaceIds = await getUserWorkspaceIds(userId);
      for (const wsId of workspaceIds) {
        socket.join(`workspace:${wsId}`);
      }

      // Join user-private room for scheduled message events etc.
      socket.join(`user:${userId}`);

      // Track presence
      const cameOnline = addSocket(userId, socket.id);
      if (cameOnline) {
        for (const wsId of workspaceIds) {
          io.to(`workspace:${wsId}`).emit("presence:updated", {
            userId,
            status: "online",
            lastSeenAt: null,
          });
          webhookDispatcher.dispatch({
            type: "presence:updated",
            workspaceId: wsId,
            data: { userId, status: "online", lastSeenAt: null },
          });
        }
      }

      // Send presence snapshot to connecting client
      const workspaceMemberRows = await getPresenceSnapshotForWorkspaces(workspaceIds);

      const onlineIds = getOnlineUserIds();
      socket.emit("presence:sync", {
        users: workspaceMemberRows.map((m) => {
          const expired = isStatusExpired(m.statusExpiresAt);
          return {
            userId: m.userId,
            status: (onlineIds.has(m.userId) ? "online" : "offline") as "online" | "offline",
            lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
            statusEmoji: expired ? null : (m.statusEmoji ?? null),
            statusText: expired ? null : (m.statusText ?? null),
            statusExpiresAt: expired ? null : (m.statusExpiresAt?.toISOString() ?? null),
          };
        }),
      });

      // Send active huddles for user's channels
      const channelIds = memberships.map((m) => m.channelId);
      const activeHuddles = getActiveHuddlesForChannels(channelIds);
      if (activeHuddles.length > 0) {
        socket.emit("huddle:sync", { huddles: activeHuddles });
      }
    } catch (err) {
      console.error(`Socket connection init failed for ${userId}:`, err);
      socket.disconnect(true);
      return;
    }

    socket.on("channel:join", async ({ channelId }) => {
      const isMember = await isChannelMember(asChannelId(channelId), userId);
      if (!isMember) return;
      socket.join(`channel:${channelId}`);
    });

    socket.on("channel:leave", ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("message:typing", async ({ channelId }) => {
      const isMember = await isChannelMember(asChannelId(channelId), userId);
      if (!isMember) return;

      const throttleKey = `${userId}:${channelId}`;
      const now = Date.now();
      const last = typingTimestamps.get(throttleKey);
      if (last && now - last < 3000) return;
      typingTimestamps.set(throttleKey, now);

      socket.to(`channel:${channelId}`).emit("user:typing", {
        userId,
        channelId,
      });
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${userId}`);
      const wentOffline = removeSocket(userId, socket.id);

      // Only clean up huddle when user goes fully offline (no remaining sockets)
      if (wentOffline) {
        const huddleResult = removeUserFromAllHuddles(userId);
        if (huddleResult.channelId) {
          if (huddleResult.ended) {
            // Update the huddle system message with end metadata
            if (huddleResult.messageId && huddleResult.startedAt) {
              try {
                const endedAt = new Date().toISOString();
                const duration = Math.round((new Date(endedAt).getTime() - new Date(huddleResult.startedAt).getTime()) / 1000);
                const metadata: HuddleMessageMetadata = {
                  huddleStartedAt: huddleResult.startedAt,
                  huddleEndedAt: endedAt,
                  duration,
                  finalParticipants: huddleResult.participantHistory,
                };
                const updated = await updateHuddleMessage(huddleResult.messageId, metadata);
                if (updated) {
                  io.to(`channel:${huddleResult.channelId}`).emit("message:updated", updated);
                }
              } catch (err) {
                console.error("Failed to update huddle system message on disconnect:", err);
              }
            }
            io.to(`channel:${huddleResult.channelId}`).emit("huddle:ended", {
              channelId: huddleResult.channelId,
            });
          } else if (huddleResult.huddle) {
            io.to(`channel:${huddleResult.channelId}`).emit(
              "huddle:updated",
              huddleResult.huddle,
            );
          }
        }

        await persistLastSeen(userId);
        const now = new Date().toISOString();
        for (const wsId of workspaceIds) {
          io.to(`workspace:${wsId}`).emit("presence:updated", {
            userId,
            status: "offline",
            lastSeenAt: now,
          });
          webhookDispatcher.dispatch({
            type: "presence:updated",
            workspaceId: wsId,
            data: { userId, status: "offline", lastSeenAt: now },
          });
        }
      }
    });
  });

  return io;
}
