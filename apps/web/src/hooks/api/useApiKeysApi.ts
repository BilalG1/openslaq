import { useCallback } from "react";
import {
  listApiKeys as coreListApiKeys,
  createApiKey as coreCreateApiKey,
  deleteApiKey as coreDeleteApiKey,
} from "@openslaq/client-core";
import type { ApiKey } from "@openslaq/shared";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";

export function useApiKeysApi() {
  const auth = useAuthProvider();

  const listApiKeys = useCallback(async (): Promise<ApiKey[]> => {
    return coreListApiKeys({ api, auth });
  }, [auth]);

  const createApiKey = useCallback(
    async (data: { name: string; scopes: string[]; expiresAt?: string }) => {
      return coreCreateApiKey({ api, auth }, data);
    },
    [auth],
  );

  const deleteApiKey = useCallback(
    async (id: string) => {
      return coreDeleteApiKey({ api, auth }, id);
    },
    [auth],
  );

  return { listApiKeys, createApiKey, deleteApiKey };
}
