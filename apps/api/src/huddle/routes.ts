import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import type { AuthEnv } from "../auth/types";
import { env } from "../env";
import { isChannelMember } from "../channels/service";
import { asChannelId, asUserId } from "@openslaq/shared";
import {
  generateHuddleToken,
  RoomManager,
  createWebhookReceiver,
  type LiveKitConfig,
} from "@openslaq/huddle/server";
import { MAX_HUDDLE_PARTICIPANTS, MAX_TOTAL_HUDDLE_PARTICIPANTS } from "@openslaq/huddle/shared";
import { getIO } from "../socket/io";
import {
  joinHuddle,
  leaveHuddle,
  getHuddleForChannel,
  setHuddleMessageId,
  isUserInAnyHuddle,
} from "./service";
import {
  createHuddleMessage,
  updateHuddleMessage,
} from "../messages/service";
import type { HuddleMessageMetadata, ChannelId, UserId } from "@openslaq/shared";
import { rlHuddleJoin } from "../rate-limit/tiers";

const liveKitConfig: LiveKitConfig = {
  apiKey: env.LIVEKIT_API_KEY,
  apiSecret: env.LIVEKIT_API_SECRET,
  apiUrl: env.LIVEKIT_API_URL,
  wsUrl: env.LIVEKIT_WS_URL,
};

const roomManager = new RoomManager(liveKitConfig);
const webhookReceiver = createWebhookReceiver(liveKitConfig);

const joinRoute = createRoute({
  method: "post",
  path: "/huddle/join",
  tags: ["Huddle"],
  summary: "Join a huddle",
  description: "Get a LiveKit token to join a huddle in a channel. Creates the room if needed.",
  security: [{ Bearer: [] }],
  middleware: [auth, rlHuddleJoin] as const,
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            channelId: z.string().describe("Channel ID to join huddle in"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "LiveKit token for joining the huddle",
      content: {
        "application/json": {
          schema: z.object({
            token: z.string(),
            wsUrl: z.string(),
            roomName: z.string(),
          }),
        },
      },
    },
    403: { description: "Not a channel member" },
    409: { description: "Room is full" },
    503: { description: "Server at capacity" },
  },
});

const webhookRoute = createRoute({
  method: "post",
  path: "/huddle/webhook",
  tags: ["Huddle"],
  summary: "LiveKit webhook",
  description: "Receives LiveKit webhook events for huddle state updates.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.any(),
        },
      },
    },
  },
  responses: {
    200: { description: "Webhook processed" },
  },
});

async function finalizeHuddleMessage(
  messageId: string,
  startedAt: string,
  participantHistory: string[],
  io: ReturnType<typeof getIO>,
  channelId: string,
): Promise<void> {
  try {
    const endedAt = new Date().toISOString();
    const duration = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
    const metadata: HuddleMessageMetadata = {
      huddleStartedAt: startedAt,
      huddleEndedAt: endedAt,
      duration,
      finalParticipants: participantHistory,
    };
    const updated = await updateHuddleMessage(messageId, metadata);
    if (updated) {
      io.to(`channel:${channelId}`).emit("message:updated", updated);
    }
  } catch (err) {
    console.error("Failed to update huddle system message:", err);
  }
}

