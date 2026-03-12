import type { ApiKeyId } from "./ids";
import type { BotScope } from "./bot";

export interface ApiKey {
  id: ApiKeyId;
  name: string;
  tokenPrefix: string; // "osk_XXXXXXXX" for display
  scopes: BotScope[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}
