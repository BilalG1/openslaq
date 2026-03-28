import { useCallback } from "react";
import { asChannelId, asUserId } from "@openslaq/shared";
import { createDm as coreCreateDm, createGroupDm as coreCreateGroupDm } from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useChatStore, type DmConversation, type GroupDmConversation } from "../../state/chat-store";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";

interface AuthJsonUser {
  id: string;
  getAuthJson: () => Promise<{ accessToken?: string | null }>;
}

export function useDmActions(user: AuthJsonUser | null | undefined, workspaceSlug?: string) {
  const { state, dispatch } = useChatStore();
  const isGallery = useGalleryMode();
  const mockData = useGalleryMockData();
  const auth = useAuthProvider();

  const createDm = useCallback(
    async (targetUserId: string): Promise<DmConversation | null> => {
      if (!user || !workspaceSlug) return null;

      if (isGallery) {
        const existing = state.dms.find((dm) => dm.otherUser.id === targetUserId);
        if (existing) {
          dispatch({ type: "workspace/selectDm", channelId: existing.channel.id });
          return existing;
        }

        const targetMember = mockData?.members?.find((member) => member.id === targetUserId);
        if (!targetMember) {
          dispatch({ type: "mutations/error", error: "Could not create DM in demo mode" });
          return null;
        }

        const workspaceId = state.workspaces[0]?.id;
        if (!workspaceId) {
          dispatch({ type: "mutations/error", error: "No workspace available in demo mode" });
          return null;
        }

        const dm: DmConversation = {
          channel: {
            id: asChannelId(`demo-dm-${targetUserId}`),
            workspaceId,
            name: "dm",
            type: "dm",
            description: null,
            displayName: null,
            isArchived: false,
            createdBy: asUserId(user.id),
            createdAt: new Date().toISOString(),
          },
          otherUser: {
            id: asUserId(targetMember.id),
            displayName: targetMember.displayName,
            avatarUrl: targetMember.avatarUrl,
          },
          lastMessageContent: null,
          lastMessageAt: null,
        };

        dispatch({ type: "workspace/addDm", dm });
        dispatch({ type: "workspace/selectDm", channelId: dm.channel.id });
        dispatch({ type: "mutations/error", error: null });
        return dm;
      }

      const deps = { api, auth, dispatch, getState: () => state };
      return coreCreateDm(deps, { workspaceSlug, targetUserId });
    },
    [auth, dispatch, isGallery, mockData?.members, state, user, workspaceSlug],
  );

  const createGroupDm = useCallback(
    async (memberIds: string[]): Promise<GroupDmConversation | null> => {
      if (!user || !workspaceSlug) return null;

      if (isGallery) {
        dispatch({ type: "mutations/error", error: "Group DMs not supported in demo mode" });
        return null;
      }

      const deps = { api, auth, dispatch, getState: () => state };
      return coreCreateGroupDm(deps, { workspaceSlug, memberIds });
    },
    [auth, dispatch, isGallery, state, user, workspaceSlug],
  );

  return { createDm, createGroupDm };
}
