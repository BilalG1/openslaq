import { useLocalSearchParams } from "expo-router";
import { asChannelId, asMessageId, asUserId, type ChannelId, type MessageId, type UserId } from "@openslaq/shared";

/**
 * Typed route param hooks that cast string params to branded ID types.
 * Each hook validates that required params are present and returns them
 * with the correct branded type (or undefined if missing).
 */

export function useWorkspaceParams() {
  const { workspaceSlug } = useLocalSearchParams<{ workspaceSlug: string }>();
  return { workspaceSlug: workspaceSlug || undefined };
}

export function useChannelParams() {
  const { workspaceSlug, channelId, showInfo } = useLocalSearchParams<{
    workspaceSlug: string;
    channelId: string;
    showInfo?: string;
  }>();
  return {
    workspaceSlug: workspaceSlug || undefined,
    channelId: channelId ? asChannelId(channelId) : undefined,
    showInfo: showInfo === "true",
  };
}

export function useThreadParams() {
  const { workspaceSlug, parentMessageId } = useLocalSearchParams<{
    workspaceSlug: string;
    parentMessageId: string;
  }>();
  return {
    workspaceSlug: workspaceSlug || undefined,
    parentMessageId: parentMessageId ? asMessageId(parentMessageId) : undefined,
  };
}

export function useProfileParams() {
  const { workspaceSlug, userId } = useLocalSearchParams<{
    workspaceSlug: string;
    userId: string;
  }>();
  return {
    workspaceSlug: workspaceSlug || undefined,
    userId: userId ? asUserId(userId) : undefined,
  };
}

export function useChannelMembersParams() {
  const { workspaceSlug, channelId } = useLocalSearchParams<{
    workspaceSlug: string;
    channelId: string;
  }>();
  return {
    workspaceSlug: workspaceSlug || undefined,
    channelId: channelId ? asChannelId(channelId) : undefined,
  };
}

export function useInviteParams() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return { code: code || undefined };
}
