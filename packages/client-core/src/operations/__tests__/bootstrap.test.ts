import { describe, expect, it } from "bun:test";
import { initialState, type ChatAction, type ChatStoreState } from "../../chat-reducer";
import { bootstrapWorkspace } from "../bootstrap";
import type { OperationDeps } from "../types";

interface BootstrapResolvers {
  channels?: () => Promise<Response>;
  workspaces?: () => Promise<Response>;
  dms?: () => Promise<Response>;
  unread?: () => Promise<Response>;
  presence?: () => Promise<Response>;
  emoji?: () => Promise<Response>;
}

function jsonResponse(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeDeps(resolvers: BootstrapResolvers, state: ChatStoreState = initialState) {
  const actions: ChatAction[] = [];
  let authRequiredCount = 0;

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          $get: () => (resolvers.workspaces ?? (() => jsonResponse(200, [])))(),
          ":slug": {
            channels: {
              $get: () => (resolvers.channels ?? (() => jsonResponse(200, [])))(),
              starred: {
                $get: () => jsonResponse(200, []),
              },
              "notification-prefs": {
                $get: () => jsonResponse(200, {}),
              },
            },
            dm: {
              $get: () => (resolvers.dms ?? (() => jsonResponse(200, [])))(),
            },
            "group-dm": {
              $get: () => jsonResponse(200, []),
            },
            "unread-counts": {
              $get: () => (resolvers.unread ?? (() => jsonResponse(200, {})))(),
            },
            presence: {
              $get: () => (resolvers.presence ?? (() => jsonResponse(200, [])))(),
            },
            emoji: {
              $get: () => (resolvers.emoji ?? (() => jsonResponse(200, { emojis: [] })))(),
            },
          },
        },
      },
    } as never,
    auth: {
      getAccessToken: async () => "token",
      requireAccessToken: async () => "token",
      onAuthRequired: () => {
        authRequiredCount += 1;
      },
    },
    dispatch: (action) => {
      actions.push(action);
    },
    getState: () => state,
  };

  return { deps, actions, getAuthRequiredCount: () => authRequiredCount };
}

const baseChannels = [
  {
    id: "ch-general",
    workspaceId: "ws-1",
    name: "general",
    type: "public",
    description: null,
    createdBy: "u-1",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ch-random",
    workspaceId: "ws-1",
    name: "random",
    type: "public",
    description: null,
    createdBy: "u-1",
    createdAt: "2026-01-01T00:01:00.000Z",
  },
];

const baseWorkspaces = [
  { id: "ws-1", name: "WS", slug: "ws", role: "member", createdAt: "2026-01-01T00:00:00.000Z" },
];

const baseDms = [
  {
    channel: {
      id: "dm-1",
      workspaceId: "ws-1",
      name: "dm-1",
      type: "dm",
      description: null,
      createdBy: "u-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    otherUser: { id: "u-2", displayName: "Bob", avatarUrl: null },
  },
];

describe("operations/bootstrap", () => {
  it("dispatches bootstrap success, unread sync, presence sync and defaults to #general", async () => {
    const { deps, actions } = makeDeps({
      channels: () => jsonResponse(200, baseChannels),
      workspaces: () => jsonResponse(200, baseWorkspaces),
      dms: () => jsonResponse(200, baseDms),
      unread: () => jsonResponse(200, { "ch-random": 2 }),
      presence: () => jsonResponse(200, [{ userId: "u-2", online: false, lastSeenAt: null }]),
    });

    await bootstrapWorkspace(deps, { workspaceSlug: "ws" });

    expect(actions[0]).toEqual({ type: "workspace/bootstrapStart", workspaceSlug: "ws" });
    expect(actions[1]).toEqual(expect.objectContaining({ type: "workspace/bootstrapSuccess" }));
    expect(actions[2]).toEqual({ type: "unread/setCounts", counts: { "ch-random": 2 } });
    expect(actions[3]).toEqual({
      type: "presence/sync",
      users: [{ userId: "u-2", online: false, lastSeenAt: null }],
    });
    // stars/set and notifyPrefs/set come before the default channel selection
    const lastAction = actions[actions.length - 1];
    expect(lastAction).toEqual({ type: "workspace/selectDefaultChannel", channelId: "ch-general" });
  });

  it("selects url DM when provided and present", async () => {
    const { deps, actions } = makeDeps({
      channels: () => jsonResponse(200, baseChannels),
      workspaces: () => jsonResponse(200, baseWorkspaces),
      dms: () => jsonResponse(200, baseDms),
      unread: () => jsonResponse(200, {}),
      presence: () => jsonResponse(200, []),
    });

    await bootstrapWorkspace(deps, { workspaceSlug: "ws", urlDmChannelId: "dm-1" });

    expect(actions.at(-1)).toEqual({ type: "workspace/selectDm", channelId: "dm-1" });
  });

  it("selects url channel when DM param missing", async () => {
    const { deps, actions } = makeDeps({
      channels: () => jsonResponse(200, baseChannels),
      workspaces: () => jsonResponse(200, baseWorkspaces),
      dms: () => jsonResponse(200, baseDms),
      unread: () => jsonResponse(200, {}),
      presence: () => jsonResponse(200, []),
    });

    await bootstrapWorkspace(deps, { workspaceSlug: "ws", urlChannelId: "ch-random" });

    expect(actions.at(-1)).toEqual({ type: "workspace/selectChannel", channelId: "ch-random" });
  });

  it("does not auto-select a channel when one is already active", async () => {
    const existingState: ChatStoreState = {
      ...initialState,
      activeChannelId: "already-selected",
    };
    const { deps, actions } = makeDeps(
      {
        channels: () => jsonResponse(200, baseChannels),
        workspaces: () => jsonResponse(200, baseWorkspaces),
        dms: () => jsonResponse(200, baseDms),
        unread: () => jsonResponse(200, {}),
        presence: () => jsonResponse(200, []),
      },
      existingState,
    );

    await bootstrapWorkspace(deps, { workspaceSlug: "ws" });

    expect(actions.some((a) => a.type === "workspace/selectChannel")).toBe(false);
  });

  it("triggers auth required on 401 and skips error action", async () => {
    const { deps, actions, getAuthRequiredCount } = makeDeps({
      channels: () => Promise.resolve(new Response(null, { status: 401 })),
      workspaces: () => jsonResponse(200, baseWorkspaces),
      dms: () => jsonResponse(200, baseDms),
      unread: () => jsonResponse(200, {}),
      presence: () => jsonResponse(200, []),
    });

    await bootstrapWorkspace(deps, { workspaceSlug: "ws" });

    expect(getAuthRequiredCount()).toBe(1);
    expect(actions).toEqual([{ type: "workspace/bootstrapStart", workspaceSlug: "ws" }]);
  });

  it("dispatches bootstrapError for non-auth failures", async () => {
    const { deps, actions } = makeDeps({
      channels: () => Promise.resolve(new Response(JSON.stringify({ error: "bad" }), { status: 500 })),
      workspaces: () => jsonResponse(200, baseWorkspaces),
      dms: () => jsonResponse(200, baseDms),
      unread: () => jsonResponse(200, {}),
      presence: () => jsonResponse(200, []),
    });

    await bootstrapWorkspace(deps, { workspaceSlug: "ws" });

    expect(actions[1]).toEqual({ type: "workspace/bootstrapError", error: "bad" });
  });
});
