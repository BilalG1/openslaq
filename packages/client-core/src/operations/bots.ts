import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";
import type { BotApp, BotEventType, BotScope } from "@openslaq/shared";

function toBotScopeArray(scopes: string[]): BotScope[] {
  return scopes.filter((scope): scope is BotScope =>
    [
      "chat:write",
      "chat:read",
      "channels:read",
      "channels:write",
      "reactions:write",
      "reactions:read",
      "users:read",
      "presence:read",
      "channels:members:read",
      "channels:members:write",
    ].includes(scope),
  );
}

function toBotEventTypeArray(events: string[] | undefined): BotEventType[] | undefined {
  if (!events) return undefined;
  return events.filter((event): event is BotEventType =>
    [
      "message:new",
      "message:updated",
      "message:deleted",
      "reaction:updated",
      "channel:updated",
      "channel:member-added",
      "channel:member-removed",
      "message:pinned",
      "message:unpinned",
      "presence:updated",
      "interaction",
    ].includes(event),
  );
}

export async function listBots(deps: ApiDeps, slug: string): Promise<BotApp[]> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].bots.$get({ param: { slug } }, { headers }),
  );
  return (await response.json()) as BotApp[];
}

export async function createBot(
  deps: ApiDeps,
  slug: string,
  data: {
    name: string;
    description?: string;
    avatarUrl?: string;
    webhookUrl: string;
    scopes: string[];
    subscribedEvents?: string[];
  },
): Promise<{ bot: BotApp; apiToken: string }> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].bots.$post(
      {
        param: { slug },
        json: {
          ...data,
          scopes: toBotScopeArray(data.scopes),
          subscribedEvents: toBotEventTypeArray(data.subscribedEvents),
        },
      },
      { headers },
    ),
  );
  return (await response.json()) as { bot: BotApp; apiToken: string };
}

export async function updateBot(
  deps: ApiDeps,
  slug: string,
  botId: string,
  data: {
    name?: string;
    description?: string | null;
    avatarUrl?: string | null;
    webhookUrl?: string;
    scopes?: string[];
    subscribedEvents?: string[];
  },
): Promise<BotApp> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].bots[":botId"].$put(
      {
        param: { slug, botId },
        json: {
          ...data,
          scopes: data.scopes ? toBotScopeArray(data.scopes) : undefined,
          subscribedEvents: toBotEventTypeArray(data.subscribedEvents),
        },
      },
      { headers },
    ),
  );
  return (await response.json()) as BotApp;
}

export async function deleteBot(deps: ApiDeps, slug: string, botId: string): Promise<void> {
  const { api, auth } = deps;
  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].bots[":botId"].$delete(
      { param: { slug, botId } },
      { headers },
    ),
  );
}

export async function regenerateBotToken(
  deps: ApiDeps,
  slug: string,
  botId: string,
): Promise<{ apiToken: string; apiTokenPrefix: string }> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].bots[":botId"]["regenerate-token"].$post(
      { param: { slug, botId } },
      { headers },
    ),
  );
  return (await response.json()) as { apiToken: string; apiTokenPrefix: string };
}

export async function toggleBot(
  deps: ApiDeps,
  slug: string,
  botId: string,
  enabled: boolean,
): Promise<void> {
  const { api, auth } = deps;
  await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].bots[":botId"].toggle.$post(
      { param: { slug, botId }, json: { enabled } },
      { headers },
    ),
  );
}
