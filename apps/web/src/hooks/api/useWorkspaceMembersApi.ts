import { useCallback } from "react";
import {
  listWorkspaceMembers,
  updateMemberRole,
  removeMember as coreRemoveMember,
  leaveWorkspace as coreLeaveWorkspace,
  deleteWorkspace as coreDeleteWorkspace,
} from "@openslaq/client-core";
import { api } from "../../api";
import { useAuthProvider } from "../../lib/api-client";
import { useGalleryMode, useGalleryMockData } from "../../gallery/gallery-context";

interface Member {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export function useWorkspaceMembersApi() {
  const isGallery = useGalleryMode();
  const galleryMockData = useGalleryMockData();
  const auth = useAuthProvider();

  const listMembers = useCallback(
    async (workspaceSlug: string): Promise<Member[]> => {
      if (isGallery) {
        return (galleryMockData?.members ?? []) as Member[];
      }
      return listWorkspaceMembers({ api, auth }, workspaceSlug);
    },
    [auth, galleryMockData?.members, isGallery],
  );

  const updateRole = useCallback(
    (workspaceSlug: string, userId: string, role: string) =>
      updateMemberRole({ api, auth }, workspaceSlug, userId, role),
    [auth],
  );

  const removeMember = useCallback(
    (workspaceSlug: string, userId: string) =>
      coreRemoveMember({ api, auth }, workspaceSlug, userId),
    [auth],
  );

  const leaveWorkspace = useCallback(
    (workspaceSlug: string) =>
      coreLeaveWorkspace({ api, auth }, workspaceSlug),
    [auth],
  );

  const deleteWorkspace = useCallback(
    (workspaceSlug: string) =>
      coreDeleteWorkspace({ api, auth }, workspaceSlug),
    [auth],
  );

  return { listMembers, updateRole, removeMember, leaveWorkspace, deleteWorkspace };
}
