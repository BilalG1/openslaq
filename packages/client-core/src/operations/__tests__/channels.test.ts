import { describe, expect, it } from "bun:test";
import { asChannelId, asWorkspaceId, asUserId, type Channel } from "@openslaq/shared";
import { AuthError } from "../../api/errors";
import { initialState, type ChatAction, type ChatStoreState } from "../../chat-reducer";
import {
  createChannel,
  joinChannel,
  leaveChannel,
  archiveChannel,
  unarchiveChannel,
  browseChannels,
} from "../channels";
import type { OperationDeps, ApiDeps } from "../types";

const rawChannel = {
  id: "ch-1",
  workspaceId: "ws-1",
  name: "general",
  type: "public" as const,
  description: null,
  createdBy: "u-1",
  createdAt: "2026-01-01T00:00:00Z",
};

function jsonResponse(statusOrData: number | unknown, body?: unknown) {
  const status = typeof statusOrData === "number" ? statusOrData : 200;
  const data = typeof statusOrData === "number" ? body : statusOrData;
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: asChannelId("ch-1"),
    workspaceId: asWorkspaceId("ws-1"),
    name: "general",
    type: "public" as const,
    description: null,
    displayName: null,
    isArchived: false,
    createdBy: asUserId("u-1"),
    createdAt: "2026-01-01T00:00:00Z",
    memberCount: 5,
    ...overrides,
  };
}

function makeDeps(resolvers: {
  channelsPost?: () => Promise<Response>;
  channelsGet?: () => Promise<Response>;
  joinPost?: () => Promise<Response>;
  leavePost?: () => Promise<Response>;
  archivePost?: () => Promise<Response>;
  unarchivePost?: () => Promise<Response>;
  browseGet?: () => Promise<Response>;
  authToken?: string;
}, stateOverride?: import("../../chat-reducer").ChatStoreState) {
  const actions: ChatAction[] = [];
  let authRequiredCount = 0;
  const socketEmits: Array<{ event: string; data: unknown }> = [];

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            channels: {
              $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.channelsPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
              $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.channelsGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
              browse: {
                $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                  expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                  return (resolvers.browseGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                },
              },
              ":id": {
                join: {
                  $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                    expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                    return (resolvers.joinPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                  },
                },
                leave: {
                  $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                    expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                    return (resolvers.leavePost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                  },
                },
                archive: {
                  $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                    expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                    return (resolvers.archivePost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                  },
                },
                unarchive: {
                  $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                    expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                    return (resolvers.unarchivePost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                  },
                },
              },
            },
          },
        },
      },
    } as never,
    auth: {
      getAccessToken: async () => resolvers.authToken ?? "token",
      requireAccessToken: async () => resolvers.authToken ?? "token",
      onAuthRequired: () => {
        authRequiredCount += 1;
      },
    },
    dispatch: (action) => {
      actions.push(action);
    },
    getState: () => stateOverride ?? initialState,
  };

  const socket = {
    emit: (event: string, data: unknown) => {
      socketEmits.push({ event, data });
    },
  };

  return { deps, actions, socketEmits, socket, getAuthRequiredCount: () => authRequiredCount };
}

function makeApiDeps(resolvers: {
  browseGet?: () => Promise<Response>;
  authToken?: string;
}) {
  let authRequiredCount = 0;

  const deps: ApiDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            channels: {
              browse: {
                $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                  expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                  return (resolvers.browseGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                },
              },
            },
          },
        },
      },
    } as never,
    auth: {
      getAccessToken: async () => resolvers.authToken ?? "token",
      requireAccessToken: async () => resolvers.authToken ?? "token",
      onAuthRequired: () => {
        authRequiredCount += 1;
      },
    },
  };

  return { deps, getAuthRequiredCount: () => authRequiredCount };
}

