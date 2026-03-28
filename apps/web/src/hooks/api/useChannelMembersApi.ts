import { useCallback } from "react";
import {
  listChannelMembers as coreListChannelMembers,
  addChannelMember,
  addChannelMembersBulk,
  removeChannelMember,
  type ChannelMember,
} from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";

export type { ChannelMember };

export function useChannelMembersApi() {
  const isGallery = useGalleryMode();
  const mockData = useGalleryMockData();
  const auth = useAuthProvider();

  const listChannelMembers = useCallback(
    async (workspaceSlug: string, channelId: string): Promise<ChannelMember[]> => {
      if (isGallery) {
        return (mockData?.members ?? []).map((member) => ({
          id: member.id,
          displayName: member.displayName,
          email: member.email,
          avatarUrl: member.avatarUrl,
          joinedAt: member.joinedAt,
        }));
      }
      return coreListChannelMembers({ api, auth }, workspaceSlug, channelId);
    },
    [auth, isGallery, mockData?.members],
  );

  const addMember = useCallback(
    (workspaceSlug: string, channelId: string, userId: string) =>
      addChannelMember({ api, auth }, workspaceSlug, channelId, userId),
    [auth],
  );

  const addMembersBulk = useCallback(
    (workspaceSlug: string, channelId: string, userIds: string[]) =>
      addChannelMembersBulk({ api, auth }, workspaceSlug, channelId, userIds),
    [auth],
  );

  const removeMember = useCallback(
    (workspaceSlug: string, channelId: string, userId: string) =>
      removeChannelMember({ api, auth }, workspaceSlug, channelId, userId),
    [auth],
  );

  return { listChannelMembers, addMember, addMembersBulk, removeMember };
}
