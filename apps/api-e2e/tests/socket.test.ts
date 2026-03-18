import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { setupSocketHandlers } from "../../api/src/socket";
import {
  removeAllSocketsForUser,
  getWorkspacePresence,
} from "../../api/src/presence/service";
import {
  startHuddle,
  setHuddleMessageId,
  _resetForTests as resetHuddles,
} from "../../api/src/huddle/service";
import { createHuddleMessage } from "../../api/src/messages/service";
import {
  createTestClient,
  testId,
  createTestWorkspace,
  addToWorkspace,
  signTestJwt,
} from "./helpers/api-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  ChannelId,
} from "@openslaq/shared";
import { asChannelId, asUserId } from "@openslaq/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TypedServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

let httpServer: ReturnType<typeof createServer>;
let io: TypedServer;
let serverPort: number;

function connectSocket(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://127.0.0.1:${serverPort}`, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("Socket connect timed out")), 5000);
  });
}

/** Connect and wait for presence:sync so we know the connection handler has fully completed */
async function connectAndSettle(token: string): Promise<ClientSocket> {
  const socket = await connectSocket(token);
  await waitForEvent(socket, "presence:sync");
  return socket;
}

function waitForEvent<T>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}"`)),
      timeoutMs,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/** Wait for a specific event that matches a filter predicate */
function waitForFilteredEvent<T>(
  socket: ClientSocket,
  event: string,
  filter: (data: T) => boolean,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).off(event, handler);
      reject(new Error(`Timed out waiting for filtered "${event}"`));
    }, timeoutMs);
    const handler = (data: T) => {
      if (filter(data)) {
        clearTimeout(timer);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (socket as any).off(event, handler);
        resolve(data);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).on(event, handler);
  });
}

async function expectNoEvent(
  socket: ClientSocket,
  event: string,
  waitMs = 300,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).off(event);
      resolve();
    }, waitMs);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).once(event, () => {
      clearTimeout(timer);
      reject(new Error(`Unexpected event "${event}" received`));
    });
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Remove all presence entries for a user directly (avoids races with in-flight disconnect handlers) */
async function cleanupPresence(userId: string) {
  await removeAllSocketsForUser(userId);
}

// ---------------------------------------------------------------------------
// Global setup: real Socket.IO server + test users + workspace + channels
// ---------------------------------------------------------------------------

let user1Token: string;
let user2Token: string;
let user1Id: string;
let user2Id: string;
let workspaceId: string;
let workspaceSlug: string;
let channelId: string;
// Channels created in beforeAll to avoid rate limiting from per-test creation
let typingChannelId: string; // both users are members
let throttleChannelId: string; // both users are members
let nonMemberChannelId: string; // only user1 is a member
let joinTestChannelId: string; // both users are members (for explicit join test)
let privateChannelId: string; // only user1 is a member (private)
let activeSockets: ClientSocket[] = [];

beforeAll(async () => {
  // 1. Spin up a real Socket.IO server on a free port
  httpServer = createServer();
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    transports: ["websocket"],
  }) as TypedServer;
  setupSocketHandlers(io);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = httpServer.address();
  if (!addr || typeof addr === "string") throw new Error("No address");
  serverPort = addr.port;

  // 2. Create test users + workspace + channels via existing HTTP helpers
  const id = testId();
  user1Id = `sock-user1-${id}`;
  user2Id = `sock-user2-${id}`;

  const ctx1 = await createTestClient({
    id: user1Id,
    displayName: "Socket User 1",
    email: `sock1-${id}@openslaq.dev`,
  });
  const ctx2 = await createTestClient({
    id: user2Id,
    displayName: "Socket User 2",
    email: `sock2-${id}@openslaq.dev`,
  });

  const workspace = await createTestWorkspace(ctx1.client);
  workspaceId = workspace.id;
  workspaceSlug = workspace.slug;
  await addToWorkspace(ctx1.client, workspaceSlug, ctx2.client);

  // Helper to create a channel
  async function createChannel(name: string, opts?: { type?: "private" }) {
    const res = await ctx1.client.api.workspaces[":slug"].channels.$post({
      param: { slug: workspaceSlug },
      json: { name, ...opts },
    });
    if (res.status !== 201) throw new Error(`Channel create failed: ${res.status}`);
    return ((await res.json()) as { id: string }).id;
  }

  // Main shared channel — both users are members
  channelId = await createChannel(`sock-ch-${id}`);
  await ctx2.client.api.workspaces[":slug"].channels[":id"].join.$post({
    param: { slug: workspaceSlug, id: channelId },
  });

  // Typing test channel — both users
  typingChannelId = await createChannel(`typing1-${id}`);
  await ctx2.client.api.workspaces[":slug"].channels[":id"].join.$post({
    param: { slug: workspaceSlug, id: typingChannelId },
  });

  // Throttle test channel — both users
  throttleChannelId = await createChannel(`throttle-${id}`);
  await ctx2.client.api.workspaces[":slug"].channels[":id"].join.$post({
    param: { slug: workspaceSlug, id: throttleChannelId },
  });

  // Non-member channel — only user1 is a member (user2 never joins)
  nonMemberChannelId = await createChannel(`nomember-${id}`);

  // Join test channel — both users are DB members, for explicit socket room join
  joinTestChannelId = await createChannel(`jointest-${id}`);
  await ctx2.client.api.workspaces[":slug"].channels[":id"].join.$post({
    param: { slug: workspaceSlug, id: joinTestChannelId },
  });

  // Private channel — only user1 is a member
  privateChannelId = await createChannel(`private-${id}`, { type: "private" });

  user1Token = await signTestJwt({
    id: user1Id,
    displayName: "Socket User 1",
    email: `sock1-${id}@openslaq.dev`,
    emailVerified: true,
  });
  user2Token = await signTestJwt({
    id: user2Id,
    displayName: "Socket User 2",
    email: `sock2-${id}@openslaq.dev`,
    emailVerified: true,
  });
});

