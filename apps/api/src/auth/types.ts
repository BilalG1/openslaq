import type { UserId, BotScope } from "@openslaq/shared";

export interface AuthUser {
  id: UserId;
  email: string;
  displayName: string;
}

export type AuthKind = "jwt" | "api_key" | "bot";

export interface TokenMeta {
  kind: AuthKind;
  /** null = full access (JWT sessions). Array = scoped (API keys & bot tokens). */
  scopes: BotScope[] | null;
  isBot: boolean;
  botAppId: string | null;
  botWorkspaceId: string | null;
}

export type AuthEnv = {
  Variables: {
    user: AuthUser;
    tokenMeta: TokenMeta;
  };
};
