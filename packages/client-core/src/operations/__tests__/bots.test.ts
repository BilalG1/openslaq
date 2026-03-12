import { describe, expect, it } from "bun:test";
import { asBotAppId, asWorkspaceId, asUserId } from "@openslaq/shared";
import { AuthError } from "../../api/errors";
import { listBots, createBot, deleteBot, regenerateBotToken, toggleBot } from "../bots";
import type { ApiDeps } from "../types";

function jsonResponse(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

function makeApiDeps(resolvers: {
  botsGet?: () => Promise<Response>;
  botsPost?: () => Promise<Response>;
  botDelete?: () => Promise<Response>;
  regeneratePost?: () => Promise<Response>;
  togglePost?: () => Promise<Response>;
  authToken?: string;
}) {
  let authRequiredCount = 0;

  const deps: ApiDeps = {
    api: {
      api: {
        workspaces: {
          ":slug": {
            bots: {
              $get: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.botsGet ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
              $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                return (resolvers.botsPost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
              },
              ":botId": {
                $delete: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                  expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                  return (resolvers.botDelete ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                },
                "regenerate-token": {
                  $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                    expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                    return (resolvers.regeneratePost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
                  },
                },
                toggle: {
                  $post: (_args: unknown, { headers }: { headers: { Authorization: string } }) => {
                    expect(headers.Authorization).toBe(`Bearer ${resolvers.authToken ?? "token"}`);
                    return (resolvers.togglePost ?? (() => Promise.resolve(new Response(null, { status: 500 }))))();
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
  };

  return { deps, getAuthRequiredCount: () => authRequiredCount };
}

const sampleBot = {
  id: asBotAppId("bot-1"),
  workspaceId: asWorkspaceId("ws-1"),
  userId: asUserId("u-bot-1"),
  name: "TestBot",
  description: "A test bot" as string | null,
  avatarUrl: null as string | null,
  webhookUrl: "https://example.com/webhook",
  scopes: ["chat:read", "chat:write"] as import("@openslaq/shared").BotScope[],
  subscribedEvents: ["message:new"] as import("@openslaq/shared").BotEventType[],
  enabled: true,
  apiTokenPrefix: "osl_",
  marketplaceListingId: null as string | null,
  createdBy: asUserId("u-1"),
  createdAt: "2026-01-01T00:00:00Z",
};

describe("operations/bots", () => {
  describe("listBots", () => {
    it("returns bot list on success", async () => {
      const { deps } = makeApiDeps({
        botsGet: () => jsonResponse([sampleBot]),
      });

      const result = await listBots(deps, "ws");

      expect(result).toEqual([sampleBot]);
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        botsGet: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(listBots(deps, "ws")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("createBot", () => {
    it("returns bot and apiToken on success", async () => {
      const { deps } = makeApiDeps({
        botsPost: () => jsonResponse({ bot: sampleBot, apiToken: "osl_secret123" }),
      });

      const result = await createBot(deps, "ws", {
        name: "TestBot",
        webhookUrl: "https://example.com/webhook",
        scopes: ["chat:read", "chat:write"],
        subscribedEvents: ["message:new"],
      });

      expect(result.bot.name).toBe("TestBot");
      expect(result.apiToken).toBe("osl_secret123");
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        botsPost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(
        createBot(deps, "ws", { name: "Bot", webhookUrl: "https://x.com", scopes: ["chat:read"] }),
      ).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("deleteBot", () => {
    it("completes without error on success", async () => {
      const { deps } = makeApiDeps({
        botDelete: () => jsonResponse({ ok: true }),
      });

      await expect(deleteBot(deps, "ws", "bot-1")).resolves.toBeUndefined();
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        botDelete: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(deleteBot(deps, "ws", "bot-1")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("regenerateBotToken", () => {
    it("returns new token on success", async () => {
      const { deps } = makeApiDeps({
        regeneratePost: () => jsonResponse({ apiToken: "osl_new456", apiTokenPrefix: "osl_new" }),
      });

      const result = await regenerateBotToken(deps, "ws", "bot-1");

      expect(result.apiToken).toBe("osl_new456");
      expect(result.apiTokenPrefix).toBe("osl_new");
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        regeneratePost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(regenerateBotToken(deps, "ws", "bot-1")).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });

  describe("toggleBot", () => {
    it("completes without error on success", async () => {
      const { deps } = makeApiDeps({
        togglePost: () => jsonResponse({ ok: true }),
      });

      await expect(toggleBot(deps, "ws", "bot-1", false)).resolves.toBeUndefined();
    });

    it("calls onAuthRequired and rethrows on 401", async () => {
      const { deps, getAuthRequiredCount } = makeApiDeps({
        togglePost: () => Promise.resolve(new Response(null, { status: 401 })),
      });

      await expect(toggleBot(deps, "ws", "bot-1", true)).rejects.toThrow(AuthError);
      expect(getAuthRequiredCount()).toBe(1);
    });
  });
});
