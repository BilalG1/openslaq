import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createApiClient } from "@openslaq/client-core";
import { env } from "../lib/env";
import {
  type ServerConfig,
  getActiveServer,
  setActiveServer as saveActiveServer,
  clearActiveServer,
  serverIdFromUrl,
} from "../lib/server-store";

/** Default cloud server config, built from env vars */
const CLOUD_SERVER: ServerConfig = {
  id: serverIdFromUrl(env.EXPO_PUBLIC_API_URL),
  url: env.EXPO_PUBLIC_API_URL,
  name: "OpenSlaq Cloud",
  authType: "stack-auth",
  stackProjectId: env.EXPO_PUBLIC_STACK_PROJECT_ID,
  stackPublishableKey: env.EXPO_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
};

export type ApiClient = ReturnType<typeof createApiClient>;

interface ServerContextValue {
  activeServer: ServerConfig;
  apiClient: ApiClient;
  apiUrl: string;
  isLoading: boolean;
  isCloudServer: boolean;
  addServer: (url: string) => Promise<ServerConfig>;
  resetToCloud: () => Promise<void>;
}

const ServerContext = createContext<ServerContextValue | null>(null);

interface ServerInfoResponse {
  name: string;
  version: string;
  auth:
    | { type: "stack-auth"; stackProjectId: string; stackPublishableKey: string }
    | { type: "builtin"; methods: string[] };
}

export function ServerProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeServer, setActiveServer] = useState<ServerConfig>(CLOUD_SERVER);

  // Load saved active server on mount
  useEffect(() => {
    void (async () => {
      const saved = await getActiveServer();
      if (saved) {
        setActiveServer(saved);
      }
      setIsLoading(false);
    })();
  }, []);

  const apiClient = useMemo(
    () => createApiClient(activeServer.url),
    [activeServer.url],
  );

  const isCloudServer = activeServer.id === CLOUD_SERVER.id;

  const addServerFn = useCallback(async (url: string): Promise<ServerConfig> => {
    // Normalize URL
    const normalizedUrl = url.replace(/\/+$/, "");

    // Discover server capabilities
    const res = await fetch(`${normalizedUrl}/api/server-info`);
    if (!res.ok) {
      throw new Error(`Could not connect to server (${res.status})`);
    }
    const info = (await res.json()) as ServerInfoResponse;

    const config: ServerConfig = {
      id: serverIdFromUrl(normalizedUrl),
      url: normalizedUrl,
      name: info.name,
      authType: info.auth.type,
      stackProjectId: info.auth.type === "stack-auth" ? info.auth.stackProjectId : undefined,
      stackPublishableKey: info.auth.type === "stack-auth" ? info.auth.stackPublishableKey : undefined,
    };

    await saveActiveServer(config);
    setActiveServer(config);

    return config;
  }, []);

  const resetToCloudFn = useCallback(async () => {
    await clearActiveServer();
    setActiveServer(CLOUD_SERVER);
  }, []);

  const value = useMemo(
    () => ({
      activeServer,
      apiClient,
      apiUrl: activeServer.url,
      isLoading,
      isCloudServer,
      addServer: addServerFn,
      resetToCloud: resetToCloudFn,
    }),
    [activeServer, apiClient, isLoading, isCloudServer, addServerFn, resetToCloudFn],
  );

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer(): ServerContextValue {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error("useServer must be used inside ServerProvider");
  return ctx;
}

export { CLOUD_SERVER };
