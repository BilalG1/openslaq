import type { HuddleState } from "@openslaq/shared";
import { useChatStore } from "@/contexts/ChatStoreProvider";

export function useHuddleForChannel(channelId: string | undefined) {
  const { state } = useChatStore();

  const activeHuddle: HuddleState | null =
    channelId ? state.activeHuddles[channelId] ?? null : null;

  const isUserInHuddle = state.currentHuddleChannelId === channelId;

  return { activeHuddle, isUserInHuddle };
}
