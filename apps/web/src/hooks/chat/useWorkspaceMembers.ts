import { useCallback, useRef, useState } from "react";
import { useWorkspaceMembersApi } from "../api/useWorkspaceMembersApi";
import { useAsyncEffect } from "../useAsyncEffect";

export function useWorkspaceMembers(workspaceSlug: string | undefined) {
  const { listMembers } = useWorkspaceMembersApi();
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; displayName: string }>>([]);
  const slugRef = useRef(workspaceSlug);
  slugRef.current = workspaceSlug;

  const fetchMembers = useCallback(
    async (slug: string) => {
      try {
        const members = await listMembers(slug);
        setWorkspaceMembers(members.map((member) => ({ id: member.id, displayName: member.displayName })));
      } catch {
        // ignore — keep existing list on refresh failure
      }
    },
    [listMembers],
  );

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

  const refresh = useCallback(() => {
    if (slugRef.current) {
      fetchMembers(slugRef.current);
    }
  }, [fetchMembers]);

  return { workspaceMembers, refresh };
}
