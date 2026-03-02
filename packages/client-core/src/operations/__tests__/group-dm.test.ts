import { describe, expect, it } from "bun:test";
import { initialState, type ChatAction } from "../../chat-reducer";
import { createGroupDm } from "../group-dm";
import type { OperationDeps } from "../types";

const rawChannel = {
  id: "ch-gdm-1",
  workspaceId: "ws-1",
  name: "group-dm",
  type: "group_dm" as const,
  description: null,
  createdBy: "u-1",
  createdAt: "2026-01-01T00:00:00Z",
};

const rawMembers = [
  { id: "u-1", displayName: "Alice", avatarUrl: null },
  { id: "u-2", displayName: "Bob", avatarUrl: null },
];

function jsonResponse(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeDeps(resolvers: {
  groupDmPost?: () => Promise<Response>;
  authToken?: string;
}) {
  const actions: ChatAction[] = [];
  let authRequiredCount = 0;

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            "group-dm": {
              $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.groupDmPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
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

  return { deps, actions, getAuthRequiredCount: () => authRequiredCount };
}

describe("operations/group-dm", () => {
  describe("createGroupDm", () => {
    it("dispatches mutations/error clear, addGroupDm, and selectGroupDm on success", async () => {
      const { deps, actions } = makeDeps({
        groupDmPost: () => jsonResponse({ channel: rawChannel, members: rawMembers }),
      });

      const result = await createGroupDm(deps, { workspaceSlug: "ws", memberIds: ["u-1", "u-2"] });

      expect(result).not.toBeNull();
      expect(result!.channel.id as string).toBe("ch-gdm-1");
      expect(actions).toHaveLength(3);
      expect(actions[0]).toEqual({ type: "mutations/error", error: null });
      expect(actions[1]).toEqual({ type: "workspace/addGroupDm", groupDm: expect.objectContaining({ channel: expect.objectContaining({ id: "ch-gdm-1" }) }) });
      expect(actions[2]).toEqual({ type: "workspace/selectGroupDm", channelId: expect.any(String) });
    });

    it("returns null and calls onAuthRequired for AuthError", async () => {
      const { deps, actions, getAuthRequiredCount } = makeDeps({
        groupDmPost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      const result = await createGroupDm(deps, { workspaceSlug: "ws", memberIds: ["u-1"] });

      expect(result).toBeNull();
      expect(getAuthRequiredCount()).toBe(1);
      // Only the initial mutations/error clear should be dispatched
      expect(actions).toEqual([{ type: "mutations/error", error: null }]);
    });

    it("dispatches mutations/error for non-auth errors", async () => {
      const { deps, actions } = makeDeps({
        groupDmPost: () => Promise.resolve(new Response(JSON.stringify({ error: "Bad request" }), { status: 400 })),
      });

      const result = await createGroupDm(deps, { workspaceSlug: "ws", memberIds: [] });

      expect(result).toBeNull();
      expect(actions[0]).toEqual({ type: "mutations/error", error: null });
      expect(actions[1]).toEqual({ type: "mutations/error", error: expect.any(String) });
    });
  });
});