const routes = new OpenAPIHono<AuthEnv>()
  .openapi(joinRoute, async (c) => {
    const user = c.get("user");
    const { channelId } = c.req.valid("json");

    // Verify channel membership
    const isMember = await isChannelMember(asChannelId(channelId), user.id);
    if (!isMember) {
      return c.json({ error: "Not a channel member" }, 403);
    }

    // Check if user is already in a different huddle
    const existing = await isUserInAnyHuddle(user.id);
    if (existing.inHuddle && existing.channelId !== channelId) {
      return c.json({ error: "You are already in a huddle in another channel. Leave it first." }, 409);
    }

    // Check server-wide capacity
    const totalParticipants = await roomManager.getTotalParticipantCount();
    if (totalParticipants >= MAX_TOTAL_HUDDLE_PARTICIPANTS) {
      return c.json({ error: "Huddle servers are at capacity. Please try again later." }, 503);
    }

    // Check per-room participant limit
    const existingParticipants = await roomManager.listParticipants(channelId);
    if (existingParticipants.length >= MAX_HUDDLE_PARTICIPANTS) {
      return c.json({ error: "Huddle is full" }, 409);
    }

    // Ensure LiveKit room exists
    const roomName = await roomManager.ensureRoom(channelId);

    // Generate token
    const token = await generateHuddleToken(liveKitConfig, {
      userId: user.id,
      roomName,
      displayName: user.displayName,
    });

    // Update server-side huddle state
    const huddle = await joinHuddle(channelId, user.id);
    const io = getIO();

    // Create system message if this is a new huddle (first participant, no messageId yet)
    if (huddle.participants.length === 1 && !huddle.messageId) {
      try {
        const metadata: HuddleMessageMetadata = { huddleStartedAt: huddle.startedAt };
        const sysMsg = await createHuddleMessage(channelId as ChannelId, user.id as UserId, metadata);
        await setHuddleMessageId(channelId, sysMsg.id);
        io.to(`channel:${channelId}`).emit("message:new", sysMsg);
      } catch (err) {
        console.error("Failed to create huddle system message:", err);
      }
    }

    io.to(`channel:${channelId}`).emit("huddle:started", huddle);

    return c.json({ token, wsUrl: env.LIVEKIT_WS_URL, roomName }, 200);
  })
  .openapi(webhookRoute, async (c) => {
    const body = await c.req.text();
    const authHeader = c.req.header("Authorization") ?? "";

    let event;
    try {
      event = await webhookReceiver.receive(body, authHeader);
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return c.json({ error: "Webhook verification failed" }, 401);
    }

    const io = getIO();

    if (event.event === "room_finished" && event.room?.name) {
      // Extract channelId from room name
      const channelId = event.room.name.replace(/^huddle-/, "");
      // Clean up server-side state
      const huddle = await getHuddleForChannel(channelId);
      if (huddle) {
        // Participants have all left, end the huddle
        io.to(`channel:${channelId}`).emit("huddle:ended", { channelId: asChannelId(channelId) });
      }
    }

    if (event.event === "participant_joined" && event.room?.name && event.participant) {
      const channelId = event.room.name.replace(/^huddle-/, "");
      const participantId = event.participant.identity;

      try {
        // Verify the participant is a channel member before joining
        const isMember = await isChannelMember(asChannelId(channelId), asUserId(participantId));
        if (!isMember) {
          console.warn(`Huddle participant_joined: user ${participantId} is not a member of channel ${channelId}, skipping`);
        } else {
          const huddle = await joinHuddle(channelId, participantId);
          io.to(`channel:${channelId}`).emit("huddle:updated", huddle);
        }
      } catch (err) {
        // If membership check fails (e.g. invalid channelId), still join the huddle
        // since the user was already authorized by LiveKit token issuance
        console.warn(`Huddle participant_joined: membership check failed for ${participantId} in ${channelId}, joining anyway:`, err);
        const huddle = await joinHuddle(channelId, participantId);
        io.to(`channel:${channelId}`).emit("huddle:updated", huddle);
      }
    }

    if (event.event === "participant_left" && event.room?.name && event.participant) {
      const result = await leaveHuddle(event.participant.identity);
      if (result.channelId) {
        if (result.ended) {
          if (result.messageId && result.startedAt) {
            await finalizeHuddleMessage(result.messageId, result.startedAt, result.participantHistory, io, result.channelId);
          }
          io.to(`channel:${result.channelId}`).emit("huddle:ended", {
            channelId: result.channelId,
          });
        } else if (result.huddle) {
          io.to(`channel:${result.channelId}`).emit("huddle:updated", result.huddle);
        }
      }
    }

    return c.json({ ok: true }, 200);
  });

export default routes;

/** Exported for testing */
export { roomManager };
