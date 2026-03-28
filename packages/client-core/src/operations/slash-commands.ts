import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";
import type { SlashCommandDefinition, SlashCommandExecuteResponse } from "@openslaq/shared";

export async function fetchSlashCommands(
  deps: ApiDeps,
  params: { workspaceSlug: string },
): Promise<SlashCommandDefinition[]> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].commands.$get(
      { param: { slug: params.workspaceSlug } },
      { headers },
    ),
  );
  return (await response.json()) as SlashCommandDefinition[];
}

export async function executeSlashCommand(
  deps: ApiDeps,
  params: {
    workspaceSlug: string;
    channelId: string;
    command: string;
    args: string;
  },
): Promise<SlashCommandExecuteResponse> {
  const { api, auth } = deps;

  const response = await authorizedRequest(auth, (headers) =>
    api.api.workspaces[":slug"].commands.execute.$post(
      {
        param: { slug: params.workspaceSlug },
        json: {
          command: params.command,
          args: params.args,
          channelId: params.channelId,
        },
      },
      { headers },
    ),
  );
  return (await response.json()) as SlashCommandExecuteResponse;
}
