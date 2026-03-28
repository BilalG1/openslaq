export interface ChannelConfig {
  botToken: string;
  apiUrl: string;
  workspaceSlug: string;
  allowedUserIds: Set<string>;
}

export function loadConfig(): ChannelConfig {
  const botToken = process.env.OPENSLAQ_BOT_TOKEN;
  if (!botToken) {
    throw new Error("OPENSLAQ_BOT_TOKEN is required");
  }
  if (!botToken.startsWith("osb_")) {
    throw new Error("OPENSLAQ_BOT_TOKEN must start with osb_");
  }

  const workspaceSlug = process.env.OPENSLAQ_WORKSPACE_SLUG || "default";
  const apiUrl = process.env.OPENSLAQ_URL || "http://localhost:3001";
  const allowedRaw = process.env.OPENSLAQ_ALLOWED_USERS || "";
  const allowedUserIds = new Set(
    allowedRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  return { botToken, apiUrl, workspaceSlug, allowedUserIds };
}

export interface BotChannel {
  id: string;
  name: string;
  type: string;
}

export interface BotMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  isBot?: boolean;
  createdAt: string;
}

export interface BotUser {
  id: string;
  displayName: string;
}
