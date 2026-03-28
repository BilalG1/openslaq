import type { ChannelId, HuddleState } from "@openslaq/shared";
import { useChatStore } from "@/contexts/ChatStoreProvider";

export function useHuddleForChannel(channelId: ChannelId | undefined) {
  const { state } = useChatStore();

  const activeHuddle: HuddleState | null =
    channelId ? state.activeHuddles[channelId] ?? null : null;

  const isUserInHuddle = channelId != null && state.currentHuddleChannelId === channelId;

  return { activeHuddle, isUserInHuddle };
}
