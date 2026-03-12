import { useState } from "react";
import { useWorkspaceMembersApi } from "../api/useWorkspaceMembersApi";
import { useAsyncEffect } from "../useAsyncEffect";

export function useWorkspaceMembers(workspaceSlug: string | undefined) {
  const { listMembers } = useWorkspaceMembersApi();
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; displayName: string }>>([]);

  useAsyncEffect(
    async (signal) => {
      if (!workspaceSlug) {
        setWorkspaceMembers([]);
        return;
      }
      try {
        const members = await listMembers(workspaceSlug);
        if (signal.cancelled) return;
        setWorkspaceMembers(members.map((member) => ({ id: member.id, displayName: member.displayName })));
      } catch {
        if (signal.cancelled) return;
        setWorkspaceMembers([]);
      }
    },
    [workspaceSlug, listMembers],
  );

  return { workspaceMembers };
}