describe("operations/channels", () => {
  describe("createChannel", () => {
    it("dispatches workspace/addChannel with normalized channel", async () => {
      const { deps, actions } = makeDeps({
        channelsPost: () => jsonResponse(rawChannel),
      });

      const result = await createChannel(deps, { workspaceSlug: "ws", name: "general" });

      expect(result.id as string).toBe("ch-1");
      expect(result.name).toBe("general");
      expect(actions).toEqual([{ type: "workspace/addChannel", channel: expect.objectContaining({ id: "ch-1", name: "general" }) }]);
    });

    it("throws AuthError on 401", async () => {
      const { deps, getAuthRequiredCount } = makeDeps({
        channelsPost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(createChannel(deps, { workspaceSlug: "ws", name: "general" })).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1); // authorizedRequest calls onAuthRequired on 401
    });
  });

  describe("leaveChannel", () => {
    it("dispatches workspace/removeChannel optimistically before API call", async () => {
      const channel = makeChannel();
      const state: ChatStoreState = { ...initialState, channels: [channel] };
      const { deps, actions, socket, socketEmits } = makeDeps(
        { leavePost: () => jsonResponse({}) },
        state,
      );

      await leaveChannel(deps, { workspaceSlug: "ws", channelId: asChannelId("ch-1"), socket: socket as never });

      expect(actions).toEqual([{ type: "workspace/removeChannel", channelId: "ch-1" }]);
      expect(socketEmits).toEqual([{ event: "channel:leave", data: { channelId: "ch-1" } }]);
    });

    it("restores channel on non-auth failure", async () => {
      const channel = makeChannel();
      const state: ChatStoreState = { ...initialState, channels: [channel] };
      const { deps, actions, socket, socketEmits } = makeDeps(
        { leavePost: () => jsonResponse(500, { error: "Leave failed" }) },
        state,
      );

      await leaveChannel(deps, { workspaceSlug: "ws", channelId: asChannelId("ch-1"), socket: socket as never });

      expect(actions).toEqual([
        { type: "workspace/removeChannel", channelId: "ch-1" },
        { type: "workspace/addChannel", channel },
        { type: "mutations/error", error: "Leave failed" },
      ]);
      // Socket emits: first leave (optimistic), then join (rollback)
      expect(socketEmits).toEqual([
        { event: "channel:leave", data: { channelId: "ch-1" } },
        { event: "channel:join", data: { channelId: "ch-1" } },
      ]);
    });

    it("calls onAuthRequired on 401", async () => {
      const { deps, socket, getAuthRequiredCount } = makeDeps({
        leavePost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await leaveChannel(deps, { workspaceSlug: "ws", channelId: asChannelId("ch-1"), socket: socket as never });

      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("joinChannel", () => {
    it("dispatches optimistically when channel is provided", async () => {
      const channel = makeChannel();
      const { deps, actions, socket, socketEmits } = makeDeps({
        joinPost: () => jsonResponse({}),
      });

      await joinChannel(deps, {
        workspaceSlug: "ws",
        channelId: asChannelId("ch-1"),
        socket: socket as never,
        channel,
      });

      expect(actions).toEqual([
        { type: "workspace/addChannel", channel },
        { type: "channel/memberCountDelta", channelId: "ch-1", delta: 1 },
      ]);
      expect(socketEmits).toEqual([{ event: "channel:join", data: { channelId: "ch-1" } }]);
    });

    it("rolls back on failure when channel is provided", async () => {
      const channel = makeChannel();
      const { deps, actions, socket, socketEmits } = makeDeps({
        joinPost: () => jsonResponse(500, { error: "Join failed" }),
      });

      await joinChannel(deps, {
        workspaceSlug: "ws",
        channelId: asChannelId("ch-1"),
        socket: socket as never,
        channel,
      });

      expect(actions).toEqual([
        // optimistic
        { type: "workspace/addChannel", channel },
        { type: "channel/memberCountDelta", channelId: "ch-1", delta: 1 },
        // rollback
        { type: "workspace/removeChannel", channelId: "ch-1" },
        { type: "channel/memberCountDelta", channelId: "ch-1", delta: -1 },
        { type: "mutations/error", error: "Join failed" },
      ]);
      expect(socketEmits).toEqual([
        { event: "channel:join", data: { channelId: "ch-1" } },
        { event: "channel:leave", data: { channelId: "ch-1" } },
      ]);
    });

    it("falls back to re-fetch when channel is not provided", async () => {
      const { deps, actions, socket, socketEmits } = makeDeps({
        joinPost: () => jsonResponse({}),
        channelsGet: () => jsonResponse([{ ...rawChannel, displayName: null, isArchived: false }]),
      });

      await joinChannel(deps, {
        workspaceSlug: "ws",
        channelId: asChannelId("ch-1"),
        socket: socket as never,
      });

      expect(actions).toEqual([
        { type: "workspace/addChannel", channel: expect.objectContaining({ id: "ch-1" }) },
      ]);
      expect(socketEmits).toEqual([{ event: "channel:join", data: { channelId: "ch-1" } }]);
    });

    it("calls onAuthRequired on 401", async () => {
      const channel = makeChannel();
      const { deps, socket, getAuthRequiredCount } = makeDeps({
        joinPost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await joinChannel(deps, {
        workspaceSlug: "ws",
        channelId: asChannelId("ch-1"),
        socket: socket as never,
        channel,
      });

      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("archiveChannel", () => {
    it("dispatches workspace/updateChannel with normalized channel", async () => {
      const { deps, actions } = makeDeps({
        archivePost: () => jsonResponse({ ...rawChannel, isArchived: true }),
      });

      await archiveChannel(deps, { workspaceSlug: "ws", channelId: asChannelId("ch-1") });

      expect(actions).toEqual([
        { type: "workspace/updateChannel", channel: expect.objectContaining({ id: "ch-1", isArchived: true }) },
      ]);
    });

    it("throws AuthError on 401", async () => {
      const { deps } = makeDeps({
        archivePost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(archiveChannel(deps, { workspaceSlug: "ws", channelId: asChannelId("ch-1") })).rejects.toThrow(AuthError);
    });
  });

  describe("unarchiveChannel", () => {
    it("dispatches workspace/updateChannel with normalized channel", async () => {
      const { deps, actions } = makeDeps({
        unarchivePost: () => jsonResponse({ ...rawChannel, isArchived: false }),
      });

      await unarchiveChannel(deps, { workspaceSlug: "ws", channelId: asChannelId("ch-1") });

      expect(actions).toEqual([
        { type: "workspace/updateChannel", channel: expect.objectContaining({ id: "ch-1", isArchived: false }) },
      ]);
    });

    it("throws AuthError on 401", async () => {
      const { deps } = makeDeps({
        unarchivePost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(unarchiveChannel(deps, { workspaceSlug: "ws", channelId: asChannelId("ch-1") })).rejects.toThrow(AuthError);
    });
  });

  describe("browseChannels", () => {
    it("returns normalized channels with isMember flag", async () => {
      const { deps } = makeApiDeps({
        browseGet: () => jsonResponse([{ ...rawChannel, isMember: true }]),
      });

      const result = await browseChannels(deps, "ws");

      expect(result).toHaveLength(1);
      expect(result[0]!.id as string).toBe("ch-1");
      expect(result[0]!.isMember).toBe(true);
    });

    it("throws AuthError on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        browseGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(browseChannels(deps, "ws")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1); // authorizedRequest calls onAuthRequired on 401
    });
  });
});
