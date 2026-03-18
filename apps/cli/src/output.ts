import type { Channel, Message, SearchResultItem } from "@openslaq/shared";
import type { WorkspaceListItem } from "@openslaq/client-core";

export function printHelp(
  usage: string,
  description: string,
  flags?: { name: string; desc: string }[],
): void {
  console.log(`\n${description}\n`);
  console.log(`Usage: ${usage}\n`);
  if (flags && flags.length > 0) {
    console.log("Flags:");
    const maxLen = Math.max(...flags.map((f) => f.name.length));
    for (const flag of flags) {
      console.log(`  ${flag.name.padEnd(maxLen + 2)}${flag.desc}`);
    }
    console.log();
  }
}

export function formatChannelTable(
  channels: Channel[],
): string {
  if (channels.length === 0) return "No channels found.";
  const header = "NAME                TYPE        MEMBERS";
  const rows = channels.map(
    (ch) =>
      `${ch.name.padEnd(20)}${ch.type.padEnd(12)}${ch.memberCount ?? "-"}`,
  );
  return [header, ...rows].join("\n");
}

export function formatWorkspaceTable(
  workspaces: WorkspaceListItem[],
): string {
  if (workspaces.length === 0) return "No workspaces found.";
  const header = "NAME                SLUG                ROLE        MEMBERS";
  const rows = workspaces.map(
    (ws) =>
      `${ws.name.padEnd(20)}${ws.slug.padEnd(20)}${ws.role.padEnd(12)}${ws.memberCount ?? "-"}`,
  );
  return [header, ...rows].join("\n");
}

export function formatSearchResults(
  results: SearchResultItem[],
): string {
  if (results.length === 0) return "No results found.";
  return results
    .map((r) => {
      const time = new Date(r.createdAt).toLocaleString();
      // Strip <mark> tags from headline for terminal display
      const headline = r.headline.replace(/<\/?mark>/g, "");
      return `#${r.channelName}  @${r.userDisplayName}  ${headline}  ${time}`;
    })
    .join("\n");
}

export function formatDmTable(
  dms: { channel: { id: string }; otherUser: { id: string; displayName: string } }[],
): string {
  if (dms.length === 0) return "No DM conversations.";
  const header = "USER                CHANNEL ID";
  const rows = dms.map(
    (dm) =>
      `${dm.otherUser.displayName.padEnd(20)}${dm.channel.id}`,
  );
  return [header, ...rows].join("\n");
}

export function formatMessages(
  messages: Message[],
): string {
  if (messages.length === 0) return "No messages.";
  return messages
    .map((m) => {
      const time = new Date(m.createdAt).toLocaleTimeString();
      const author = m.senderDisplayName ?? "unknown";
      return `[${time}] @${author}: ${m.content}`;
    })
    .join("\n");
}

export function formatScheduledMessages(
  messages: { channelName: string; scheduledFor: string; status: string; content: string }[],
): string {
  if (messages.length === 0) return "No scheduled messages.";
  const header = "CHANNEL             TIME                          STATUS    CONTENT";
  const rows = messages.map((m) => {
    const time = new Date(m.scheduledFor).toLocaleString();
    const preview = m.content.length > 40 ? m.content.slice(0, 37) + "..." : m.content;
    return `${(`#${m.channelName}`).padEnd(20)}${time.padEnd(30)}${m.status.padEnd(10)}${preview}`;
  });
  return [header, ...rows].join("\n");
}

export function formatUnreadCounts(
  counts: Record<string, number>,
  channelNames: Map<string, string>,
): string {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return "All caught up!";
  return entries
    .map(([id, count]) => {
      const name = channelNames.get(id) ?? id;
      return `#${name}  ${count} unread`;
    })
    .join("\n");
}

export function formatBrowseChannelTable(
  channels: { name: string; type: string; memberCount?: number | null; isMember: boolean }[],
): string {
  if (channels.length === 0) return "No channels found.";
  const header = "NAME                TYPE        MEMBERS  JOINED";
  const rows = channels.map(
    (ch) =>
      `${ch.name.padEnd(20)}${ch.type.padEnd(12)}${String(ch.memberCount ?? "-").padEnd(9)}${ch.isMember ? "yes" : "no"}`,
  );
  return [header, ...rows].join("\n");
}

