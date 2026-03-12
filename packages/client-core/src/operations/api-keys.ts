import { AuthError } from "../api/errors";
import { authorizedRequest } from "../api/api-client";
import type { ApiDeps } from "./types";
import type { ApiKey } from "@openslaq/shared";

export async function listApiKeys(deps: ApiDeps): Promise<ApiKey[]> {
  const { api, auth } = deps;
  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api["api-keys"].$get({}, { headers }),
    );
    const data = (await response.json()) as { keys: ApiKey[] };
    return data.keys;
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}

export async function createApiKey(
  deps: ApiDeps,
  data: { name: string; scopes: string[]; expiresAt?: string },
): Promise<ApiKey & { token: string }> {
  const { api, auth } = deps;
  try {
    const response = await authorizedRequest(auth, (headers) =>
      api.api["api-keys"].$post(
        { json: data as any },
        { headers },
      ),
    );
    return (await response.json()) as ApiKey & { token: string };
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}

export async function deleteApiKey(deps: ApiDeps, id: string): Promise<void> {
  const { api, auth } = deps;
  try {
    await authorizedRequest(auth, (headers) =>
      api.api["api-keys"][":id"].$delete(
        { param: { id } },
        { headers },
      ),
    );
  } catch (err) {
    if (err instanceof AuthError) auth.onAuthRequired();
    throw err;
  }
}
