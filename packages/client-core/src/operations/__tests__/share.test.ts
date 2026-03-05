import { describe, expect, it } from "bun:test";
import { initialState, type ChatAction } from "../../chat-reducer";
import type { OperationDeps } from "../types";
import { shareMessage } from "../share";

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function makeDeps(resolvers: {
  sharePost?: () => Promise<Response>;
}) {
  const actions: ChatAction[] = [];

  const deps: OperationDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            channels: {
              ":id": {
                messages: {
                  share: {
                    $post: () => (resolvers.sharePost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))(),
                  },
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
    getState: () => initialState,
  };

  return { deps, actions };
}

const rawMessage = {
  id: "msg-new",
  channelId: "ch-dest",
  userId: "u-1",
  content: "check this out",
  parentMessageId: null,
  replyCount: 0,
  latestReplyAt: null,
  sharedMessage: {
    id: "msg-shared",
    channelId: "ch-source",
    channelName: "general",
    channelType: "public" as const,
    userId: "u-2",
    senderDisplayName: "Alice",
    senderAvatarUrl: null,
    content: "original message",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("operations/share", () => {
  it("dispatches messages/upsert with normalized message on success", async () => {
    const { deps, actions } = makeDeps({
      sharePost: () => Promise.resolve(jsonResponse(rawMessage)),
    });

    const result = await shareMessage(deps, {
      workspaceSlug: "ws",
      destinationChannelId: "ch-dest",
      sharedMessageId: "msg-shared",
      comment: "check this out",
    });

    expect(String(result.id)).toBe("msg-new");
    expect(String(result.sharedMessage?.id)).toBe("msg-shared");
    expect(result.sharedMessage?.channelName).toBe("general");
    expect(actions).toHaveLength(1);
    expect(actions[0]!.type).toBe("messages/upsert");
  });

  it("throws on API failure", async () => {
    const { deps } = makeDeps({
      sharePost: () => Promise.resolve(new Response(null, { status: 500 })),
    });

    await expect(
      shareMessage(deps, {
        workspaceSlug: "ws",
        destinationChannelId: "ch-dest",
        sharedMessageId: "msg-shared",
        comment: "check this out",
      }),
    ).rejects.toThrow();
  });
});