export function formatMemberTable(
  members: { displayName: string; email: string; role: string }[],
): string {
  if (members.length === 0) return "No members found.";
  const header = "NAME                EMAIL                         ROLE";
  const rows = members.map(
    (m) =>
      `${m.displayName.padEnd(20)}${m.email.padEnd(30)}${m.role}`,
  );
  return [header, ...rows].join("\n");
}

export function formatInviteTable(
  invites: { code: string; maxUses: number | null; useCount: number; expiresAt: string | null; revokedAt: string | null }[],
): string {
  if (invites.length === 0) return "No invites found.";
  const header = "CODE                MAX USES  USED  EXPIRES                       STATUS";
  const rows = invites.map((inv) => {
    const status = inv.revokedAt ? "revoked" : "active";
    const expires = inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : "never";
    return `${inv.code.padEnd(20)}${String(inv.maxUses ?? "∞").padEnd(10)}${String(inv.useCount).padEnd(6)}${expires.padEnd(30)}${status}`;
  });
  return [header, ...rows].join("\n");
}

export function formatApiKeyTable(
  keys: { name: string; tokenPrefix: string; scopes: string[]; expiresAt: string | null; lastUsedAt: string | null }[],
): string {
  if (keys.length === 0) return "No API keys found.";
  const header = "NAME                PREFIX          SCOPES                          EXPIRES               LAST USED";
  const rows = keys.map(
    (k) => {
      const expires = k.expiresAt ? new Date(k.expiresAt).toLocaleString() : "never";
      const lastUsed = k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never";
      return `${k.name.padEnd(20)}${k.tokenPrefix.padEnd(16)}${k.scopes.join(", ").padEnd(32)}${expires.padEnd(22)}${lastUsed}`;
    },
  );
  return [header, ...rows].join("\n");
}

export function formatFileTable(
  files: { filename: string; size: number; category: string; channelName: string; uploaderName: string; createdAt: string }[],
): string {
  if (files.length === 0) return "No files found.";
  const header = "FILENAME              SIZE        CATEGORY    CHANNEL             UPLOADED BY         DATE";
  const rows = files.map((f) => {
    const name = f.filename.length > 20 ? f.filename.slice(0, 17) + "..." : f.filename;
    const size = formatBytes(f.size);
    const date = new Date(f.createdAt).toLocaleDateString();
    return `${name.padEnd(22)}${size.padEnd(12)}${f.category.padEnd(12)}${(`#${f.channelName}`).padEnd(20)}${f.uploaderName.padEnd(20)}${date}`;
  });
  return [header, ...rows].join("\n");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatChannelMemberTable(
  members: { displayName: string; email: string; joinedAt: string }[],
): string {
  if (members.length === 0) return "No members found.";
  const header = "NAME                EMAIL                         JOINED";
  const rows = members.map(
    (m) => {
      const joined = new Date(m.joinedAt).toLocaleDateString();
      return `${m.displayName.padEnd(20)}${m.email.padEnd(30)}${joined}`;
    },
  );
  return [header, ...rows].join("\n");
}

export function formatPresenceTable(
  entries: { userId: string; online: boolean; statusEmoji?: string | null; statusText?: string | null }[],
): string {
  if (entries.length === 0) return "No users online.";
  const online = entries.filter((e) => e.online);
  if (online.length === 0) return "No users online.";
  const header = "USER ID                           STATUS";
  const rows = online.map((e) => {
    const status = [e.statusEmoji, e.statusText].filter(Boolean).join(" ") || "online";
    return `${e.userId.padEnd(34)}${status}`;
  });
  return [header, ...rows].join("\n");
}

export function formatEmojiTable(
  emojis: { name: string; uploadedBy: string; createdAt: string }[],
): string {
  if (emojis.length === 0) return "No custom emoji found.";
  const header = "NAME                UPLOADED BY         CREATED";
  const rows = emojis.map(
    (e) => {
      const created = new Date(e.createdAt).toLocaleString();
      return `:${e.name}:`.padEnd(20) + e.uploadedBy.padEnd(20) + created;
    },
  );
  return [header, ...rows].join("\n");
}
