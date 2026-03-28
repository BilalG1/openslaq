import type { Channel, ChannelId } from "@openslaq/shared";
import type { DmConversation, GroupDmConversation } from "@openslaq/client-core";

export interface DestinationItem {
  id: ChannelId;
  name: string;
  type: "public" | "private" | "dm";
}

export function buildDestinationItems(
  channels: Channel[],
  dms: DmConversation[],
  groupDms?: GroupDmConversation[],
): DestinationItem[] {
  return [
    ...channels.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as "public" | "private",
    })),
    ...dms.map((dm) => ({
      id: dm.channel.id,
      name: dm.otherUser.displayName,
      type: "dm" as const,
    })),
    ...(groupDms ?? []).map((g) => ({
      id: g.channel.id,
      name:
        g.channel.displayName ??
        g.members.map((m) => m.displayName).join(", "),
      type: "dm" as const,
    })),
  ];
}