afterEach(async () => {
  for (const s of activeSockets) {
    if (s.connected) s.disconnect();
  }
  activeSockets = [];
  // Wait for server-side disconnect handlers (which do async DB ops) to complete
  await sleep(500);
});

afterAll(async () => {
  io?.close();
  httpServer?.close();
});

function track(socket: ClientSocket): ClientSocket {
  activeSockets.push(socket);
  return socket;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("socket.io integration", () => {
  // ---- Auth Middleware ----
  describe("auth middleware", () => {
    test("rejects connection with no token", async () => {
      const socket = ioClient(`http://127.0.0.1:${serverPort}`, {
        transports: ["websocket"],
        forceNew: true,
      });
      activeSockets.push(socket);

      const err = await new Promise<Error>((resolve) => {
        socket.on("connect_error", (e) => resolve(e));
      });
      expect(err.message).toContain("Authentication required");
    });

    test("rejects connection with invalid token", async () => {
      const socket = ioClient(`http://127.0.0.1:${serverPort}`, {
        auth: { token: "not-a-valid-jwt" },
        transports: ["websocket"],
        forceNew: true,
      });
      activeSockets.push(socket);

      const err = await new Promise<Error>((resolve) => {
        socket.on("connect_error", (e) => resolve(e));
      });
      expect(err.message).toContain("Invalid token");
    });

    test("accepts connection with valid HMAC token", async () => {
      const socket = track(await connectSocket(user1Token));
      expect(socket.connected).toBe(true);
    });
  });

  // ---- Connection Handler ----
  describe("connection handler", () => {
    beforeEach(async () => {
      await cleanupPresence(user1Id);
      await cleanupPresence(user2Id);
      await resetHuddles();
    });

    test("emits presence:sync to connecting client", async () => {
      const socket = track(await connectSocket(user1Token));

      const data = await waitForEvent<{ users: Array<{ userId: string; status: string }> }>(
        socket,
        "presence:sync",
      );
      expect(data.users).toBeInstanceOf(Array);
      expect(data.users.length).toBeGreaterThanOrEqual(1);

      const self = data.users.find((u) => u.userId === user1Id);
      expect(self).toBeDefined();
      expect(self!.status).toBe("online");
    });

    test("emits presence:updated online to workspace on first connect", async () => {
      const observer = track(await connectAndSettle(user2Token));
      await sleep(20);

      const presencePromise = waitForFilteredEvent<{
        userId: string;
        status: string;
        lastSeenAt: string | null;
      }>(observer, "presence:updated", (d) => d.userId === user1Id);

      track(await connectSocket(user1Token));
      const event = await presencePromise;
      expect(event.userId).toBe(user1Id);
      expect(event.status).toBe("online");
      expect(event.lastSeenAt).toBeNull();
    });

    test("does NOT emit presence:updated on second connect (same user)", async () => {
      track(await connectAndSettle(user1Token));
      const observer = track(await connectAndSettle(user2Token));
      await sleep(20);

      track(await connectAndSettle(user1Token));

      let gotUser1Presence = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (observer as any).on("presence:updated", (data: { userId: string }) => {
        if (data.userId === user1Id) gotUser1Presence = true;
      });
      await sleep(150);
      expect(gotUser1Presence).toBe(false);
    });

    test("auto-joins channel rooms on connect (verified via typing delivery)", async () => {
      const s1 = track(await connectAndSettle(user1Token));
      const s2 = track(await connectAndSettle(user2Token));

      const typingPromise = waitForEvent<{ userId: string; channelId: string }>(
        s2,
        "user:typing",
      );

      s1.emit("message:typing", { channelId: channelId as ChannelId });

      const data = await typingPromise;
      expect(data.userId).toBe(user1Id);
      expect(data.channelId).toBe(channelId);
    });

    test("emits huddle:sync when active huddles exist", async () => {
      await startHuddle(channelId, user2Id);

      const socket = track(await connectSocket(user1Token));
      const data = await waitForEvent<{ huddles: Array<{ channelId: string }> }>(
        socket,
        "huddle:sync",
      );
      expect(data.huddles).toBeInstanceOf(Array);
      expect(data.huddles.length).toBeGreaterThanOrEqual(1);
      expect(data.huddles.some((h) => h.channelId === channelId)).toBe(true);
    });

    test("does not emit huddle:sync when no huddles", async () => {
      resetHuddles();

      const socket = track(await connectSocket(user1Token));

      let gotSync = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).on("huddle:sync", () => {
        gotSync = true;
      });

      await waitForEvent(socket, "presence:sync");
      await sleep(50);
      expect(gotSync).toBe(false);
    });
  });

  // ---- channel:join / channel:leave ----
  describe("channel:join / channel:leave", () => {
    test("channel:join adds socket to room (receives typing events)", async () => {
      const s1 = track(await connectAndSettle(user1Token));
      const s2 = track(await connectAndSettle(user2Token));

      // User2 explicitly joins the joinTest channel room (already a DB member)
      s2.emit("channel:join", { channelId: joinTestChannelId as ChannelId });
      await sleep(50);

      const typingPromise = waitForEvent<{ userId: string; channelId: string }>(
        s2,
        "user:typing",
      );
      s1.emit("message:typing", { channelId: joinTestChannelId as ChannelId });

      const data = await typingPromise;
      expect(data.channelId).toBe(joinTestChannelId);
    });

    test("channel:join does nothing for non-member", async () => {
      const s2 = track(await connectAndSettle(user2Token));

      // Try to join private channel — should silently fail (user2 is not a member)
      s2.emit("channel:join", { channelId: privateChannelId as ChannelId });
      await sleep(50);

      const s1 = track(await connectAndSettle(user1Token));

      // user1 types in the private channel; user2 should NOT receive it
      s1.emit("message:typing", { channelId: privateChannelId as ChannelId });
      await expectNoEvent(s2, "user:typing", 150);
    });

    test("channel:leave removes socket from room", async () => {
      const s1 = track(await connectAndSettle(user1Token));
      const s2 = track(await connectAndSettle(user2Token));

      s2.emit("channel:leave", { channelId: channelId as ChannelId });
      await sleep(50);

      s1.emit("message:typing", { channelId: channelId as ChannelId });
      await expectNoEvent(s2, "user:typing", 150);
    });
  });

  // ---- message:typing ----
  describe("message:typing", () => {
    test("emits user:typing to other members in channel", async () => {
      const s1 = track(await connectAndSettle(user1Token));
      const s2 = track(await connectAndSettle(user2Token));

      const typingPromise = waitForEvent<{ userId: string; channelId: string }>(
        s2,
        "user:typing",
      );

      s1.emit("message:typing", { channelId: typingChannelId as ChannelId });

      const data = await typingPromise;
      expect(data.userId).toBe(user1Id);
      expect(data.channelId).toBe(typingChannelId);
    });

    test("throttled — second emit within 3s is dropped", async () => {
      const s1 = track(await connectAndSettle(user1Token));
      const s2 = track(await connectAndSettle(user2Token));

      // First typing event should go through
      const firstTyping = waitForEvent<{ userId: string }>(s2, "user:typing");
      s1.emit("message:typing", { channelId: throttleChannelId as ChannelId });
      await firstTyping;

      // Second typing event should be throttled (within 3s)
      s1.emit("message:typing", { channelId: throttleChannelId as ChannelId });
      await expectNoEvent(s2, "user:typing", 150);
    });

    test("does nothing for non-member channel", async () => {
      const s2 = track(await connectAndSettle(user2Token));
      const s1 = track(await connectAndSettle(user1Token));

      // user2 tries to type in a channel they're not a member of
      s2.emit("message:typing", { channelId: nonMemberChannelId as ChannelId });
      // user1 (who IS a member) should NOT receive typing
      await expectNoEvent(s1, "user:typing", 150);
    });
  });

  // ---- Disconnect ----
  describe("disconnect", () => {
    beforeEach(async () => {
      await cleanupPresence(user1Id);
      await cleanupPresence(user2Id);
      await resetHuddles();
    });

    test("emits presence:updated offline when last socket disconnects", async () => {
      const observer = track(await connectAndSettle(user2Token));
      const s1 = track(await connectAndSettle(user1Token));

      const presencePromise = waitForFilteredEvent<{
        userId: string;
        status: string;
        lastSeenAt: string | null;
      }>(observer, "presence:updated", (d) => d.userId === user1Id && d.status === "offline");

      activeSockets = activeSockets.filter((s) => s !== s1);
      s1.disconnect();

      const event = await presencePromise;
      expect(event.userId).toBe(user1Id);
      expect(event.status).toBe("offline");
      expect(event.lastSeenAt).toBeTruthy();
    });

    test("does NOT emit offline when other sockets remain", async () => {
      const observer = track(await connectAndSettle(user2Token));
      const s1a = track(await connectAndSettle(user1Token));
      track(await connectAndSettle(user1Token));

      activeSockets = activeSockets.filter((s) => s !== s1a);
      s1a.disconnect();

      let gotUser1Offline = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (observer as any).on("presence:updated", (data: { userId: string; status: string }) => {
        if (data.userId === user1Id && data.status === "offline") gotUser1Offline = true;
      });
      await sleep(150);
      expect(gotUser1Offline).toBe(false);
    });

    test("huddle ended (last participant): emits huddle:ended", async () => {
      await startHuddle(channelId, user1Id);

      const observer = track(await connectAndSettle(user2Token));
      const s1 = track(await connectAndSettle(user1Token));

      const huddleEndedPromise = waitForEvent<{ channelId: string }>(
        observer,
        "huddle:ended",
      );

      activeSockets = activeSockets.filter((s) => s !== s1);
      s1.disconnect();

      const event = await huddleEndedPromise;
      expect(event.channelId).toBe(channelId);
    });

    test("huddle ended with messageId: emits message:updated", async () => {
      const huddle = await startHuddle(channelId, user1Id);

      const sysMsg = await createHuddleMessage(
        asChannelId(channelId),
        asUserId(user1Id),
        { huddleStartedAt: huddle.startedAt },
      );
      await setHuddleMessageId(channelId, sysMsg.id);

      const observer = track(await connectAndSettle(user2Token));
      const s1 = track(await connectAndSettle(user1Token));

      const msgUpdatedPromise = waitForEvent<{ id: string; metadata: unknown }>(
        observer,
        "message:updated",
      );

      activeSockets = activeSockets.filter((s) => s !== s1);
      s1.disconnect();

      const msg = await msgUpdatedPromise;
      expect(msg.id).toBe(sysMsg.id);
    });

    test("huddle ended with no messageId: emits huddle:ended without message:updated", async () => {
      await startHuddle(channelId, user1Id);

      const observer = track(await connectAndSettle(user2Token));
      const s1 = track(await connectAndSettle(user1Token));

      const huddleEndedPromise = waitForEvent<{ channelId: string }>(
        observer,
        "huddle:ended",
      );

      let gotMessageUpdated = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (observer as any).on("message:updated", () => {
        gotMessageUpdated = true;
      });

      activeSockets = activeSockets.filter((s) => s !== s1);
      s1.disconnect();

      await huddleEndedPromise;
      await sleep(100);
      expect(gotMessageUpdated).toBe(false);
    });

    test("huddle continues (others remain): emits huddle:updated", async () => {
      await startHuddle(channelId, user1Id);
      await startHuddle(channelId, user2Id); // joins existing

      const observer = track(await connectAndSettle(user2Token));
      const s1 = track(await connectAndSettle(user1Token));

      const huddleUpdatedPromise = waitForEvent<{
        channelId: string;
        participants: Array<{ userId: string }>;
      }>(observer, "huddle:updated");

      activeSockets = activeSockets.filter((s) => s !== s1);
      s1.disconnect();

      const event = await huddleUpdatedPromise;
      expect(event.channelId).toBe(channelId);
      expect(event.participants.some((p) => p.userId === user2Id)).toBe(true);
      expect(event.participants.some((p) => p.userId === user1Id)).toBe(false);
    });

    test("persistLastSeen is called on disconnect (verifiable via DB)", async () => {
      await cleanupPresence(user1Id);
      const s1 = track(await connectAndSettle(user1Token));

      activeSockets = activeSockets.filter((s) => s !== s1);
      s1.disconnect();
      await sleep(200); // Give time for persistLastSeen DB write

      // Check via in-process presence service that lastSeenAt is now set
      const presence = await getWorkspacePresence(workspaceId);
      const entry = presence.find((e) => e.userId === user1Id);
      expect(entry?.lastSeenAt).toBeTruthy();
    });
  });
});
