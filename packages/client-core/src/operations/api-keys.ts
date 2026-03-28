import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";
import type { ApiKey, BotScope } from "@openslaq/shared";

export async function listApiKeys(deps: ApiDeps): Promise<ApiKey[]> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api["api-keys"].$get({}, { headers }),
  );
  const data = (await response.json()) as { keys: ApiKey[] };
  return data.keys;
}

export async function createApiKey(
  deps: ApiDeps,
  data: { name: string; scopes: BotScope[]; expiresAt?: string },
): Promise<ApiKey & { token: string }> {
  const { api, auth } = deps;
  const response = await authorizedRequest(auth, (headers) =>
    api.api["api-keys"].$post(
      { json: data },
      { headers },
    ),
  );
  return (await response.json()) as ApiKey & { token: string };
}

export async function deleteApiKey(deps: ApiDeps, id: string): Promise<void> {
  const { api, auth } = deps;
  await authorizedRequest(auth, (headers) =>
    api.api["api-keys"][":id"].$delete(
      { param: { id } },
      { headers },
    ),
  );
}
