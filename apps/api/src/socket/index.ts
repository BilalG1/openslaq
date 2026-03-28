import type { Server } from "socket.io";
import * as jose from "jose";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@openslaq/shared";
import { asUserId, asChannelId } from "@openslaq/shared";
import { jwks, jwtVerifyOptions, e2eTestSecret, builtinJwtSecret } from "../auth/jwt";
import { env } from "../env";
import { db } from "../db";
import { channelMembers } from "../channels/schema";
import { botApps } from "../bots/schema";
import { apiKeys } from "../api-keys/schema";
import { hashToken } from "../bots/token";
import { isChannelMember } from "../channels/service";
import { workspaceMembers } from "../workspaces/schema";
import { users } from "../users/schema";
import {
  addSocket,
  removeSocket,
  getOnlineUserIds,
  persistLastSeen,
  getUserWorkspaceIds,
  updateHeartbeat,
  getSocketCountForUser,
  MAX_SOCKETS_PER_USER,
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

// Dedicated connection for NOTIFY (typing broadcasts)
const notifySql = postgres(env.DATABASE_URL, { max: 3 });
// Dedicated connection for LISTEN (must be max: 1 for postgres.js LISTEN)
const listenSql = postgres(env.DATABASE_URL, { max: 1 });

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
    .where(inArray(workspaceMembers.workspaceId, workspaceIds))
    .limit(5000);

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
  // Set up LISTEN for cross-process typing broadcasts
  listenSql.listen("typing", (payload) => {
    try {
      const { userId, channelId } = JSON.parse(payload);
      io.to(`channel:${channelId}`).emit("user:typing", { userId, channelId });
    } catch {
      // Ignore malformed payloads
    }
  });

  // Authenticate on connection
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    // Bot token auth: validate osb_* tokens against botApps table
    if (token.startsWith("osb_")) {
      try {
        const hash = hashToken(token);
        const bot = await db.query.botApps.findFirst({
          where: eq(botApps.apiToken, hash),
        });
        if (!bot || !bot.enabled) {
          return next(new Error("Invalid bot token"));
        }
        socket.data.userId = asUserId(bot.userId);
        socket.data.isBot = true;
        return next();
      } catch {
        return next(new Error("Invalid bot token"));
      }
    }

    // API key auth: validate osk_* tokens against apiKeys table
    if (token.startsWith("osk_")) {
      try {
        const hash = hashToken(token);
        const row = await db.query.apiKeys.findFirst({
          where: eq(apiKeys.tokenHash, hash),
        });
        if (!row) {
          return next(new Error("Invalid API key"));
        }
        if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
          return next(new Error("API key expired"));
        }
        const user = await db.query.users.findFirst({
          where: eq(users.id, row.userId),
        });
        if (!user) {
          return next(new Error("Invalid API key"));
        }
        socket.data.userId = asUserId(user.id);
        return next();
      } catch {
        return next(new Error("Invalid API key"));
      }
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
      // Builtin auth mode: verify against local secret
      if (env.AUTH_MODE === "builtin" && builtinJwtSecret) {
        const { payload } = await jose.jwtVerify(token, builtinJwtSecret);
        const parsed = socketJwtSchema.parse(payload);
        socket.data.userId = asUserId(parsed.sub);
        return next();
      }

      // Stack Auth mode: verify against remote JWKS
      if (!jwks || !jwtVerifyOptions) {
        return next(new Error("Stack Auth not configured"));
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

    // Cap concurrent socket connections per user
    const socketCount = await getSocketCountForUser(userId);
    if (socketCount >= MAX_SOCKETS_PER_USER) {
      console.log(`Socket rejected for ${userId}: too many connections (${socketCount})`);
      socket.disconnect(true);
      return;
    }

    console.log(`Socket connected: ${userId}`);

    let workspaceIds: string[] = [];

    // Register event handlers synchronously so they're available immediately,
    // even if the client disconnects before the async init below completes.
    socket.on("channel:join", async ({ channelId }) => {
      const isMember = await isChannelMember(asChannelId(channelId), userId);
      if (!isMember) return;
      socket.join(`channel:${channelId}`);
    });

    socket.on("channel:leave", ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on("presence:heartbeat", () => {
      updateHeartbeat(userId, socket.id).catch(console.error);
    });

    socket.on("message:typing", async ({ channelId }) => {
      const isMember = await isChannelMember(asChannelId(channelId), userId);
      if (!isMember) return;

      const throttleKey = `${userId}:${channelId}`;
      const now = Date.now();
      const last = typingTimestamps.get(throttleKey);
      if (last && now - last < 3000) return;
      typingTimestamps.set(throttleKey, now);

      await notifySql.notify("typing", JSON.stringify({ userId, channelId }));
    });

    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${userId}`);
      const wentOffline = await removeSocket(userId, socket.id);

      // Only clean up huddle when user goes fully offline (no remaining sockets)
      if (wentOffline) {
        const huddleResult = await removeUserFromAllHuddles(userId);
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
      const cameOnline = await addSocket(userId, socket.id);
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

      const onlineIds = await getOnlineUserIds();
      socket.emit("presence:sync", {
        users: workspaceMemberRows.map((m) => {
          const expired = isStatusExpired(m.statusExpiresAt);
          return {
            userId: asUserId(m.userId),
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
      const activeHuddles = await getActiveHuddlesForChannels(channelIds);
      if (activeHuddles.length > 0) {
        socket.emit("huddle:sync", { huddles: activeHuddles });
      }
    } catch (err) {
      console.error(`Socket connection init failed for ${userId}:`, err);
      socket.disconnect(true);
      return;
    }
  });

  return io;
}
