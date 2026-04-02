import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "../auth/middleware";
import type { AuthEnv } from "../auth/types";
import { env } from "../env";
import { BEARER_SECURITY, jsonBody, jsonContent } from "../lib/openapi-helpers";
import { isChannelMember } from "../channels/service";
import { asChannelId, asUserId } from "@openslaq/shared";
import {
  generateHuddleToken,
  RoomManager,
  createWebhookReceiver,
  type LiveKitConfig,
} from "@openslaq/huddle/server";
import { MAX_HUDDLE_PARTICIPANTS, MAX_TOTAL_HUDDLE_PARTICIPANTS } from "@openslaq/huddle/shared";
import { emitToChannel } from "../lib/emit";
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
import { ForbiddenError, UnauthorizedError, ConflictError, ServiceUnavailableError } from "../errors";
import { captureException } from "../sentry";

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
  security: BEARER_SECURITY,
  middleware: [auth, rlHuddleJoin] as const,
  request: {
    body: jsonBody(z.object({
      channelId: z.string().describe("Channel ID to join huddle in"),
    })),
  },
  responses: {
    200: jsonContent(z.object({
      token: z.string(),
      wsUrl: z.string(),
      roomName: z.string(),
    }), "LiveKit token for joining the huddle"),
    403: { description: "Not a channel member" },
    409: { description: "Room is full" },
    503: { description: "Server at capacity" },
  },
});

const leaveRoute = createRoute({
  method: "post",
  path: "/huddle/leave",
  tags: ["Huddle"],
  summary: "Leave a huddle",
  description: "Removes the authenticated user from their current huddle. Ends the huddle if they are the last participant.",
  security: BEARER_SECURITY,
  middleware: [auth] as const,
  request: {},
  responses: {
    200: jsonContent(z.object({
      ended: z.boolean(),
    }), "Left the huddle (or was not in one)"),
  },
});

const webhookRoute = createRoute({
  method: "post",
  path: "/huddle/webhook",
  tags: ["Huddle"],
  summary: "LiveKit webhook",
  description: "Receives LiveKit webhook events for huddle state updates.",
  request: {
    body: jsonBody(z.any()),
  },
  responses: {
    200: { description: "Webhook processed" },
  },
});

async function finalizeHuddleMessage(
  messageId: string,
  startedAt: string,
  participantHistory: string[],
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
      emitToChannel(asChannelId(channelId), "message:updated", updated);
    }
  } catch (err) {
    captureException(err, { channelId, op: "huddle:finalize-message" });
  }
}

const routes = new OpenAPIHono<AuthEnv>()
  .openapi(joinRoute, async (c) => {
    const user = c.get("user");
    const { channelId } = c.req.valid("json");

    // Verify channel membership
    const isMember = await isChannelMember(asChannelId(channelId), user.id);
    if (!isMember) {
      throw new ForbiddenError("Not a channel member");
    }

    // Check if user is already in a different huddle
    const existing = await isUserInAnyHuddle(user.id);
    if (existing.inHuddle && existing.channelId !== channelId) {
      throw new ConflictError("You are already in a huddle in another channel. Leave it first.");
    }

    // Check server-wide capacity
    const totalParticipants = await roomManager.getTotalParticipantCount();
    if (totalParticipants >= MAX_TOTAL_HUDDLE_PARTICIPANTS) {
      throw new ServiceUnavailableError("Huddle servers are at capacity. Please try again later.");
    }

    // Check per-room participant limit
    const existingParticipants = await roomManager.listParticipants(channelId);
    if (existingParticipants.length >= MAX_HUDDLE_PARTICIPANTS) {
      throw new ConflictError("Huddle is full");
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

    // Create system message if this is a new huddle (first participant, no messageId yet)
    if (huddle.participants.length === 1 && !huddle.messageId) {
      try {
        const metadata: HuddleMessageMetadata = { huddleStartedAt: huddle.startedAt };
        const sysMsg = await createHuddleMessage(channelId as ChannelId, user.id as UserId, metadata);
        await setHuddleMessageId(channelId, sysMsg.id);
        emitToChannel(asChannelId(channelId), "message:new", sysMsg);
      } catch (err) {
        captureException(err, { userId: user.id, channelId, op: "huddle:system-message" });
      }
    }

    emitToChannel(asChannelId(channelId), "huddle:started", huddle);

    const wsUrl = env.LIVEKIT_PUBLIC_WS_URL ?? env.LIVEKIT_WS_URL;
    return c.json({ token, wsUrl, roomName }, 200);
  })
  .openapi(leaveRoute, async (c) => {
    const user = c.get("user");
    const result = await leaveHuddle(user.id);

    if (result.channelId) {
      if (result.ended) {
        if (result.messageId && result.startedAt) {
          await finalizeHuddleMessage(result.messageId, result.startedAt, result.participantHistory, result.channelId);
        }
        emitToChannel(asChannelId(result.channelId), "huddle:ended", {
          channelId: result.channelId,
        });
      } else if (result.huddle) {
        emitToChannel(asChannelId(result.channelId), "huddle:updated", result.huddle);
      }
    }

    return c.json({ ended: result.ended }, 200);
  })
  .openapi(webhookRoute, async (c) => {
    const body = await c.req.text();
    const authHeader = c.req.header("Authorization") ?? "";

    let event;
    try {
      event = await webhookReceiver.receive(body, authHeader);
    } catch (err) {
      console.error("Webhook verification failed:", err);
      throw new UnauthorizedError("Webhook verification failed");
    }

    if (event.event === "room_finished" && event.room?.name) {
      // Extract channelId from room name
      const channelId = event.room.name.replace(/^huddle-/, "");
      // Clean up server-side state
      const huddle = await getHuddleForChannel(channelId);
      if (huddle) {
        // Participants have all left, end the huddle
        emitToChannel(asChannelId(channelId), "huddle:ended", { channelId: asChannelId(channelId) });
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
          emitToChannel(asChannelId(channelId), "huddle:updated", huddle);
        }
      } catch (err) {
        // If membership check fails (e.g. invalid channelId), still join the huddle
        // since the user was already authorized by LiveKit token issuance
        console.warn(`Huddle participant_joined: membership check failed for ${participantId} in ${channelId}, joining anyway:`, err);
        const huddle = await joinHuddle(channelId, participantId);
        emitToChannel(asChannelId(channelId), "huddle:updated", huddle);
      }
    }

    if (event.event === "participant_left" && event.room?.name && event.participant) {
      const result = await leaveHuddle(event.participant.identity);
      if (result.channelId) {
        if (result.ended) {
          if (result.messageId && result.startedAt) {
            await finalizeHuddleMessage(result.messageId, result.startedAt, result.participantHistory, result.channelId);
          }
          emitToChannel(asChannelId(result.channelId), "huddle:ended", {
            channelId: result.channelId,
          });
        } else if (result.huddle) {
          emitToChannel(asChannelId(result.channelId), "huddle:updated", result.huddle);
        }
      }
    }

    return c.json({ ok: true }, 200);
  });

export default routes;

/** Exported for testing */
export { roomManager };
