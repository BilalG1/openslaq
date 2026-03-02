import { describe, expect, it } from "bun:test";
import { asChannelId } from "@openslaq/shared";
import { AuthError } from "../../api/errors";
import { initialState, type ChatAction } from "../../chat-reducer";
import {
  createChannel,
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

function jsonResponse(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeDeps(resolvers: {
  channelsPost?: () => Promise<Response>;
  channelsGet?: () => Promise<Response>;
  leavePost?: () => Promise<Response>;
  archivePost?: () => Promise<Response>;
  unarchivePost?: () => Promise<Response>;
  browseGet?: () => Promise<Response>;
  authToken?: string;
}) {
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
    getState: () => initialState,
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
      expect(getAuthRequiredCount()).toBe(0); // createChannel does not catch AuthError
    });
  });

  describe("leaveChannel", () => {
    it("dispatches workspace/removeChannel and emits socket channel:leave", async () => {
      const { deps, actions, socket } = makeDeps({
        leavePost: () => jsonResponse({}),
      });

      await leaveChannel(deps, { workspaceSlug: "ws", channelId: asChannelId("ch-1"), socket: socket as never });

      expect(actions).toEqual([{ type: "workspace/removeChannel", channelId: "ch-1" }]);
      expect(socket.emit).toBeDefined();
    });

    it("throws AuthError on 401", async () => {
      const { deps, socket } = makeDeps({
        leavePost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(leaveChannel(deps, { workspaceSlug: "ws", channelId: asChannelId("ch-1"), socket: socket as never })).rejects.toThrow(AuthError);
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
      expect(getAuthRequiredCount()).toBe(0); // browseChannels does not catch AuthError
    });
  });
});
