import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export interface ServerConfig {
  id: string;
  url: string;
  name: string;
  authType: "stack-auth" | "builtin";
  stackProjectId?: string;
  stackPublishableKey?: string;
}

export interface ServerSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

const ACTIVE_SERVER_KEY = "openslaq_active_server";

function sessionKey(serverId: string) {
  return `openslaq_session_${serverId}`;
}

/** Generate a deterministic server ID from a URL */
export function serverIdFromUrl(url: string): string {
  // Normalize: lowercase, strip trailing slash
  const normalized = url.toLowerCase().replace(/\/+$/, "");
  // Simple hash — use the URL itself as a stable ID (safe for storage keys)
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return `srv_${Math.abs(hash).toString(36)}`;
}

// --- Active server (single server at a time) ---

export async function getActiveServer(): Promise<ServerConfig | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_SERVER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServerConfig;
  } catch {
    return null;
  }
}

export async function setActiveServer(config: ServerConfig): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SERVER_KEY, JSON.stringify(config));
}

export async function clearActiveServer(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_SERVER_KEY);
}

// --- Per-server sessions (stored securely) ---

export async function getServerSession(serverId: string): Promise<ServerSession | null> {
  const raw = await SecureStore.getItemAsync(sessionKey(serverId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServerSession;
  } catch {
    return null;
  }
}

export async function setServerSession(serverId: string, session: ServerSession): Promise<void> {
  await SecureStore.setItemAsync(sessionKey(serverId), JSON.stringify(session));
}

export async function clearServerSession(serverId: string): Promise<void> {
  await SecureStore.deleteItemAsync(sessionKey(serverId));
}
