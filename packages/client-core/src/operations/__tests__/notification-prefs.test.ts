import { describe, expect, it } from "bun:test";
import { initialState, type ChatAction } from "../../chat-reducer";
import type { ChannelNotifyLevel } from "@openslaq/shared";
import type { OperationDeps } from "../types";
import { fetchChannelNotificationPrefs, setChannelNotificationPref } from "../notification-prefs";

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function makeDeps(resolvers: {
  prefsGet?: () => Promise<Response>;
  prefPut?: () => Promise<Response>;
  channelNotificationPrefs?: Record<string, ChannelNotifyLevel>;
}) {
  const actions: ChatAction[] = [];

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            channels: {
              "notification-prefs": {
                $get: () => (resolvers.prefsGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
              },
              ":id": {
                "notification-pref": {
                  $put: () => (resolvers.prefPut ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
                },
              },
            },
          },
        },
      },
    } as never,
    auth: {
      getAccessToken: async () => "token",
      requireAccessToken: async () => "token",
      onAuthRequired: () => {},
    },
    dispatch: (action) => {
      actions.push(action);
    },
    getState: () => ({
      ...initialState,
      channelNotificationPrefs: resolvers.channelNotificationPrefs ?? {},
    }),
  };

  return { deps, actions };
}

describe("operations/notification-prefs", () => {
  describe("fetchChannelNotificationPrefs", () => {
    it("dispatches notifyPrefs/set with fetched prefs", async () => {
      const prefs: Record<string, ChannelNotifyLevel> = { "ch-1": "mentions", "ch-2": "muted" };
      const { deps, actions } = makeDeps({
        prefsGet: () => Promise.resolve(jsonResponse(prefs)),
      });

      const result = await fetchChannelNotificationPrefs(deps, "ws");

      expect(result).toEqual(prefs);
      expect(actions).toEqual([{ type: "notifyPrefs/set", prefs }]);
    });
  });

  describe("setChannelNotificationPref", () => {
    it("dispatches optimistic update on success", async () => {
      const { deps, actions } = makeDeps({
        prefPut: () => Promise.resolve(jsonResponse({ ok: true })),
      });

      await setChannelNotificationPref(deps, { slug: "ws", channelId: "ch-1", level: "mentions" });

      expect(actions).toEqual([
        { type: "notifyPrefs/update", channelId: "ch-1", level: "mentions" },
      ]);
    });

    it("rolls back to previous level on failure", async () => {
      const { deps, actions } = makeDeps({
        prefPut: () => Promise.resolve(new Response(null, { status: 500 })),
        channelNotificationPrefs: { "ch-1": "mentions" },
      });

      await setChannelNotificationPref(deps, { slug: "ws", channelId: "ch-1", level: "muted" });

      expect(actions).toEqual([
        { type: "notifyPrefs/update", channelId: "ch-1", level: "muted" },
        { type: "notifyPrefs/update", channelId: "ch-1", level: "mentions" },
      ]);
    });

    it("rolls back to 'all' when no previous pref exists", async () => {
      const { deps, actions } = makeDeps({
        prefPut: () => Promise.resolve(new Response(null, { status: 500 })),
      });

      await setChannelNotificationPref(deps, { slug: "ws", channelId: "ch-new", level: "muted" });

      expect(actions).toEqual([
        { type: "notifyPrefs/update", channelId: "ch-new", level: "muted" },
        { type: "notifyPrefs/update", channelId: "ch-new", level: "all" },
      ]);
    });
  });
});
